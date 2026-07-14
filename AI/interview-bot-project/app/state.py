"""
Simple module-level state populated once in main.py's startup event.
Avoids reloading the SBERT model or recomputing rarity on every request.
"""

from sentence_transformers import SentenceTransformer

sbert_model: SentenceTransformer | None = None
rarity_map: dict[str, float] = {}
question_bank: dict[str, dict] = {}
rf_model = None   # RandomForestRegressor, loaded once at startup by main.py
