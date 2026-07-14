"""
One-time (or occasional) training script. NOT run by the FastAPI app itself.

Run this manually whenever you have new/updated labeled data:
    python scripts/train_model.py

It reads app/data/training_dataset.csv (path comes from config.py, same
pattern as QUESTION_BANK_CSV), trains a RandomForestRegressor to predict
human_score from the 3 sub-scores, and saves the trained model to
app/data/human_score_rf_model.pkl -- which main.py loads at startup.
"""

import os
import sys
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
import joblib

# Make sure the project root (the folder containing "app/") is importable,
# no matter which folder this script was run from.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import TRAINING_DATA_CSV, RF_MODEL_PATH

FEATURES = ["keyword_score", "tfidf_score", "semantic_score"]  # values expected in 0.0-1.0 range
TARGET = "human_score"


def train():
    df = pd.read_csv(TRAINING_DATA_CSV)

    missing = [c for c in FEATURES + [TARGET] if c not in df.columns]
    if missing:
        raise ValueError(f"Training CSV is missing required column(s): {missing}")

    X = df[FEATURES]
    y = df[TARGET]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    model = RandomForestRegressor(n_estimators=200, max_depth=6, random_state=42)
    model.fit(X_train, y_train)

    predictions = model.predict(X_test)
    mae = mean_absolute_error(y_test, predictions)
    r2 = r2_score(y_test, predictions)

    print(f"Trained on {len(X_train)} rows, tested on {len(X_test)} rows.")
    print(f"MAE: {mae:.2f}   R2: {r2:.3f}")
    print("Feature importance:", dict(zip(FEATURES, model.feature_importances_.round(3))))

    joblib.dump(model, RF_MODEL_PATH)
    print(f"Saved model to {RF_MODEL_PATH}")


if __name__ == "__main__":
    train()