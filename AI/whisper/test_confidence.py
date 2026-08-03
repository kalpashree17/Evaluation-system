import sys
import numpy as np
from confidence.acoustic import (
    speech_rate_score,
    pause_score,
    pitch_variation_score,
    energy_consistency_score,
    silence_ratio_score,
)
from confidence.communication import (
    filler_behaviour_score,
    lexical_certainty_score,
    fluency_score,
)


def test_speech_rate():
    # 14 words in 6 seconds → ~140 WPM (ideal)
    words = [{"start": 0.0, "end": 0.4} for _ in range(14)]
    score = speech_rate_score(words, audio_duration_ms=6000)
    assert 0.6 <= score <= 1.0, f"Expected ~0.75, got {score}"
    print(f"  speech_rate_score: {score:.3f}")


def test_pause_score():
    score = pause_score(
        {"total_pause_ratio": 0.05, "longest_pause_ms": 200, "pause_count": 1},
        audio_duration_ms=10000,
    )
    assert score > 0.7, f"Expected >0.7, got {score}"
    print(f"  pause_score: {score:.3f}")


def test_pitch_variation():
    f0 = np.array([100, 130, 160, 190, 150, 120])
    score = pitch_variation_score(f0)
    assert score > 0.7, f"Expected >0.7, got {score}"
    print(f"  pitch_variation_score: {score:.3f}")


def test_energy_consistency():
    score = energy_consistency_score(np.array([0.1, 0.11, 0.09, 0.1]))
    assert score > 0.8, f"Expected >0.8, got {score}"
    print(f"  energy_consistency_score: {score:.3f}")


def test_silence_ratio():
    score = silence_ratio_score({"total_pause_ratio": 0.1})
    assert score == 0.9, f"Expected 0.9, got {score}"
    print(f"  silence_ratio_score: {score:.3f}")


def test_fillers():
    score_clean = filler_behaviour_score("I built a full stack application.")
    score_bad = filler_behaviour_score("um uh like um uh basically um")
    assert score_clean > 0.8, f"Expected clean >0.8, got {score_clean}"
    assert score_bad < 0.2, f"Expected bad <0.2, got {score_bad}"
    print(f"  filler_behaviour: clean={score_clean:.3f}, bad={score_bad:.3f}")


def test_lexical_certainty():
    score_certain = lexical_certainty_score("I definitely know this. I am sure.")
    score_hedge = lexical_certainty_score("I think maybe I might possibly.")
    assert score_certain > 0.7, f"Expected certain >0.7, got {score_certain}"
    assert score_hedge < 0.3, f"Expected hedge <0.3, got {score_hedge}"
    print(f"  lexical_certainty: certain={score_certain:.3f}, hedge={score_hedge:.3f}")


def test_fluency():
    score_good = fluency_score("I built a React app with TypeScript.")
    score_bad = fluency_score("I I I think the the app was was good um uh")
    assert score_good > 0.8, f"Expected good >0.8, got {score_good}"
    assert score_bad < 0.5, f"Expected bad <0.5, got {score_bad}"
    print(f"  fluency: good={score_good:.3f}, bad={score_bad:.3f}")


if __name__ == "__main__":
    print("Running confidence pillar tests...\n")
    test_speech_rate()
    test_pause_score()
    test_pitch_variation()
    test_energy_consistency()
    test_silence_ratio()
    test_fillers()
    test_lexical_certainty()
    test_fluency()
    print("\nAll tests passed!")
