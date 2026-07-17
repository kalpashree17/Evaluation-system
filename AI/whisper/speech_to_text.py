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

    print("Received file:", audio.filename)

    suffix = os.path.splitext(audio.filename or "")[1] or ".webm"

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        shutil.copyfileobj(audio.file, tmp)
        tmp_path = tmp.name

    print("Saved temp file:", tmp_path)
    print("File size:", os.path.getsize(tmp_path), "bytes")

    try:
        # segments, info = model.transcribe(tmp_path)
        segments, info = model.transcribe(
    tmp_path,
    language="en",
    beam_size=5
)

        segments = list(segments)

        print("Detected language:", info.language)
        print("Number of segments:", len(segments))

        for s in segments:
            print("SEGMENT:", s.text)

        text = " ".join(segment.text for segment in segments).strip()

        if segments:
            avg_logprob = sum(s.avg_logprob for s in segments) / len(segments)
            confidence_score = round(math.exp(avg_logprob), 4)
            confidence_score = max(0.0, min(1.0, confidence_score))
        else:
            confidence_score = 0

    finally:
        os.remove(tmp_path)

    return {
        "transcript_text": text,
        "confidence_score": confidence_score
    }