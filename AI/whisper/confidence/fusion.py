import logging
import os
import shutil
import tempfile

from fastapi import FastAPI, HTTPException, UploadFile, File
from faster_whisper import WhisperModel

from audio_confidence import analyze_audio_confidence

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Load model once at startup (not per-request — loading is slow, inference is fast)
# device="cpu" is fine for a laptop. Use device="cuda" if you have an NVIDIA GPU.
model = WhisperModel("small", device="cpu", compute_type="int8")

MAX_UPLOAD_BYTES = 25 * 1024 * 1024  # 25 MB — adjust as needed


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
            segments, info = model.transcribe(
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