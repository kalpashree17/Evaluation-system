from fastapi import FastAPI, UploadFile, File
from faster_whisper import WhisperModel
from confidence import analyze_audio_confidence
import shutil
import tempfile
import os
import time

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

    # ── TEMP DIAGNOSTIC: keep a copy of every upload for offline inspection ──
    try:
        capture_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "captured")
        os.makedirs(capture_dir, exist_ok=True)
        captured_name = os.path.join(
            capture_dir, f"{int(time.time())}_{os.path.basename(tmp_path)}"
        )
        shutil.copy(tmp_path, captured_name)
        print("Captured upload:", captured_name)
    except Exception as e:
        print("Capture failed:", e)
    # ── END TEMP DIAGNOSTIC ──

    try:
        # segments, info = model.transcribe(tmp_path)
        segments, info = model.transcribe(
            tmp_path,
            language="en",
            beam_size=5,
            word_timestamps=True,
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

        # Use the shared 65/35 acoustic/communication fusion from the
        # confidence pipeline; do not apply a second, conflicting fusion here.
        confidence_score = audio_result["confidence_score"]

    finally:
        os.remove(tmp_path)

    return {
        "transcript_text": text,
        "confidence_score": confidence_score,
    }
