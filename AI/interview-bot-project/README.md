# Interview NLP Scoring Service

Python/FastAPI microservice that implements the "NLP scoring service" box
from `backend_architecture.md` (Contract B). Express calls this per answer;
this service returns keyword/TF-IDF/semantic/final scores + feedback.

## Setup

```bash
cd interview-bot-project
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Run

```bash
uvicorn app.main:app --reload
```

Open **http://127.0.0.1:8000/docs** — Swagger UI to test both endpoints
by hand before Express is wired up.

## Endpoints

### `POST /score/answer` — Score one interview answer

Scores a candidate's response for a single interview question using keyword matching, TF-IDF similarity, and semantic similarity. The endpoint returns detailed feedback and automatically stores the score under the provided `interview_id` for later interview summary generation.

#### Request

```json
{
  "question_id": "2",
  "transcript_text": "var is function scoped and gets hoisted with undefined, let and const are block scoped, and const can't be reassigned after you declare it."
}
```

#### Response

```json
{
  "question_id": "2",
  "keyword_score": 0.8462,
  "tfidf_score": 0.3429,
  "semantic_score": 0.9327,
  "final_score": 0.7715,
  "matched_keywords": [
    "var",
    "let",
    "const",
    "scope",
    "hoisting"
  ],
  "missing_keywords": [
    "temporal dead zone",
    "reassignment"
  ],
  "negated_keywords": [],
  "strengths": [
    "Correctly covered: var, let, const",
    "Overall explanation closely matches the expected meaning"
  ],
  "weaknesses": [
    "Missed key concept(s): temporal dead zone, reassignment"
  ],
  "areas_for_improvement": [
    "Review and explicitly mention: temporal dead zone, reassignment",
    "Try using more of the precise terminology from the topic"
  ]
}
```

The endpoint automatically retrieves the reference answer and expected keywords for the given `question_id` from the local question dataset. The generated score is stored in memory under the supplied `interview_id` so it can be included in the final interview summary.

### `POST /interview/{interview_id}/end` — Close an interview session (not required now)

Calculates the average scores for all answers previously submitted through `/score/answer` for the specified `interview_id`. The response includes the per-question results together with the overall interview summary, then clears the in-memory session.
