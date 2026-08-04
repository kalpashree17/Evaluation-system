"""
Two endpoints:

  POST /score/answer            -> score ONE question's answer
                                    (Contract B from backend_architecture.md)
  POST /interview/{id}/end      -> average all scores collected for that
                                    interview_id and close the session

Individual answer scores are stored in-memory as they come in (session_store),
so by the time /interview/{id}/end is called we just average what's there.
"""

from fastapi import APIRouter, HTTPException

from app import state
from app.models.schemas import AnswerScoreRequest, AnswerScoreResponse, InterviewSummaryResponse
from app.services.keyword_matching import score_keywords
from app.services.tfidf_scoring import tfidf_similarity
from app.services.semantic_scoring import semantic_similarity
from app.services.final_score import compute_final_score, build_feedback
from app.store import session_store
from app.config import DEFAULT_CONFIDENCE_SCORE

router = APIRouter()


@router.post("/score/answer", response_model=AnswerScoreResponse)
def score_answer(request: AnswerScoreRequest):
    # ---- Step 0: Get reference answer and keywords from the question bank ----
    bank_entry = state.question_bank.get(request.question_id)
    if bank_entry is None:
        raise HTTPException(
            status_code=400,
            detail=f"Question ID '{request.question_id}' not found in the question bank.",
        )

    reference_answer = bank_entry["reference_answer"]
    keywords = bank_entry["keywords"]

    # ---- Step 1: Keyword matching ----
    keyword_result = score_keywords(
        request.transcript_text,
        keywords,
        state.rarity_map,
    )

    # ---- Step 2: TF-IDF lexical similarity ----
    tfidf_score = tfidf_similarity(
        request.transcript_text,
        reference_answer,
    )

    # ---- Step 3: SBERT semantic similarity ----
    semantic_score = semantic_similarity(
        request.transcript_text,
        reference_answer,
        state.sbert_model,
    )

    # ---- Step 4: Compute final score and feedback ----
    final_score = compute_final_score(
        keyword_result["score"],
        tfidf_score,
        semantic_score,
    )

    feedback = build_feedback(
        keyword_result,
        tfidf_score,
        semantic_score,
    )

    return AnswerScoreResponse(
        question_id=request.question_id,
        keyword_score=keyword_result["score"],
        tfidf_score=tfidf_score,
        semantic_score=semantic_score,
        final_score=final_score,
        matched_keywords=keyword_result["matched_keywords"],
        missing_keywords=keyword_result["missing_keywords"],
        negated_keywords=keyword_result["negated_keywords"],
        strengths=feedback["strengths"],
        weaknesses=feedback["weaknesses"],
        areas_for_improvement=feedback["areas_for_improvement"],
    )


@router.post("/interview/{interview_id}/end", response_model=InterviewSummaryResponse)
def end_interview(interview_id: str):
    scores = session_store.get_scores(interview_id)

    if not scores:
        raise HTTPException(status_code=404, detail=f"No scores found for interview_id '{interview_id}'.")

    total = len(scores)
    avg = lambda field: round(sum(getattr(s, field) for s in scores) / total, 4)

    summary = InterviewSummaryResponse(
        interview_id=interview_id,
        total_questions_answered=total,
        # average_confidence_score=avg("confidence_score"),
        average_keyword_score=avg("keyword_score"),
        average_tfidf_score=avg("tfidf_score"),
        average_semantic_score=avg("semantic_score"),
        average_final_score=avg("final_score"),
        per_question_scores=scores,
    )

    # Session is done — clear it out of memory (Express will already have
    # persisted every individual score to Postgres by this point).
    session_store.clear_session(interview_id)

    return summary
