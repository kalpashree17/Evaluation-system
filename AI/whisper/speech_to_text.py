from fastapi import FastAPI, UploadFile, File
from faster_whisper import WhisperModel
import shutil
import tempfile
import os
import math

app = FastAPI()

# Load model once at startup (not per-request — loading is slow, inference is fast)
# device="cpu" is fine for a laptop. Use device="cuda" if you have an NVIDIA GPU.
model = WhisperModel("small", device="cpu", compute_type="int8")


@app.get("/")
def health_check():
    return {"status": "ai service running"}


@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    # Save incoming audio bytes to a temp file (Whisper needs a file path).
    # Keep the original extension (.webm, .wav, etc.) — faster-whisper uses
    # ffmpeg under the hood, which can decode webm/opus fine.
    suffix = os.path.splitext(audio.filename or "")[1] or ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        shutil.copyfileobj(audio.file, tmp)
        tmp_path = tmp.name

    try:
        segments, info = model.transcribe(tmp_path)
        segments = list(segments)  # segments is a generator; consume it once

        text = " ".join(segment.text for segment in segments).strip()

        # faster-whisper doesn't give one overall confidence score.
        # Each segment has avg_logprob (a log-probability, usually a small
        # negative number like -0.3). We convert that into a 0-1-ish score
        # by exponentiating, then average across segments.
        if segments:
            avg_logprob = sum(s.avg_logprob for s in segments) / len(segments)
            confidence_score = round(math.exp(avg_logprob), 4)  # e.g. -0.2 -> 0.82
            confidence_score = max(0.0, min(1.0, confidence_score))  # clamp to 0-1
        else:
            confidence_score = None

    finally:
        os.remove(tmp_path)

    return {
        "transcript_text": text,
        "confidence_score": confidence_score
    }