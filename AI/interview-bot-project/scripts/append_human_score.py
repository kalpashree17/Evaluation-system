"""
Reads app/data/raw_scores.csv (only keyword_score, tfidf_score, semantic_score
-- no human_score yet), calculates a human_score for every row using the rule
below, and writes app/data/training_dataset.csv with the human_score column
appended. Run this BEFORE train_model.py.

    python scripts/append_human_score.py

This is a stand-in for real human-reviewed scores, since none exist yet for
this project. Once real reviewer scores are available, skip this script
entirely and just put the real data straight into training_dataset.csv.
"""

import os
import sys
import random
import pandas as pd

# Make sure the project root (the folder containing "app/") is importable,
# no matter which folder this script was run from.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import RAW_SCORES_CSV, TRAINING_DATA_CSV

random.seed(42)  # remove this line if you want a different random result every run


def generate_human_score(keyword: float, semantic: float, tfidf: float) -> float:
    """
    Same rule the user designed, rescaled from a 0-100 scale to 0.0-1.0
    (all offsets and thresholds divided by 100) to match this project's
    score range.
    """
    score = (
        keyword * 0.50 +
        semantic * 0.35 +
        tfidf * 0.15
    )
    if semantic < 0.40:
        score -= 0.08
    if keyword > 0.90 and semantic > 0.90:
        score += 0.03
    score += random.uniform(-0.02, 0.02)
    return max(0.0, min(1.0, round(score, 4)))


def main():
    df = pd.read_csv(RAW_SCORES_CSV)

    required = {"keyword_score", "tfidf_score", "semantic_score"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"raw_scores.csv is missing column(s): {missing}")

    df["human_score"] = df.apply(
        lambda row: generate_human_score(
            row["keyword_score"], row["semantic_score"], row["tfidf_score"]
        ),
        axis=1,
    )

    df.to_csv(TRAINING_DATA_CSV, index=False)
    print(f"Wrote {len(df)} rows with human_score appended to {TRAINING_DATA_CSV}")


if __name__ == "__main__":
    main()