"""
Pydantic models = the JSON contracts.
These mirror "Contract B" from backend_architecture.md (Express -> Python
NLP scoring service), extended with interview_id/question_id so we can
group individual answer scores into one interview session.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class KeywordItem(BaseModel):
    """One entry from the question's structured `keywords` JSON column."""
    term: str
    tier: str  # "critical" or "supporting"
    aliases: List[str] = Field(default_factory=list)


class AnswerScoreRequest(BaseModel):
    """
    What Express sends per answer.

    reference_answer / keywords are optional: if the caller only has
    question_id (e.g. quick testing from FastAPI's /docs page without
    wiring up the whole Node backend), we fall back to looking them up
    from the local question bank CSV.
    """
    # interview_id: str
    question_id: str
    transcript_text: str
    # reference_answer: Optional[str] = None
    # keywords: Optional[List[KeywordItem]] = None
    # confidence_score: Optional[float] = None  # placeholder until audio service exists


class AnswerScoreResponse(BaseModel):
    """What we send back per answer — matches Contract B's response shape,
    plus keyword-match details for transparent feedback."""
    question_id: str
    # confidence_score: float
    keyword_score: float
    tfidf_score: float
    semantic_score: float
    final_score: float
    matched_keywords: List[str]
    missing_keywords: List[str]
    negated_keywords: List[str]
    strengths: List[str]
    weaknesses: List[str]
    areas_for_improvement: List[str]


class InterviewSummaryResponse(BaseModel):
    """Returned when an interview session ends: every individual answer
    score plus the averaged score across the whole session."""
    interview_id: str
    total_questions_answered: int
    # average_confidence_score: float
    average_keyword_score: float
    average_tfidf_score: float
    average_semantic_score: float
    average_final_score: float
    per_question_scores: List[AnswerScoreResponse]
