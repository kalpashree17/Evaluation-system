

from app.questions import questions
from app.evaluator import evaluate_answer
from app.session import sessions


def get_question(session_id):

    session = sessions[session_id]
    role = session["role"]
    index = session["current_question"]

    qs = questions[role]

    if index >= len(qs):
        return None

    return qs[index]["question"]


def submit_answer(session_id, student_answer):

    session = sessions[session_id]
    role = session["role"]
    index = session["current_question"]

    q = questions[role][index]

    score = evaluate_answer(student_answer, q["answers"])

    session["scores"].append(score)
    session["answers"].append(student_answer)

    session["current_question"] += 1

    next_q = get_question(session_id)

    return score, next_q


def get_result(session_id):

    session = sessions[session_id]

    scores = session["scores"]

    # Before returning score
    # scores = [float(score) for score in scores]  # convert numpy floats to Python floats

    total = sum(scores)

    average = total / len(scores) if scores else 0

    return {
        "scores": scores,
        "total_score": round(total,2),
        "average_score": round(average,2)
    }