"""
TF-IDF score = surface-level lexical similarity between the candidate's
transcript and the reference answer.

We fit a fresh TfidfVectorizer on just these 2 documents per request
(not on the whole question bank) — this is standard for pairwise
answer-vs-reference comparison and needs no persisted model.
"""

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.utils.text_utils import deep_preprocess


def tfidf_similarity(transcript_text: str, reference_answer: str) -> float:
    candidate_tokens = deep_preprocess(transcript_text)
    reference_tokens = deep_preprocess(reference_answer)

    candidate_doc = " ".join(candidate_tokens)
    reference_doc = " ".join(reference_tokens)

    if not candidate_doc or not reference_doc:
        return 0.0

    vectorizer = TfidfVectorizer()
    tfidf_matrix = vectorizer.fit_transform([reference_doc, candidate_doc])
    similarity = cosine_similarity(tfidf_matrix[0], tfidf_matrix[1])[0][0]

    return round(float(max(0.0, similarity)), 4)
