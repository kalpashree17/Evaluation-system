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

### `POST /score/answer` — score one question
```json
{
  "interview_id": "interview-abc",
  "question_id": "1",
  "transcript_text": "So double equals does coercion between types...",
  "reference_answer": "optional — falls back to local CSV lookup by question_id if omitted",
  "keywords": "optional — same fallback applies",
  "confidence_score": null
}
```
Returns keyword/tfidf/semantic/final scores + strengths/weaknesses/areas_for_improvement,
and stores this score under `interview_id` in memory.

> `reference_answer` / `keywords` are optional ONLY for local testing —
> in real use, Express should always send them (per Contract B), since
> in production Postgres is the source of truth, not this CSV.

### `POST /interview/{interview_id}/end` — close a session
Averages every score collected for that `interview_id` under `/score/answer`
and returns the full per-question breakdown + averages. Clears the
in-memory session afterward.

## Folder structure

```
interview-bot/
├── requirements.txt
├── README.md
└── app/
    ├── main.py                    # FastAPI app, loads SBERT/rarity/bank at startup
    ├── config.py                  # every tunable weight/threshold
    ├── state.py                   # shared in-memory objects (model, rarity map, bank)
    ├── models/
    │   └── schemas.py             # Pydantic request/response models
    ├── services/
    │   ├── keyword_matching.py    # tiers + aliases + fuzzy + negation + rarity
    │   ├── rarity.py              # computes keyword rarity from the question bank
    │   ├── tfidf_scoring.py       # TF-IDF cosine similarity
    │   ├── semantic_scoring.py    # SBERT cosine similarity
    │   ├── final_score.py         # weighted combination + feedback text
    │   └── question_bank.py       # loads CSV for fallback lookups by question_id
    ├── routers/
    │   └── scoring.py             # /score/answer and /interview/{id}/end
    ├── store/
    │   └── session_store.py       # in-memory interview_id -> [scores] (temporary, pre-Postgres)
    ├── utils/
    │   └── text_utils.py          # 3 preprocessing variants (semantic / deep / light)
    └── data/
        └── question_dataset_structured.csv
```

## Known limitations (by design, for this stage)

- **Confidence score is a fixed placeholder** (`DEFAULT_CONFIDENCE_SCORE` in
  `config.py`) until the audio-analysis service (Contract A) exists. Pass
  `confidence_score` in the request to override it once that's ready.
- **Session storage is in-memory**, not Postgres — restarting the server
  loses any interview in progress. Swap `session_store.py` for real DB
  writes once Express/Postgres integration begins; the response shapes
  won't need to change.
- **Keyword matching finds the first occurrence** of a term in the
  transcript, not every occurrence — if a candidate says a term twice
  (once correctly, once negated), only the first mention is evaluated.
- **Negation/fuzzy matching are simple heuristics** (word-window lookback,
  edit-distance ratio) — not a substitute for real dependency parsing,
  but good enough to catch the common cases cheaply.
