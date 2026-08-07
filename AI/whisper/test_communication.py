"""Unit tests for the communication confidence tier (confidence/communication.py).

Each score function is pure text processing — no audio or Whisper model needed.
Run with:  venv\\Scripts\\python -m pytest test_communication.py -v
"""

import pytest

from confidence.communication import (
    filler_behaviour_score,
    lexical_certainty_score,
    fluency_score,
    response_organization_score,
    compute_communication_confidence,
)


# ── 1. Filler Behaviour ─────────────────────────────────────────────────────

def test_filler_clean_text_scores_high():
    assert filler_behaviour_score("I built a full stack application.") > 0.8


def test_filler_heavy_text_scores_low():
    assert filler_behaviour_score("um uh like um uh basically um") < 0.2


def test_filler_filler_phrases_counted():
    # "you know" / "kind of" are multi-word fillers and should be penalised.
    score = filler_behaviour_score("you know you know kind of sort of")
    assert score < 0.5


def test_filler_empty_text_is_neutral():
    assert filler_behaviour_score("") == 0.5
    assert filler_behaviour_score("   ") == 0.5


# ── 2. Lexical Certainty ────────────────────────────────────────────────────

def test_lexical_certain_assertive_text_scores_high():
    assert lexical_certainty_score("I definitely know this. I am sure.") > 0.7


def test_lexical_hedging_text_scores_low():
    assert lexical_certainty_score("I think maybe I might possibly.") < 0.3


def test_lexical_certainty_empty_text_is_neutral():
    assert lexical_certainty_score("") == 0.5


def test_lexical_certainty_score_always_in_unit_range():
    for text in ("", "yes", "maybe", "definitely", "I think maybe definitely"):
        assert 0.0 <= lexical_certainty_score(text) <= 1.0


# ── 3. Speaking Fluency ─────────────────────────────────────────────────────

def test_fluency_fluent_text_scores_high():
    assert fluency_score("I built a React app with TypeScript.") > 0.8


def test_fluency_repetitions_scores_low():
    assert fluency_score("I I I think the the app was was good um uh") < 0.5


def test_fluency_short_text_is_lenient():
    # Fewer than 3 words → fixed 0.7, not penalised.
    assert fluency_score("Yes.") == 0.7


def test_fluency_empty_text_is_neutral():
    assert fluency_score("") == 0.5


# ── 4. Response Organization ────────────────────────────────────────────────

def test_organization_single_sentence_is_lenient():
    assert response_organization_score("I built a website.") == 0.7


def test_organization_consistent_tense_scores_high():
    text = ("I worked on a React project. I built the dashboard. "
            "I shipped the feature last week.")
    assert response_organization_score(text) > 0.6


def test_organization_mixed_tense_penalized():
    text = ("Yesterday I was cooking and was cleaning and was baking. "
            "Today I am coding and am testing and am reviewing.")
    assert response_organization_score(text) < 0.7


def test_organization_empty_text_is_neutral():
    assert response_organization_score("") == 0.5


# ── Sub-fusion: compute_communication_confidence ────────────────────────────

def test_communication_all_max_scores_one():
    result = compute_communication_confidence(1.0, 1.0, 1.0, 1.0)
    assert result["communication_confidence"] == 1.0


def test_communication_all_zero_scores_zero():
    result = compute_communication_confidence(0.0, 0.0, 0.0, 0.0)
    assert result["communication_confidence"] == 0.0


def test_communication_neutral_scores_neutral():
    result = compute_communication_confidence(0.5, 0.5, 0.5, 0.5)
    assert result["communication_confidence"] == 0.5


def test_communication_is_weighted_average():
    result = compute_communication_confidence(0.0, 1.0, 1.0, 1.0)
    assert 0.0 < result["communication_confidence"] < 1.0

def test_communication_is_weighted_average():
    filler_behaviour = 0.6
    lexical_certainty = 0.7
    fluency = 0.8
    response_organization = 0.9

    result = compute_communication_confidence(
        filler_behaviour,
        lexical_certainty,
        fluency,
        response_organization,
    )

    print("\n========== Overall Communication Confidence : Mixed Feature Scores ==========")
    print("Inputs")
    print(f"Filler Behaviour       : {filler_behaviour}")
    print(f"Lexical Certainty      : {lexical_certainty}")
    print(f"Fluency                : {fluency}")
    print(f"Response Organization  : {response_organization}")

    print("\nComputed Result")
    print(f"Overall Communication Confidence : {result['communication_confidence']:.4f}")

    print("\nFeature Breakdown")
    for feature, value in result["communication_breakdown"].items():
        print(f"{feature:<25}: {value:.2f}")

    assert 0.0 < result["communication_confidence"] < 1.0

def test_communication_result_contains_breakdown():
    result = compute_communication_confidence(0.6, 0.7, 0.8, 0.9)
    assert result["communication_breakdown"] == {
        "filler_behaviour": 0.6,
        "lexical_certainty": 0.7,
        "fluency": 0.8,
        "response_organization": 0.9,
    }
