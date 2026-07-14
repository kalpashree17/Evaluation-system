"""
Loads question_dataset_structured.csv into a simple dict keyed by
question_id, so a caller can send just {question_id, transcript_text}
and still get scored — useful for testing this service directly from
/docs without running the whole Express + Postgres stack.

In production, Express already has this data in Postgres and will send
reference_answer + keywords directly in the request (Contract B), so
this fallback is just a convenience, not the primary path.
"""

import json

import pandas as pd

from app.config import QUESTION_BANK_CSV
from app.models.schemas import KeywordItem


def load_question_bank(csv_path: str = QUESTION_BANK_CSV) -> dict[str, dict]:
    df = pd.read_csv(csv_path)
    bank = {}

    for _, row in df.iterrows():
        qid = str(row["question_id"])
        keyword_objs = [KeywordItem(**obj) for obj in json.loads(row["keywords"])]
        bank[qid] = {
            "reference_answer": row["reference_answer"],
            "keywords": keyword_objs,
        }

    return bank
