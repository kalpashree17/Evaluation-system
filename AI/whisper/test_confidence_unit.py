import pytest
from confidence.acoustic import compute_acoustic_confidence
from confidence.communication import compute_communication_score

def test_speech_rate_silent_audio():
    """Silent audio should yield low acoustic score"""
    # Create a silent audio array (1 second of zeros)
    import numpy as np
    silent = np.zeros(16000)
    score = compute_acoustic_confidence(silent, 16000)
    assert score < 0.3  # Low confidence

def test_filler_heavy_transcript():
    """Transcript with many fillers should penalize communication score"""
    transcript = "um I think uh like maybe I guess um uh like"
    score = compute_communication_score(transcript, total_words=10)
    assert score < 0.4

def test_clear_confident_transcript():
    """Clear, certain language should score high"""
    transcript = "I definitely know this. I have worked on this project for 2 years."
    score = compute_communication_score(transcript, total_words=10)
    assert score > 0.6