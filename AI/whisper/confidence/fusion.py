"""
Two-tier confidence fusion and public API.

Model
-----
The **Acoustic Score** is the base estimate — derived from objective,
signal-level measurements the interviewer perceives subconsciously
(speech rate, pauses, pitch dynamics, energy, silence).

The **Human Communication Layer** is a *modifier* that adjusts that
base estimate based on observable communication quality (filler
behaviour, lexical certainty, fluency, response organization).

    Final = Acoustic + (Communication − Acoustic) × MODIFIER_WEIGHT

This mirrors how real interviewers work:
  1. They first perceive the delivery (acoustic base).
  2. Then they adjust their impression based on communication quality.

A strong communication layer gently *boosts* a good acoustic base,
while a weak one *drags it down* — reflecting how hesitation and
vagueness erode an otherwise confident delivery.
"""

from __future__ import annotations

import numpy as np

from .preprocessing import load_audio, frame_signal
from .features import (
    extract_pitch_contour,
    extract_energy,
    detect_pauses,
)
from .acoustic import (
    speech_rate_score,
    pause_score,
    pitch_variation_score,
    energy_consistency_score,
    silence_ratio_score,
    compute_acoustic_confidence,
)
from .communication import (
    filler_behaviour_score,
    lexical_certainty_score,
    fluency_score,
    response_organization_score,
    compute_communication_confidence,
)

# ── Modifier weight ──────────────────────────────────────────────────────────
# How much the communication layer can shift the acoustic base.
# 0.30 means communication can adjust the acoustic score by up to
# ±30 % of the gap between acoustic and communication scores.
MODIFIER_WEIGHT = 0.30


# ── Modifier-based fusion ───────────────────────────────────────────────────

def compute_confidence(
    acoustic: dict,
    communication: dict,
) -> dict:
    """
    Apply the communication modifier to the acoustic base score.

    The modifier is asymmetric in *effect*:
      • Communication > Acoustic  → gentle boost  (credibility lift)
      • Communication < Acoustic  → stronger drag  (hesitation penalty)

    Args:
        acoustic:     dict with 'acoustic_confidence' (float)
        communication: dict with 'communication_confidence' (float)

    Returns:
        dict with final 'confidence_score', tier scores, and breakdown.
    """
    a_score = acoustic["acoustic_confidence"]
    c_score = communication["communication_confidence"]

    # modifier: shift acoustic base toward communication score
    delta = c_score - a_score
    final = a_score + delta * MODIFIER_WEIGHT

    return {
        "confidence_score": round(float(np.clip(final, 0, 1)), 4),
        "acoustic_confidence": a_score,
        "communication_confidence": c_score,
        "modifier_delta": round(float(delta), 4),
        "acoustic_breakdown": acoustic["acoustic_breakdown"],
        "communication_breakdown": communication["communication_breakdown"],
    }


# ── Public API ───────────────────────────────────────────────────────────────

def analyze_audio_confidence(
    audio_path: str,
    word_timestamps: list[dict] | None = None,
    text: str | None = None,
) -> dict:
    """
    Full pipeline: load → preprocess → extract features → score → modify.

    Args:
        audio_path:       path to any audio file (wav, webm, mp3, etc.)
        word_timestamps:  optional list of {'start': float, 'end': float}
                          from faster-whisper segments (used for speech rate).
        text:             transcript text (used for communication scoring).

    Returns:
        dict with 'confidence_score' (float 0-1), tier scores,
        modifier delta, full breakdown, and raw features.
    """
    # ── load & preprocess ────────────────────────────────────────────────────
    samples, sr = load_audio(audio_path)
    frames, sr = frame_signal(samples, sr)

    # ── extract raw features ─────────────────────────────────────────────────
    f0 = extract_pitch_contour(frames, sr)
    energy = extract_energy(frames)
    pauses = detect_pauses(energy, sr)
    audio_duration_ms = len(samples) / sr * 1000

    # ── Tier 1: Acoustic base (70 %) ─────────────────────────────────────────
    if word_timestamps:
        rate = speech_rate_score(word_timestamps, audio_duration_ms=audio_duration_ms)
    else:
        rate = 0.5

    pa = pause_score(pauses, audio_duration_ms=audio_duration_ms)
    pv = pitch_variation_score(f0)
    es = energy_consistency_score(energy)
    sr_s = silence_ratio_score(pauses)

    acoustic_result = compute_acoustic_confidence(rate, pa, pv, es, sr_s)

    # ── Tier 2: Communication modifier (30 %) ────────────────────────────────
    fw = filler_behaviour_score(text) if text else 0.5
    lc = lexical_certainty_score(text) if text else 0.5
    fl = fluency_score(text) if text else 0.5
    ro = response_organization_score(text) if text else 0.5

    communication_result = compute_communication_confidence(fw, lc, fl, ro)

    # ── modifier-based fusion ────────────────────────────────────────────────
    result = compute_confidence(acoustic_result, communication_result)

    # ── raw features (for debugging / downstream use) ────────────────────────
    voiced = f0[f0 > 0]
    result["raw_features"] = {
        "pitch_mean_hz":     round(float(np.mean(voiced)) if len(voiced) > 0 else 0, 2),
        "pitch_std_hz":      round(float(np.std(voiced)) if len(voiced) > 0 else 0, 2),
        "pitch_range_hz":    round(float(np.max(voiced) - np.min(voiced)) if len(voiced) > 0 else 0, 2),
        "energy_mean":       round(float(np.mean(energy)), 6),
        "energy_std":        round(float(np.std(energy)), 6),
        "silence_ratio":     round(pauses["total_pause_ratio"], 4),
        "pause_count":       pauses["pause_count"],
        "longest_pause_ms":  round(pauses["longest_pause_ms"], 1),
        "num_voiced_frames": int(np.sum(f0 > 0)),
        "total_frames":      len(f0),
    }

    return result
