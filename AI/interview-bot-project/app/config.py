"""
Central place for every tunable number in the scoring pipeline.
Change weights/thresholds here instead of hunting through service files.
"""

import os

# ---------------------------------------------------------------
# Final score = weighted sum of the 3 sub-scores.
# Keyword matching is OUR algorithm, so it gets the highest weight.
# TF-IDF and SBERT both measure "similarity to reference answer" in
# different ways, so together they don't need to outweigh keyword score.
# ---------------------------------------------------------------
KEYWORD_WEIGHT = 0.50
TFIDF_WEIGHT = 0.20
SEMANTIC_WEIGHT = 0.30

# ---------------------------------------------------------------
# Keyword tiering (idea #1): a "critical" keyword counts for more
# than a "supporting" one when the score is calculated.
# ---------------------------------------------------------------
TIER_WEIGHTS = {
    "critical": 3.0,
    "supporting": 1.0,
}

# ---------------------------------------------------------------
# Fuzzy matching (idea #3): if an exact/alias match fails (e.g. Whisper
# mis-transcribed "type coercion" as "type coersion"), fall back to
# a similarity-ratio match above this threshold.
# ---------------------------------------------------------------
FUZZY_MATCH_THRESHOLD = 0.85

# ---------------------------------------------------------------
# Negation detection (idea #4): if one of these words appears in the
# few tokens right before a matched keyword, we treat the match as
# negated (candidate said the term but denied/contradicted it) and
# do NOT give credit for it.
# ---------------------------------------------------------------
NEGATION_WORDS = {
    "not", "no", "never", "cannot", "cant", "doesnt", "isnt", "arent",
    "wasnt", "werent", "dont", "didnt", "hasnt", "havent", "wont",
    "shouldnt", "wouldnt", "couldnt", "without",
}
NEGATION_WINDOW = 3  # how many tokens back we look for a negation word

# ---------------------------------------------------------------
# Rarity weighting (idea #6): keywords that appear in many questions
# across the bank are less discriminating than ones unique to a single
# question. This scales tier weight up/down. Bounds keep it a gentle
# nudge, not a dominant factor.
# ---------------------------------------------------------------
RARITY_MIN_FACTOR = 0.8
RARITY_MAX_FACTOR = 1.3

# ---------------------------------------------------------------
# Confidence score placeholder.
# The real value will come from your friend's/your own audio-analysis
# service (Contract A in the architecture doc). Until that service is
# wired in, every answer gets this same fixed placeholder value unless
# the caller explicitly passes one in the request.
# ---------------------------------------------------------------
DEFAULT_CONFIDENCE_SCORE = 0.00

# ---------------------------------------------------------------
# SBERT model — small and fast, good enough for semantic similarity
# of short-to-medium interview answers.
# ---------------------------------------------------------------
SBERT_MODEL_NAME = "all-MiniLM-L6-v2"

# ---------------------------------------------------------------
# Path to the question bank CSV (used to compute keyword rarity at
# startup, and as a fallback lookup if a request only sends question_id).
# ---------------------------------------------------------------
QUESTION_BANK_CSV = os.path.join(
    os.path.dirname(__file__), "data", "question_dataset_structured.csv"
)


RF_MODEL_PATH = os.path.join(
    os.path.dirname(__file__), "data", "human_score_rf_model.pkl"
) 

TRAINING_DATA_CSV = os.path.join(
    os.path.dirname(__file__), "data", "training_dataset.csv"
)
    
RAW_SCORES_CSV = os.path.join(
    os.path.dirname(__file__), "data", "raw_scores.csv"
)