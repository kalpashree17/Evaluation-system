"""
Holds each interview's per-question scores in memory so we can average
them when the session ends.

This is a placeholder for the real `scores` table in schema.sql. Once
Express + Postgres are wired in, Express is the source of truth for
persistence — this in-memory store just lets you develop/demo the Python
scoring service on its own before that integration exists.

NOTE: this resets whenever the FastAPI process restarts, and is not
safe for multiple server workers/processes. Fine for local dev only.
"""

from collections import defaultdict
from app.models.schemas import AnswerScoreResponse

_SESSION_SCORES: dict[str, list[AnswerScoreResponse]] = defaultdict(list)


def add_score(interview_id: str, score: AnswerScoreResponse) -> None:
    _SESSION_SCORES[interview_id].append(score)


def get_scores(interview_id: str) -> list[AnswerScoreResponse]:
    return _SESSION_SCORES.get(interview_id, [])


def clear_session(interview_id: str) -> None:
    _SESSION_SCORES.pop(interview_id, None)
