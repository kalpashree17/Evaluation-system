

from fastapi import FastAPI
from pydantic import BaseModel
from app.session import create_session
from app.interview import get_question, submit_answer, get_result

app = FastAPI()


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