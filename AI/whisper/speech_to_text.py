from fastapi import FastAPI, UploadFile, File
from faster_whisper import WhisperModel
from confidence import analyze_audio_confidence
import shutil
import tempfile
import os

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

        # Build word timestamps for speech-rate calculation
        word_timestamps = []
        for seg in segments:
            if seg.words:
                for w in seg.words:
                    word_timestamps.append({"start": w.start, "end": w.end})

        # Run audio confidence analysis (signal processing)
        audio_result = analyze_audio_confidence(
            tmp_path, word_timestamps=word_timestamps, text=text
        )

    finally:
        os.remove(tmp_path)

    return {
        "transcript_text": text,
        "confidence_score": audio_result["confidence_score"],
        "acoustic_confidence": audio_result["acoustic_confidence"],
        "communication_confidence": audio_result["communication_confidence"],
        "modifier_delta": audio_result["modifier_delta"],
        "acoustic_breakdown": audio_result["acoustic_breakdown"],
        "communication_breakdown": audio_result["communication_breakdown"],
        "raw_features": audio_result["raw_features"],
    }