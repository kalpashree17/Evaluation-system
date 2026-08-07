import logging
import os
import shutil
import tempfile

import numpy as np

from fastapi import FastAPI, HTTPException, UploadFile, File
from faster_whisper import WhisperModel

from .preprocessing import load_audio, frame_signal
from .features import extract_pitch_contour, extract_energy, detect_pauses
from .acoustic import (
    speech_rate_score,
    pause_score,
    pitch_variation_score,
    energy_consistency_score,
    silence_ratio_score,
    compute_acoustic_confidence,
)
from .communication import (
    filler_behaviour_score,
    lexical_certainty_score,
    fluency_score,
    response_organization_score,
    compute_communication_confidence,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# The Whisper model is loaded lazily on first transcription, not at import
# time. Loading takes seconds and a lot of memory, so doing it on import would
# make unit tests of the pure scoring functions slow (and often OOM).
# device="cpu" is fine for a laptop. Use device="cuda" if you have an NVIDIA GPU.
_model = None


def get_model() -> WhisperModel:
    """Return the shared WhisperModel, loading it on first use."""
    global _model
    if _model is None:
        _model = WhisperModel("small", device="cpu", compute_type="int8")
    return _model

MAX_UPLOAD_BYTES = 25 * 1024 * 1024  # 25 MB — adjust as needed

# Tier weights for the final 65/35 acoustic/communication fusion.
ACOUSTIC_WEIGHT = 0.65
COMMUNICATION_WEIGHT = 0.35


def analyze_audio_confidence(
    audio_path: str,
    word_timestamps: list[dict] | None = None,
    text: str | None = None,
) -> dict:
    """
    Full two-tier confidence pipeline:

      1. Preprocessing: load → mono → resample → normalise → frame → window
         (all from .preprocessing)
      2. Feature extraction: pitch contour, energy, pauses (.features)
      3. Acoustic tier (65%): speech rate, pause, pitch variation, energy
         stability, silence ratio (.acoustic)
      4. Communication tier (35%): filler behaviour, lexical certainty,
         fluency, response organization (.communication)

    Returns the fused confidence score plus both breakdowns.
    """
    samples, sr = load_audio(audio_path)
    frames, sr = frame_signal(samples, sr)

    f0 = extract_pitch_contour(frames, sr)
    energy = extract_energy(frames)
    pauses = detect_pauses(energy, sr)

    audio_duration_ms = len(samples) / sr * 1000

    # ── Acoustic tier (65%) ────────────────────────────────────────────────
    rate = (
        speech_rate_score(word_timestamps, audio_duration_ms)
        if word_timestamps else 0.5
    )
    pa = pause_score(pauses, audio_duration_ms)
    pv = pitch_variation_score(f0)
    es = energy_consistency_score(energy)
    sil = silence_ratio_score(pauses)
    acoustic = compute_acoustic_confidence(rate, pa, pv, es, sil)

    # ── Communication tier (35%) ───────────────────────────────────────────
    fw = filler_behaviour_score(text) if text else 0.5
    lx = lexical_certainty_score(text) if text else 0.5
    fl = fluency_score(text) if text else 0.5
    org = response_organization_score(text) if text else 0.5
    comm = compute_communication_confidence(fw, lx, fl, org)

    acoustic_score = acoustic["acoustic_confidence"]
    communication_score = comm["communication_confidence"]
    final = (
        ACOUSTIC_WEIGHT * acoustic_score
        + COMMUNICATION_WEIGHT * communication_score
    )

    # raw acoustic features for debugging / future use
    voiced = f0[f0 > 0]
    raw_features = {
        "pitch_mean_hz": round(float(np.mean(voiced)) if len(voiced) > 0 else 0, 2),
        "pitch_std_hz": round(float(np.std(voiced)) if len(voiced) > 0 else 0, 2),
        "pitch_range_hz": round(
            float(np.max(voiced) - np.min(voiced)) if len(voiced) > 0 else 0, 2
        ),
        "energy_mean": round(float(np.mean(energy)), 6),
        "energy_std": round(float(np.std(energy)), 6),
        "silence_ratio": round(pauses["total_pause_ratio"], 4),
        "pause_count": pauses["pause_count"],
        "longest_pause_ms": round(pauses["longest_pause_ms"], 1),
        "num_voiced_frames": int(np.sum(f0 > 0)),
        "total_frames": len(f0),
    }

    return {
        "confidence_score": round(float(np.clip(final, 0, 1)), 4),
        "acoustic_confidence": round(float(acoustic_score), 4),
        "communication_confidence": round(float(communication_score), 4),
        "modifier_delta": round(float(communication_score - acoustic_score), 4),
        "acoustic_breakdown": acoustic["acoustic_breakdown"],
        "communication_breakdown": comm["communication_breakdown"],
        "raw_features": raw_features,
    }


@app.get("/")
def health_check():
    return {"status": "ai service running"}


# NOTE: this is a plain `def`, not `async def`.
# model.transcribe() is a synchronous, CPU-bound call. If this route were
# `async def`, that call would run directly on FastAPI's single event loop
# and block ALL other requests (including this health check) for the
# entire duration of transcription. Declaring it as a regular `def` lets
# FastAPI automatically dispatch it to a worker thread, keeping the event
# loop free to handle other requests concurrently.
@app.post("/transcribe")
def transcribe(audio: UploadFile = File(...)):
    logger.info("Received file: %s", audio.filename)

    suffix = os.path.splitext(audio.filename or "")[1] or ".webm"
    tmp_path = None

    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            shutil.copyfileobj(audio.file, tmp)
            tmp_path = tmp.name

        file_size = os.path.getsize(tmp_path)
        logger.info("Saved temp file: %s (%d bytes)", tmp_path, file_size)

        if file_size == 0:
            raise HTTPException(status_code=422, detail="Uploaded file is empty")
        if file_size > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"File too large ({file_size} bytes). Max is {MAX_UPLOAD_BYTES} bytes.",
            )

        try:
            segments, info = get_model().transcribe(
                tmp_path,
                language="en",
                beam_size=5,
                word_timestamps=True,
            )
            segments = list(segments)
        except Exception as e:
            logger.exception("Whisper transcription failed")
            raise HTTPException(status_code=500, detail=f"Transcription failed: {e}")

        logger.info("Detected language: %s", info.language)
        logger.info("Number of segments: %d", len(segments))
        for s in segments:
            logger.info("SEGMENT: %s", s.text)

        text = " ".join(segment.text for segment in segments).strip()

        if not text:
            raise HTTPException(status_code=422, detail="No speech detected in audio")

        # Build word timestamps for speech-rate calculation
        word_timestamps = [
            {"start": w.start, "end": w.end}
            for seg in segments if seg.words
            for w in seg.words
        ]

        try:
            audio_result = analyze_audio_confidence(
                tmp_path, word_timestamps=word_timestamps, text=text
            )
        except Exception as e:
            logger.exception("Confidence analysis failed")
            raise HTTPException(status_code=500, detail=f"Confidence analysis failed: {e}")

        # Use the shared 65/35 acoustic/communication fusion from the
        # confidence pipeline; do not apply a second, conflicting fusion here.
        return {
            "transcript_text": text,
            "confidence_score": audio_result["confidence_score"],
            # "acoustic_breakdown": audio_result["acoustic_breakdown"],
            # "communication_breakdown": audio_result["communication_breakdown"],
        }

    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)