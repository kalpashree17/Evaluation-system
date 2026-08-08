"""Integration-style tests for the fused pipeline (confidence/fusion.py).

These exercise the full audio pipeline (load -> frame -> features -> scores)
using a small synthetic .wav generated on the fly, so no real audio files or
the Whisper model are required.
Run with:  venv\\Scripts\\python -m pytest test_fusion.py -v
"""

import numpy as np
import pytest
import soundfile as sf

from confidence.fusion import analyze_audio_confidence

ACOUSTIC_WEIGHT = 0.65
COMMUNICATION_WEIGHT = 0.35

GOOD_TRANSCRIPT = (
    "I have worked on multiple React and Node.js projects. "
    "I definitely understand how APIs work."
)
BAD_TRANSCRIPT = "um I think uh like maybe I guess um uh I don't know basically"


@pytest.fixture
def synthetic_wav(tmp_path):
    """Create a short wav with two voiced tones separated by silence."""
    sr = 16000
    t1 = np.arange(0.0, 1.0, 1.0 / sr)
    tone_a = 0.5 * np.sin(2 * np.pi * 120.0 * t1)  # voiced, 120 Hz
    silence = np.zeros(int(0.5 * sr))              # a pause
    t2 = np.arange(0.0, 1.0, 1.0 / sr)
    tone_b = 0.5 * np.sin(2 * np.pi * 170.0 * t2)  # voiced, 170 Hz

    path = tmp_path / "synthetic.wav"
    sf.write(str(path), np.concatenate([tone_a, silence, tone_b]), sr)
    return str(path)


def test_analyze_returns_all_expected_keys(synthetic_wav):
    result = analyze_audio_confidence(synthetic_wav, text=GOOD_TRANSCRIPT)
    assert set(result.keys()) == {
        "confidence_score",
        "acoustic_confidence",
        "communication_confidence",
        "modifier_delta",
        "acoustic_breakdown",
        "communication_breakdown",
        "raw_features",
    }


def test_analyze_scores_are_in_unit_range(synthetic_wav):
    result = analyze_audio_confidence(synthetic_wav, text=GOOD_TRANSCRIPT)
    assert 0.0 <= result["confidence_score"] <= 1.0
    assert 0.0 <= result["acoustic_confidence"] <= 1.0
    assert 0.0 <= result["communication_confidence"] <= 1.0


def test_final_score_matches_6535_fusion(synthetic_wav):
    result = analyze_audio_confidence(synthetic_wav, text=GOOD_TRANSCRIPT)
    expected = round(
        ACOUSTIC_WEIGHT * result["acoustic_confidence"]
        + COMMUNICATION_WEIGHT * result["communication_confidence"],
        4,
    )
    assert result["confidence_score"] == expected

def test_final_score_matches_6535_fusion(synthetic_wav):
    result = analyze_audio_confidence(synthetic_wav, text=GOOD_TRANSCRIPT)

    expected = round(
        ACOUSTIC_WEIGHT * result["acoustic_confidence"]
        + COMMUNICATION_WEIGHT * result["communication_confidence"],
        4,
    )

    print("\n========== Overall Confidence Fusion ==========")
    print("Inputs")
    print(f"Acoustic Confidence      : {result['acoustic_confidence']:.4f}")
    print(f"Communication Confidence : {result['communication_confidence']:.4f}")
    print(f"Acoustic Weight          : {ACOUSTIC_WEIGHT}")
    print(f"Communication Weight     : {COMMUNICATION_WEIGHT}")

    print("\nComputed Result")
    print(f"Expected Final Score     : {expected:.4f}")
    print(f"Actual Final Score       : {result['confidence_score']:.4f}")

    print("\nAcoustic Breakdown")
    for key, value in result["acoustic_breakdown"].items():
        print(f"{key:<18}: {value:.2f}")

    print("\nCommunication Breakdown")
    for key, value in result["communication_breakdown"].items():
        print(f"{key:<25}: {value:.2f}")

    print("\nRaw Audio Features")
    for key, value in result["raw_features"].items():
        print(f"{key:<20}: {value}")

    assert result["confidence_score"] == expected

def test_good_transcript_scores_higher_than_bad(synthetic_wav):
    good = analyze_audio_confidence(synthetic_wav, text=GOOD_TRANSCRIPT)
    bad = analyze_audio_confidence(synthetic_wav, text=BAD_TRANSCRIPT)
    assert good["communication_confidence"] > bad["communication_confidence"]
    assert good["confidence_score"] >= bad["confidence_score"]


def test_no_transcript_uses_neutral_communication(synthetic_wav):
    result = analyze_audio_confidence(synthetic_wav)
    assert result["communication_confidence"] == 0.5
    assert result["communication_breakdown"] == {
        "filler_behaviour": 0.5,
        "lexical_certainty": 0.5,
        "fluency": 0.5,
        "response_organization": 0.5,
    }


def test_no_timestamps_uses_neutral_speech_rate(synthetic_wav):
    result = analyze_audio_confidence(synthetic_wav)
    assert result["acoustic_breakdown"]["speech_rate"] == 0.5


def test_acoustic_breakdown_has_all_five_pillars(synthetic_wav):
    result = analyze_audio_confidence(synthetic_wav, text=GOOD_TRANSCRIPT)
    assert set(result["acoustic_breakdown"].keys()) == {
        "speech_rate",
        "pause_score",
        "pitch_var",
        "energy_stab",
        "silence_ratio",
    }
    
    


def test_raw_features_reports_pause(synthetic_wav):
    # The synthetic clip contains a 0.5 s silent gap -> a detectable pause.
    result = analyze_audio_confidence(synthetic_wav, text=GOOD_TRANSCRIPT)
    assert result["raw_features"]["pause_count"] >= 1
    assert result["raw_features"]["silence_ratio"] > 0.0
