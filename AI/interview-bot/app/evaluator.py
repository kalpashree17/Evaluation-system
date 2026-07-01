
from sklearn.metrics.pairwise import cosine_similarity
from app.model import model


def evaluate_answer(student_answer, reference_answers):

    best_score = 0

    for ref in reference_answers:

        embeddings = model.encode([student_answer, ref])

        similarity = cosine_similarity(
            [embeddings[0]],
            [embeddings[1]]
        )[0][0]

        if similarity > best_score:
            best_score = similarity

    return float(round(best_score * 100, 2))