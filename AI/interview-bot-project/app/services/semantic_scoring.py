"""
Semantic score = meaning-level similarity via SBERT sentence embeddings.

Unlike TF-IDF, this catches the case where the candidate explains the
right idea using completely different words than the reference answer.

The model is loaded ONCE (in main.py at app startup) and passed into
this function, since loading it per-request would be very slow.
"""

from sentence_transformers import SentenceTransformer, util

from app.utils.text_utils import clean_for_semantic


def semantic_similarity(transcript_text: str, reference_answer: str, model: SentenceTransformer) -> float:
    candidate_text = clean_for_semantic(transcript_text)
    reference_text = clean_for_semantic(reference_answer)

    if not candidate_text or not reference_text:
        return 0.0

    embeddings = model.encode([reference_text, candidate_text], convert_to_tensor=True)
    similarity = util.cos_sim(embeddings[0], embeddings[1]).item()

    return round(float(max(0.0, similarity)), 4)
