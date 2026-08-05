"""
Acoustic Confidence — 65 % of the final score.

Five objective, signal-derived pillars:

    1. Speech Rate           (20 %)
    2. Pause Score           (17 %)
    3. Pitch Variation       (12 %)
    4. Energy Stability      (10 %)
    5. Silence Ratio          (6 %)

Internal weights are relative (sum to 1.0 within this tier).
"""

from __future__ import annotations

import numpy as np

MIN_SPEECH_RATE_WPM = 60
MAX_SPEECH_RATE_WPM = 200
IDEAL_SPEECH_RATE_WPM = 140


# ── 1. Speech Rate ──────────────────────────────────────────────────────────

def speech_rate_score(word_timestamps: list[dict], audio_duration_ms: float) -> float:
    """
    Score [0,1] based on words-per-minute.

    word_timestamps: list of dicts with 'start' and 'end' keys (seconds)
                     as returned by faster-whisper segments.
    audio_duration_ms: total duration of the audio in milliseconds.
    """
    if not word_timestamps or audio_duration_ms <= 0:
        return 0.5

    speech_duration_s = sum(
        w["end"] - w["start"] for w in word_timestamps
        if w["end"] > w["start"]
    )

    if speech_duration_s <= 0:
        return 0.0

    word_count = len(word_timestamps)
    wpm = (word_count / speech_duration_s) * 60

    if wpm < MIN_SPEECH_RATE_WPM:
        return 0.2
    if wpm > MAX_SPEECH_RATE_WPM:
        return 0.3

    deviation = abs(wpm - IDEAL_SPEECH_RATE_WPM)
    max_dev = max(
        IDEAL_SPEECH_RATE_WPM - MIN_SPEECH_RATE_WPM,
        MAX_SPEECH_RATE_WPM - IDEAL_SPEECH_RATE_WPM,
    )
    score = 1.0 - 0.6 * (deviation / max_dev)
    return float(np.clip(score, 0, 1))


# ── 2. Pause Score ──────────────────────────────────────────────────────────

def pause_score(pause_info: dict, audio_duration_ms: float) -> float:
    """
    Score [0,1] — fewer/shorter pauses → higher confidence.
    """
    if audio_duration_ms <= 0:
        return 0.5

    ratio = pause_info["total_pause_ratio"]
    longest_ms = pause_info["longest_pause_ms"]
    count = pause_info["pause_count"]

    ratio_score = np.clip(1.0 - ratio / 0.4, 0, 1)
    longest_score = np.clip(1.0 - (longest_ms - 500) / 2500, 0, 1)

    expected_pauses = max(1, audio_duration_ms / 5000)
    count_ratio = count / expected_pauses
    count_score = np.clip(1.0 - (count_ratio - 1.0) / 3.0, 0, 1)

    return float(np.clip(
        0.4 * ratio_score + 0.35 * longest_score + 0.25 * count_score,
        0, 1,
    ))


# ── 3. Pitch Variation (F0 Range) ──────────────────────────────────────────

def pitch_variation_score(f0: np.ndarray) -> float:
    """
    Score [0,1] — confident speech has natural pitch dynamics (F0 range).
    Monotone → low.  Moderate (80-200 Hz) → high.  Extreme → slightly lower.
    """
    voiced = f0[f0 > 0]
    if len(voiced) < 3:
        return 0.5

    f0_range = float(np.max(voiced) - np.min(voiced))

    if f0_range < 30:
        score = 0.2 + (f0_range / 30.0) * 0.3
    elif f0_range < 80:
        score = 0.5 + ((f0_range - 30) / 50.0) * 0.3
    elif f0_range <= 200:
        score = 0.8 + ((f0_range - 80) / 120.0) * 0.2
    elif f0_range <= 400:
        score = 1.0 - ((f0_range - 200) / 200.0) * 0.2
    else:
        score = 0.6

    return float(np.clip(score, 0, 1))


# ── 4. Energy Stability (RMS) ──────────────────────────────────────────────

def energy_consistency_score(energy: np.ndarray) -> float:
    """
    Score [0,1] — consistent energy → confident.
    """
    if len(energy) == 0:
        return 0.0

    mean_e = np.mean(energy)
    if mean_e < 1e-8:
        return 0.0

    cv = np.std(energy) / mean_e
    return float(np.clip(1.0 - cv, 0, 1))


# ── 5. Silence Ratio ───────────────────────────────────────────────────────

def silence_ratio_score(pause_info: dict) -> float:
    """
    Score [0,1] — less silence relative to total duration → higher confidence.
    """
    return float(np.clip(1.0 - pause_info["total_pause_ratio"], 0, 1))


# ── Sub-fusion ──────────────────────────────────────────────────────────────

# Internal weights for the 5 acoustic pillars (must sum to 1.0)
_ACOUSTIC_WEIGHTS = {
    "speech_rate":   0.20 / 0.65,   # 20/65 normalised
    "pause_score":   0.17 / 0.65,   # 17/65 normalised
    "pitch_var":     0.12 / 0.65,   # 12/65 normalised
    "energy_stab":   0.10 / 0.65,   # 10/65 normalised
    "silence_ratio": 0.06 / 0.65,   #  6/65 normalised
}


def compute_acoustic_confidence(
    speech_rate: float,
    pause: float,
    pitch_var: float,
    energy_stab: float,
    silence: float,
) -> dict:
    """
    Return the acoustic sub-score [0,1] and its breakdown.
    """
    scores = {
        "speech_rate":   speech_rate,
        "pause_score":   pause,
        "pitch_var":     pitch_var,
        "energy_stab":   energy_stab,
        "silence_ratio": silence,
    }

    combined = sum(_ACOUSTIC_WEIGHTS[k] * scores[k] for k in _ACOUSTIC_WEIGHTS)

    return {
        "acoustic_confidence": round(float(np.clip(combined, 0, 1)), 4),
        "acoustic_breakdown": {k: round(v, 4) for k, v in scores.items()},
    }