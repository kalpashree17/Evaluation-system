"""Two-tier speaker confidence scoring system.

The final score is a 65% acoustic-delivery score and a 35%
communication-quality score.
"""

from .fusion import analyze_audio_confidence

__all__ = ["analyze_audio_confidence"]
