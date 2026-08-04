"""
Idea #6: a keyword that shows up in almost every question (e.g. "data",
"model") is less discriminating than one unique to a single question
(e.g. "LIFO"). We compute a rarity factor per keyword ONCE at startup by
scanning the entire question bank, then reuse it for every scoring request.

Formula: a simple IDF-style score, min-max normalized into a gentle
[RARITY_MIN_FACTOR, RARITY_MAX_FACTOR] range so it nudges the keyword
weight rather than dominating it.
"""

import json
import math
from collections import defaultdict

import pandas as pd

from app.config import QUESTION_BANK_CSV, RARITY_MIN_FACTOR, RARITY_MAX_FACTOR


def build_rarity_map(csv_path: str = QUESTION_BANK_CSV) -> dict[str, float]:
    df = pd.read_csv(csv_path)

    # Step 1: count how many questions each keyword term appears in.
    doc_freq: dict[str, int] = defaultdict(int)
    total_questions = len(df)

    for kw_json in df["keywords"]:
        try:
            keyword_objs = json.loads(kw_json)
        except (json.JSONDecodeError, TypeError):
            continue
        terms_in_this_question = {obj["term"].strip().lower() for obj in keyword_objs}
        for term in terms_in_this_question:
            doc_freq[term] += 1

    if not doc_freq:
        return {}

    # Step 2: raw IDF score per term (rarer term -> higher score).
    raw_scores = {
        term: math.log((total_questions + 1) / (freq + 1)) + 1
        for term, freq in doc_freq.items()
    }

    # Step 3: min-max normalize into [RARITY_MIN_FACTOR, RARITY_MAX_FACTOR]
    # so rarity nudges the score instead of dominating it.
    min_raw, max_raw = min(raw_scores.values()), max(raw_scores.values())
    span = (max_raw - min_raw) or 1.0  # avoid divide-by-zero if all equal

    rarity_map = {
        term: RARITY_MIN_FACTOR
        + (score - min_raw) / span * (RARITY_MAX_FACTOR - RARITY_MIN_FACTOR)
        for term, score in raw_scores.items()
    }
    return rarity_map


def get_rarity_factor(rarity_map: dict[str, float], term: str) -> float:
    """Unknown terms (not in the bank) default to a neutral factor of 1.0."""
    return rarity_map.get(term.strip().lower(), 1.0)
