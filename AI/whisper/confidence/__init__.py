"""
Two-tier speaker confidence scoring system.

    Tier 1 — Acoustic Confidence  (70 %)
        Objective signal measurements: speech rate, pauses, pitch,
        energy, silence ratio.

    Tier 2 — Human Communication Layer  (30 %)
        Linguistic modifier: filler behaviour, lexical certainty,
        fluency, response organization.

    Final = Acoustic + (Communication − Acoustic) × 0.30
"""

from .fusion import analyze_audio_confidence

__all__ = ["analyze_audio_confidence"]
