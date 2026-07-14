

import os
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.session import create_session
from app.interview import get_question, submit_answer, get_result

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


class StartInterview(BaseModel):
    role: str


class AnswerRequest(BaseModel):
    session_id: str
    answer: str


@app.get("/")
def home():
    return {"message": "Interview Bot API Running"}


@app.post("/start-interview")
def start_interview(request: StartInterview):

    session_id = create_session(request.role)

    question = get_question(session_id)

    return {
        "session_id": session_id,
        "question": question
    }


@app.post("/answer")
def answer_question(request: AnswerRequest):

    score, next_question = submit_answer(
        request.session_id,
        request.answer
    )

    return {
        "score": float(score),
        "next_question": next_question
    }


@app.get("/result/{session_id}")
def result(session_id: str):

    return get_result(session_id)


@app.post("/upload-audio")
async def upload_audio(
    audio: UploadFile = File(...),
    question_id: str = Form(...),
    session_id: str = Form("unknown"),
):
    if not audio.filename or not audio.filename.endswith(".wav"):
        raise HTTPException(status_code=400, detail="Only .wav files are accepted")

    filename = f"{session_id}_{question_id}_{os.urandom(4).hex()}.wav"
    filepath = os.path.join(UPLOAD_DIR, filename)

    content = await audio.read()
    with open(filepath, "wb") as f:
        f.write(content)

    return {
        "status": "success",
        "filename": filename,
        "size_bytes": len(content),
    }