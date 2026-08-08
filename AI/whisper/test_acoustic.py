"""Unit tests for the acoustic confidence tier (confidence/acoustic.py).

Each score function is pure, so no audio files or Whisper model are needed.
Run with:  venv\\Scripts\\python -m pytest test_acoustic.py -v
"""

import numpy as np
import pytest

from confidence.acoustic import (
    speech_rate_score,
    pause_score,
    pitch_variation_score,
    energy_consistency_score,
    silence_ratio_score,
    compute_acoustic_confidence,
)


# ── 1. Speech Rate ─────────────────────────────────────────────────────────

def make_words(count, word_duration=0.4, gap=0.0):
    """Build a list of word timestamps: count words each lasting word_duration."""
    timestamps = []
    t = 0.0
    for _ in range(count):
        timestamps.append({"start": t, "end": t + word_duration})
        t += word_duration + gap
    return timestamps


def test_speech_rate_ideal_wpm_scores_high():
    words = make_words(14, word_duration=0.4)

    speech_time = words[-1]["end"] - words[0]["start"]
    wpm = len(words) / speech_time * 60

    score = speech_rate_score(words, audio_duration_ms=6000)

    print("\n----- Ideal Speech Rate -----")
    print(f"Words         : {len(words)}")
    print(f"Speech Time   : {speech_time:.2f} s")
    print(f"WPM           : {wpm:.2f}")
    print(f"Score         : {score:.2f}")

    assert 0.6 <= score <= 1.0


def test_speech_rate_very_slow_scores_low():
    words = make_words(5, word_duration=2.0)

    speech_time = words[-1]["end"] - words[0]["start"]
    wpm = len(words) / speech_time * 60

    score = speech_rate_score(words, audio_duration_ms=12000)

    print("\n----- Very Slow Speech -----")
    print(f"Words         : {len(words)}")
    print(f"Speech Time   : {speech_time:.2f} s")
    print(f"WPM           : {wpm:.2f}")
    print(f"Score         : {score:.2f}")

    assert score == 0.2


def test_speech_rate_very_fast_scores_low():
    words = make_words(30, word_duration=0.1)

    speech_time = words[-1]["end"] - words[0]["start"]
    wpm = len(words) / speech_time * 60

    score = speech_rate_score(words, audio_duration_ms=3000)

    print("\n----- Very Fast Speech -----")
    print(f"Words         : {len(words)}")
    print(f"Speech Time   : {speech_time:.2f} s")
    print(f"WPM           : {wpm:.2f}")
    print(f"Score         : {score:.2f}")

    assert score == 0.3


def test_speech_rate_no_words_returns_neutral():
    score = speech_rate_score([], 10000)

    print("\n----- No Words -----")
    print(f"Score : {score}")

    assert score == 0.5


def test_speech_rate_zero_duration_returns_neutral():
    words = make_words(5)

    score = speech_rate_score(words, 0)

    print("\n----- Zero Audio Duration -----")
    print(f"Score : {score}")

    assert score == 0.5

def test_speech_rate_zero_speech_time_returns_zero():
    words = [{"start":0.0,"end":0.0} for _ in range(5)]

    score = speech_rate_score(words,5000)

    print("\n----- Zero Speech Time -----")
    print(f"Score : {score}")

    assert score == 0.0


def test_speech_rate_score_always_in_unit_range():
    words = make_words(2)

    print("\n----- Score Range Test -----")

    for duration in (1,1000,100000):
        score = speech_rate_score(words,duration)

        print(f"Duration={duration} ms  Score={score:.2f}")

        assert 0 <= score <= 1
# ── 2. Pause Score ─────────────────────────────────────────────────────────

def test_pause_score_fluent_speech_scores_high():
    info = {"total_pause_ratio": 0.05, "longest_pause_ms": 200, "pause_count": 1}
    score = pause_score(info, audio_duration_ms=10000)
    assert score > 0.7


def test_pause_score_heavy_pausing_scores_low():
    info = {"total_pause_ratio": 0.8, "longest_pause_ms": 5000, "pause_count": 20}
    score = pause_score(info, audio_duration_ms=10000)
    assert score < 0.3


def test_pause_score_zero_duration_returns_neutral():
    info = {"total_pause_ratio": 0.5, "longest_pause_ms": 1000, "pause_count": 5}
    assert pause_score(info, audio_duration_ms=0) == 0.5


def test_pause_score_no_pauses_scores_one():
    info = {"total_pause_ratio": 0.0, "longest_pause_ms": 0, "pause_count": 0}
    assert pause_score(info, audio_duration_ms=10000) == 1.0


# ── 3. Pitch Variation ─────────────────────────────────────────────────────

def test_pitch_variation_monotone_scores_low():
    f0 = np.full(20, 110.0)  # perfectly flat contour
    assert pitch_variation_score(f0) < 0.5


def test_pitch_variation_moderate_range_scores_high():
    f0 = np.array([100, 130, 160, 190, 150, 120, 170, 110])
    assert pitch_variation_score(f0) > 0.7


def test_pitch_variation_insufficient_voiced_frames_is_neutral():
    assert pitch_variation_score(np.array([110.0, 120.0])) == 0.5
    assert pitch_variation_score(np.array([0.0, 0.0, 0.0])) == 0.5


def test_pitch_variation_score_always_in_unit_range():
    for f0 in (np.array([100.0]), np.array([0.0, 1.0, 2.0]),
               np.full(50, 300.0), np.arange(50, 3000, 50)):
        score = pitch_variation_score(f0)
        assert 0.0 <= score <= 1.0
        


# ── 4. Energy Consistency ──────────────────────────────────────────────────

def test_energy_consistency_constant_energy_scores_high():
    assert energy_consistency_score(np.array([0.1, 0.11, 0.09, 0.1])) > 0.8


def test_energy_consistency_high_variance_scores_low():
    energy = np.array([0.5, 0.01, 0.9, 0.001, 1.0])
    assert energy_consistency_score(energy) < 0.5


def test_energy_consistency_empty_is_zero():
    assert energy_consistency_score(np.array([])) == 0.0


def test_energy_consistency_silence_is_zero():
    assert energy_consistency_score(np.zeros(100)) == 0.0


# ── 5. Silence Ratio ───────────────────────────────────────────────────────

def test_silence_ratio_little_silence_scores_high():
    assert silence_ratio_score({"total_pause_ratio": 0.1}) == 0.9


def test_silence_ratio_half_silence_scores_half():
    assert silence_ratio_score({"total_pause_ratio": 0.5}) == 0.5


def test_silence_ratio_total_silence_scores_zero():
    assert silence_ratio_score({"total_pause_ratio": 1.0}) == 0.0


def test_silence_ratio_score_always_in_unit_range():
    for ratio in (0.0, 0.3, 1.0, 2.0, -1.0):
        score = silence_ratio_score({"total_pause_ratio": ratio})
        assert 0.0 <= score <= 1.0


# ── Sub-fusion: compute_acoustic_confidence ────────────────────────────────

def test_acoustic_all_max_scores_one():
    result = compute_acoustic_confidence(1.0, 1.0, 1.0, 1.0, 1.0)

    print("\n========== Overall Acoustic Confidence : All Maximum ==========")
    print("Inputs")
    print("Speech Rate      : 1.0")
    print("Pause Score      : 1.0")
    print("Pitch Variation  : 1.0")
    print("Energy Stability : 1.0")
    print("Silence Ratio    : 1.0")
    print(f"\nFinal Acoustic Confidence : {result['acoustic_confidence']:.2f}")
    print("Breakdown :", result["acoustic_breakdown"])

    assert result["acoustic_confidence"] == 1.0

def test_acoustic_all_zero_scores_zero():
    result = compute_acoustic_confidence(0.0, 0.0, 0.0, 0.0, 0.0)

    print("\n========== Overall Acoustic Confidence : All Minimum ==========")
    print("Inputs")
    print("Speech Rate      : 0.0")
    print("Pause Score      : 0.0")
    print("Pitch Variation  : 0.0")
    print("Energy Stability : 0.0")
    print("Silence Ratio    : 0.0")
    print(f"\nFinal Acoustic Confidence : {result['acoustic_confidence']:.2f}")
    print("Breakdown :", result["acoustic_breakdown"])

    assert result["acoustic_confidence"] == 0.0

def test_acoustic_neutral_scores_neutral():
    result = compute_acoustic_confidence(0.5, 0.5, 0.5, 0.5, 0.5)

    print("\n========== Overall Acoustic Confidence : Neutral ==========")
    print("Inputs")
    print("Speech Rate      : 0.5")
    print("Pause Score      : 0.5")
    print("Pitch Variation  : 0.5")
    print("Energy Stability : 0.5")
    print("Silence Ratio    : 0.5")
    print(f"\nFinal Acoustic Confidence : {result['acoustic_confidence']:.2f}")
    print("Breakdown :", result["acoustic_breakdown"])

    assert result["acoustic_confidence"] == 0.5
def test_acoustic_is_weighted_average():
    # One pillar low, the rest perfect → score above the single low value.
    result = compute_acoustic_confidence(0.0, 1.0, 1.0, 1.0, 1.0)
    assert 0.0 < result["acoustic_confidence"] < 1.0


def test_acoustic_is_weighted_average():
    speech_rate = 0.6
    pause_score_value = 0.7
    pitch_variation = 0.8
    energy_stability = 0.9
    silence_ratio = 0.5

    result = compute_acoustic_confidence(
        speech_rate,
        pause_score_value,
        pitch_variation,
        energy_stability,
        silence_ratio,
    )

    print("\n========== Overall Acoustic Confidence : Mixed Feature Scores ==========")
    print("Inputs")
    print(f"Speech Rate      : {speech_rate}")
    print(f"Pause Score      : {pause_score_value}")
    print(f"Pitch Variation  : {pitch_variation}")
    print(f"Energy Stability : {energy_stability}")
    print(f"Silence Ratio    : {silence_ratio}")

    print("\nComputed Result")
    print(f"Overall Acoustic Confidence : {result['acoustic_confidence']:.4f}")

    print("\nFeature Breakdown")
    for feature, value in result["acoustic_breakdown"].items():
        print(f"{feature:<15}: {value:.2f}")

    assert 0.0 < result["acoustic_confidence"] < 1.0
def test_acoustic_result_contains_breakdown():
    result = compute_acoustic_confidence(0.6, 0.7, 0.8, 0.9, 0.5)
    assert result["acoustic_breakdown"] == {
        "speech_rate": 0.6,
        "pause_score": 0.7,
        "pitch_var": 0.8,
        "energy_stab": 0.9,
        "silence_ratio": 0.5,
    }
