"""
Entry point. Run with:  uvicorn app.main:app --reload
Then open http://127.0.0.1:8000/docs to test endpoints manually.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from sentence_transformers import SentenceTransformer

from app import state
from app.config import SBERT_MODEL_NAME
from app.services.rarity import build_rarity_map
from app.services.question_bank import load_question_bank
from app.routers.scoring import router as scoring_router
from app.config import SBERT_MODEL_NAME, RF_MODEL_PATH
import joblib
import os


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ---- Startup: load everything that's expensive once, not per-request ----
    print("Loading SBERT model...")
    state.sbert_model = SentenceTransformer(SBERT_MODEL_NAME)

    print("Computing keyword rarity map from question bank...")
    state.rarity_map = build_rarity_map()

    print("Loading question bank (fallback lookups by question_id)...")
    state.question_bank = load_question_bank()
    
    if os.path.exists(RF_MODEL_PATH):
        print("Loading Random Forest scoring model...")
        state.rf_model = joblib.load(RF_MODEL_PATH)
    else:
        print("No trained Random Forest model found — falling back to weighted average.")

    print("Startup complete.")
    yield
    # ---- Shutdown: nothing to clean up for now ----


app = FastAPI(title="Interview NLP Scoring Service", lifespan=lifespan)
app.include_router(scoring_router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
