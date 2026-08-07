import sys
import json
from confidence.fusion import analyze_audio_confidence

AUDIO = "test.wav"

print(f"Analyzing: {AUDIO}\n")

# ── Run without text (audio-only, communication defaults to 0.5) ──
result_audio_only = analyze_audio_confidence(AUDIO)
print("=== Audio Only (no transcript) ===")
print(f"  Final confidence:  {result_audio_only['confidence_score']}")
print(f"  Acoustic:          {result_audio_only['acoustic_confidence']}")
print(f"  Communication:     {result_audio_only['communication_confidence']}")
print(f"  Modifier delta:    {result_audio_only['modifier_delta']}")
print(f"  Acoustic breakdown:  {json.dumps(result_audio_only['acoustic_breakdown'], indent=4)}")
print(f"  Raw features:       {json.dumps(result_audio_only['raw_features'], indent=4)}")

# ── Run with transcript (full pipeline) ──
sample_transcript = "I have worked on multiple React and Node.js projects. I definitely understand how APIs work."
result_with_text = analyze_audio_confidence(AUDIO, text=sample_transcript)

print(f"\n=== With Transcript ===")
print(f"  Final confidence:  {result_with_text['confidence_score']}")
print(f"  Acoustic:          {result_with_text['acoustic_confidence']}")
print(f"  Communication:     {result_with_text['communication_confidence']}")
print(f"  Modifier delta:    {result_with_text['modifier_delta']}")
print(f"  Communication breakdown:  {json.dumps(result_with_text['communication_breakdown'], indent=4)}")

# ── Run with bad transcript (should drag score down) ──
bad_transcript = "um I think uh like maybe I guess um uh I don't know basically"
result_bad = analyze_audio_confidence(AUDIO, text=bad_transcript)

print(f"\n=== Bad Transcript (fillers + hedging) ===")
print(f"  Final confidence:  {result_bad['confidence_score']}")
print(f"  Communication:     {result_bad['communication_confidence']}")
print(f"  Modifier delta:    {result_bad['modifier_delta']}")

# ── Summary comparison ──
print("\n=== Summary ===")
print(f"  Audio only:        {result_audio_only['confidence_score']}")
print(f"  Good transcript:   {result_with_text['confidence_score']}")
print(f"  Bad transcript:    {result_bad['confidence_score']}")
print(f"\n  Good > Bad: {result_with_text['confidence_score'] > result_bad['confidence_score']}")
