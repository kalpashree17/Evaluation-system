# """
# Combines keyword_score + tfidf_score + semantic_score into one final_score
# using the weights from config.py, and turns the keyword-match details into
# human-readable strengths / weaknesses / areas_for_improvement.
# """

# from app.config import KEYWORD_WEIGHT, TFIDF_WEIGHT, SEMANTIC_WEIGHT


# def compute_final_score(keyword_score: float, tfidf_score: float, semantic_score: float) -> float:
#     final = (
#         keyword_score * KEYWORD_WEIGHT
#         + tfidf_score * TFIDF_WEIGHT
#         + semantic_score * SEMANTIC_WEIGHT
#     )
#     return round(final, 4)


# def build_feedback(keyword_result: dict, tfidf_score: float, semantic_score: float) -> dict:
#     """Turns raw match data into short, readable feedback bullets."""
#     matched = keyword_result["matched_keywords"]
#     missing = keyword_result["missing_keywords"]
#     negated = keyword_result["negated_keywords"]

#     strengths = []
#     if matched:
#         shown = ", ".join(matched[:3])
#         strengths.append(f"Correctly covered: {shown}")
#     if semantic_score >= 0.75:
#         strengths.append("Overall explanation closely matches the expected meaning")

#     weaknesses = []
#     if missing:
#         shown = ", ".join(missing[:3])
#         weaknesses.append(f"Missed key concept(s): {shown}")
#     if negated:
#         shown = ", ".join(negated)
#         weaknesses.append(f"Mentioned but seemingly contradicted: {shown}")

#     areas_for_improvement = []
#     if missing:
#         areas_for_improvement.append(f"Review and explicitly mention: {', '.join(missing[:3])}")
#     if tfidf_score < 0.4:
#         areas_for_improvement.append("Try using more of the precise terminology from the topic")
#     if semantic_score < 0.4:
#         areas_for_improvement.append("Answer's overall meaning drifted from what was expected — revisit the core concept")

#     if not strengths:
#         strengths.append("Attempted the question")
#     if not weaknesses:
#         weaknesses.append("No major gaps detected")
#     if not areas_for_improvement:
#         areas_for_improvement.append("Keep practicing similar questions to build consistency")

#     return {
#         "strengths": strengths,
#         "weaknesses": weaknesses,
#         "areas_for_improvement": areas_for_improvement,
#     }



"""
Combines keyword_score + tfidf_score + semantic_score into one final_score,
and turns the keyword-match details into human-readable strengths /
weaknesses / areas_for_improvement.

final_score now comes from a trained RandomForestRegressor (see
scripts/train_model.py) instead of a fixed weighted average. The model is
loaded ONCE in main.py at startup and stored in state.rf_model -- same
pattern as state.sbert_model. If no model has been trained yet
(state.rf_model is None), this falls back to the old fixed-weight formula
from config.py so the app never crashes just because nobody trained a
model yet.
"""

from app import state
from app.config import KEYWORD_WEIGHT, TFIDF_WEIGHT, SEMANTIC_WEIGHT


def compute_final_score(keyword_score: float, tfidf_score: float, semantic_score: float) -> float:
    if state.rf_model is not None:
        # Model expects a 2D array: one row, three feature columns, in the
        # exact order it was trained on (see FEATURES in train_model.py).
        predicted = state.rf_model.predict([[keyword_score, tfidf_score, semantic_score]])
        final = float(predicted[0])
    else:
        # Fallback: no trained model available yet.
        final = (
            keyword_score * KEYWORD_WEIGHT
            + tfidf_score * TFIDF_WEIGHT
            + semantic_score * SEMANTIC_WEIGHT
        )

    return round(final, 4)


def build_feedback(keyword_result: dict, tfidf_score: float, semantic_score: float) -> dict:
    """Turns raw match data into short, readable feedback bullets."""
    matched = keyword_result["matched_keywords"]
    missing = keyword_result["missing_keywords"]
    negated = keyword_result["negated_keywords"]

    strengths = []
    if matched:
        shown = ", ".join(matched[:3])
        strengths.append(f"Correctly covered: {shown}")
    if semantic_score >= 0.75:
        strengths.append("Overall explanation closely matches the expected meaning")

    weaknesses = []
    if missing:
        shown = ", ".join(missing[:3])
        weaknesses.append(f"Missed key concept(s): {shown}")
    if negated:
        shown = ", ".join(negated)
        weaknesses.append(f"Mentioned but seemingly contradicted: {shown}")

    areas_for_improvement = []
    if missing:
        areas_for_improvement.append(f"Review and explicitly mention: {', '.join(missing[:3])}")
    if tfidf_score < 0.4:
        areas_for_improvement.append("Try using more of the precise terminology from the topic")
    if semantic_score < 0.4:
        areas_for_improvement.append("Answer's overall meaning drifted from what was expected — revisit the core concept")

    if not strengths:
        strengths.append("Attempted the question")
    if not weaknesses:
        weaknesses.append("No major gaps detected")
    if not areas_for_improvement:
        areas_for_improvement.append("Keep practicing similar questions to build consistency")

    return {
        "strengths": strengths,
        "weaknesses": weaknesses,
        "areas_for_improvement": areas_for_improvement,
    }