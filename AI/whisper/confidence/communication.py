"""
Human Communication Layer — modifier (35 %) on the acoustic base score.

Four linguistic / textual pillars:

    1. Filler Behaviour        (20 %)  — hesitation markers & frequency
    2. Lexical Certainty        (8 %)  — hedging vs. assertive language
    3. Speaking Fluency         (4 %)  — repetitions, false starts
    4. Response Organization    (3 %)  — topic coherence, tense consistency

Internal weights are relative (sum to 1.0 within this tier).
"""

from __future__ import annotations

import re
import numpy as np

# ── Lexical inventories ─────────────────────────────────────────────────────

FILLER_WORDS = {
    "um", "uh", "erm", "ehm", "hmm", "mm",
    "like", "basically", "actually", "right", "well",
    "ah", "oh",
}

FILLER_PHRASES = ("you know", "i mean", "sort of", "kind of")

HEDGING_WORDS = {
    "maybe", "perhaps", "probably", "possibly", "somewhat",
    "might", "could", "would", "should",
    "i think", "i guess", "i suppose", "i feel like",
    "kind of", "sort of", "pretty much", "more or less",
}

CERTAINTY_WORDS = {
    "definitely", "certainly", "absolutely", "clearly", "obviously",
    "precisely", "exactly", "undoubtedly", "surely", "always",
    "never", "must", "will", "is", "are", "was", "were",
}


# ── 1. Filler Behaviour ─────────────────────────────────────────────────────

def filler_behaviour_score(text: str) -> float:
    """
    Score [0,1] — fewer filler words → higher confidence.
    """
    if not text or not text.strip():
        return 0.5

    words = text.lower().split()
    total_words = len(words)
    if total_words == 0:
        return 0.5

    filler_count = sum(1 for w in words if w.strip(".,!?;:") in FILLER_WORDS)

    text_lower = text.lower()
    for phrase in FILLER_PHRASES:
        filler_count += text_lower.count(phrase)

    filler_ratio = filler_count / total_words

    # 0 fillers → 1.0, ~5% → 0.5, >15% → 0.0
    score = 1.0 - (filler_ratio / 0.15)
    return float(np.clip(score, 0, 1))


# ── 2. Lexical Certainty ───────────────────────────────────────────────────

def lexical_certainty_score(text: str) -> float:
    """
    Score [0,1] — more assertive language → higher confidence.
    Ratio of certainty markers vs. hedging markers, normalised by word count.
    """
    if not text or not text.strip():
        return 0.5

    words = text.lower().split()
    total_words = len(words)
    if total_words == 0:
        return 0.5

    text_lower = text.lower()

    # count hedging (multi-word first, then single)
    hedge_count = 0
    for phrase in ("i think", "i guess", "i suppose", "i feel like",
                   "kind of", "sort of", "pretty much", "more or less"):
        hedge_count += text_lower.count(phrase)
    hedge_count += sum(1 for w in words if w.strip(".,!?;:") in HEDGING_WORDS)

    # count certainty (multi-word first, then single)
    cert_count = 0
    for phrase in ("i know", "i am sure", "i believe"):
        cert_count += text_lower.count(phrase)
    cert_count += sum(1 for w in words if w.strip(".,!?;:") in CERTAINTY_WORDS)

    # normalised difference
    hedge_ratio = hedge_count / total_words
    cert_ratio = cert_count / total_words
    net = cert_ratio - hedge_ratio

    # map to [0, 1]: net=0 → 0.5, net=0.1 → ~0.8, net=-0.1 → ~0.2
    score = 0.5 + net * 3.0
    return float(np.clip(score, 0, 1))


# ── 3. Speaking Fluency ────────────────────────────────────────────────────

def fluency_score(text: str) -> float:
    """
    Score [0,1] — penalises repetitions, false starts, incomplete phrases.
    """
    if not text or not text.strip():
        return 0.5

    words = text.lower().split()
    total_words = len(words)
    if total_words < 3:
        return 0.7

    penalties = 0.0

    # consecutive word repetitions ("I I I think")
    for i in range(1, total_words):
        if words[i] == words[i - 1] and len(words[i]) > 1:
            penalties += 1.0

    # phrase repetitions ("I think I think")
    phrase_len = min(3, total_words // 3)
    if phrase_len >= 2:
        seen_phrases: dict[str, int] = {}
        for i in range(total_words - phrase_len + 1):
            phrase = " ".join(words[i : i + phrase_len])
            seen_phrases[phrase] = seen_phrases.get(phrase, 0) + 1
        for count in seen_phrases.values():
            if count > 1:
                penalties += (count - 1) * 0.5

    # trailing fillers
    trailing_fillers = sum(
        1 for w in words[-3:]
        if w.strip(".,!?;:") in FILLER_WORDS
    )
    if trailing_fillers > 0:
        penalties += trailing_fillers * 0.3

    penalty_rate = (penalties / total_words) * 100
    score = 1.0 - (penalty_rate / 15.0)
    return float(np.clip(score, 0, 1))


# ── 4. Response Organization ───────────────────────────────────────────────

def response_organization_score(text: str) -> float:
    """
    Score [0,1] — consistent tense, pronoun usage, and topic focus → higher.
    Detects abrupt topic shifts and tense mixing.
    """
    if not text or not text.strip():
        return 0.5

    sentences = [s.strip() for s in re.split(r'[.!?]+', text) if s.strip()]
    if len(sentences) < 2:
        return 0.7  # single sentence — hard to judge consistency

    penalties = 0.0

    # 1. Tense mixing
    past_markers = {"was", "were", "had", "did", "went", "said", "thought",
                    "felt", "knew", "came"}
    present_markers = {"is", "are", "am", "do", "does", "can", "will",
                       "shall", "may", "must"}

    past_count = 0
    present_count = 0
    for s in sentences:
        s_words = set(s.lower().split())
        past_count += len(s_words & past_markers)
        present_count += len(s_words & present_markers)

    total_tense = past_count + present_count
    if total_tense > 0:
        dominant_ratio = max(past_count, present_count) / total_tense
        if dominant_ratio < 0.6:
            penalties += 0.3  # heavy mixing

    # 2. Pronoun consistency
    first_person = {"i", "me", "my", "mine", "myself", "we", "us", "our"}
    second_person = {"you", "your", "yours", "yourself"}

    fp_count = 0
    sp_count = 0
    for s in sentences:
        s_words = set(s.lower().split())
        fp_count += len(s_words & first_person)
        sp_count += len(s_words & second_person)

    total_pronoun = fp_count + sp_count
    if total_pronoun > 2:
        pronoun_dominant = max(fp_count, sp_count) / total_pronoun
        if pronoun_dominant < 0.6:
            penalties += 0.2  # awkward shifting between "I" and "you"

    # 3. Topic coherence — average pairwise word overlap between sentences
    all_words = [set(re.findall(r'\b[a-z]{3,}\b', s.lower())) for s in sentences]
    overlaps = []
    for i in range(len(all_words) - 1):
        if all_words[i] and all_words[i + 1]:
            overlap = (len(all_words[i] & all_words[i + 1])
                       / max(len(all_words[i] | all_words[i + 1]), 1))
            overlaps.append(overlap)

    if overlaps:
        avg_overlap = float(np.mean(overlaps))
        if avg_overlap < 0.05:
            penalties += 0.3  # sentences seem unrelated

    score = 1.0 - (penalties / 0.8)
    return float(np.clip(score, 0, 1))


# ── Sub-fusion ──────────────────────────────────────────────────────────────

# Internal weights for the 4 communication pillars (must sum to 1.0)
_COMMUNICATION_WEIGHTS = {
    "filler_behaviour":      0.20 / 0.35,   # 20/35 normalised
    "lexical_certainty":     0.08 / 0.35,   #  8/35 normalised
    "fluency":               0.04 / 0.35,   #  4/35 normalised
    "response_organization": 0.03 / 0.35,   #  3/35 normalised
}


def compute_communication_confidence(
    filler: float,
    lexical: float,
    fluency: float,
    organization: float,
) -> dict:
    """
    Return the communication sub-score [0,1] and its breakdown.
    """
    scores = {
        "filler_behaviour":      filler,
        "lexical_certainty":     lexical,
        "fluency":               fluency,
        "response_organization": organization,
    }

    combined = sum(_COMMUNICATION_WEIGHTS[k] * scores[k]
                   for k in _COMMUNICATION_WEIGHTS)

    return {
        "communication_confidence": round(float(np.clip(combined, 0, 1)), 4),
        "communication_breakdown": {k: round(v, 4) for k, v in scores.items()},
    }