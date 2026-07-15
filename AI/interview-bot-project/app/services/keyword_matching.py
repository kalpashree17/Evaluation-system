"""
This is OUR algorithm (not a pretrained model), so it's the most important
piece to get right. It combines 4 ideas on top of plain substring matching:

  #1 Tiered weights   -> "critical" keywords count for more than "supporting"
  #2 Synonym aliases  -> a keyword also matches if the candidate used a
                          listed alias instead of the exact term
  #4 Negation check   -> if the candidate said "NOT type coercion", that
                          match doesn't count as correct
  #6 Rarity weighting -> keywords rare across the whole question bank count
                          for slightly more than keywords that show up
                          everywhere (rarity_map is computed once at startup)

Fuzzy matching (idea #3) is included too, as a fallback when neither the
exact term nor any alias is found — this mainly rescues cases where speech-
to-text slightly mangles a keyword (e.g. "type coersion").
"""

from difflib import SequenceMatcher
from typing import Optional

from app.config import TIER_WEIGHTS, FUZZY_MATCH_THRESHOLD, NEGATION_WORDS, NEGATION_WINDOW
from app.models.schemas import KeywordItem
from app.services.rarity import get_rarity_factor
from app.utils.text_utils import light_preprocess


def _match_single_variant(candidate_tokens: list[str], variant_tokens: list[str]) -> Optional[int]:
    """Exact phrase match: return the starting token index if `variant_tokens`
    appears as a contiguous run inside `candidate_tokens`, else None."""
    if not variant_tokens:
        return None
    n = len(variant_tokens)
    for i in range(len(candidate_tokens) - n + 1):
        if candidate_tokens[i:i + n] == variant_tokens:
            return i
    return None


def _fuzzy_match(candidate_tokens: list[str], term_tokens: list[str]) -> Optional[int]:
    """Fallback for STT typos: slide a same-length window across the
    candidate's tokens and check similarity ratio against the term."""
    if not term_tokens:
        return None
    window_len = len(term_tokens)
    term_str = " ".join(term_tokens)
    best_ratio, best_idx = 0.0, None

    for i in range(len(candidate_tokens) - window_len + 1):
        window_str = " ".join(candidate_tokens[i:i + window_len])
        ratio = SequenceMatcher(None, window_str, term_str).ratio()
        if ratio > best_ratio:
            best_ratio, best_idx = ratio, i

    if best_ratio >= FUZZY_MATCH_THRESHOLD:
        return best_idx
    return None


def _is_negated(candidate_tokens: list[str], match_start_idx: int) -> bool:
    """Look a few tokens back from the match for a negation word."""
    window_start = max(0, match_start_idx - NEGATION_WINDOW)
    preceding = candidate_tokens[window_start:match_start_idx]
    return any(tok in NEGATION_WORDS for tok in preceding)


def score_keywords(transcript_text: str, keywords: list[KeywordItem], rarity_map: dict[str, float]) -> dict:
    """
    Main entry point. Returns:
      {
        "score": float in [0,1],
        "matched_keywords": [...],
        "missing_keywords": [...],
        "negated_keywords": [...],
      }
    """
    candidate_tokens = light_preprocess(transcript_text)

    matched, missing, negated = [], [], []
    matched_weight = 0.0
    total_weight = 0.0

    for kw in keywords:
        tier_weight = TIER_WEIGHTS.get(kw.tier, TIER_WEIGHTS["supporting"])
        rarity_factor = get_rarity_factor(rarity_map, kw.term)
        kw_max_weight = tier_weight * rarity_factor
        total_weight += kw_max_weight

        # Build every phrasing we'll accept a match for: the term itself + aliases.
        variants = [light_preprocess(kw.term)] + [light_preprocess(a) for a in kw.aliases]
        variants = [v for v in variants if v]

        match_idx = None
        for variant_tokens in variants:
            match_idx = _match_single_variant(candidate_tokens, variant_tokens)
            if match_idx is not None:
                break

        # Nothing exact/alias matched -> try a fuzzy fallback on the canonical term only.
        if match_idx is None:
            match_idx = _fuzzy_match(candidate_tokens, light_preprocess(kw.term))

        if match_idx is None:
            missing.append(kw.term)
            continue

        if _is_negated(candidate_tokens, match_idx):
            negated.append(kw.term)  # said it, but negated -> no credit
            continue

        matched.append(kw.term)
        matched_weight += kw_max_weight

    score = round(matched_weight / total_weight, 4) if total_weight > 0 else 0.0

    return {
        "score": score,
        "matched_keywords": matched,
        "missing_keywords": missing,
        "negated_keywords": negated,
    }
