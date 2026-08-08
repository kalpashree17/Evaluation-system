"""
Audio loading, mono conversion, normalisation, framing, and Hamming windowing.

This module is deliberately self-contained: it owns the only I/O with the
file-system (via soundfile / ffmpeg) and the only sample-rate / frame-size
constants. Every downstream module imports from here.
"""

import subprocess
import tempfile
import os

import numpy as np
import soundfile as sf

# ── Constants ────────────────────────────────────────────────────────────────

SAMPLE_RATE = 16000          # target sample rate (Whisper convention)
FRAME_MS = 25                # frame duration in milliseconds
HOP_MS = 10                  # hop (shift) between frames in milliseconds


# ── Audio Loading ────────────────────────────────────────────────────────────

def _is_wav(path: str) -> bool:
    return path.lower().endswith(".wav")


def load_audio(path: str) -> tuple[np.ndarray, int]:
    """
    Return (samples, sample_rate) as a mono float32 array normalised to [-1, 1].
    Handles wav natively; converts anything else via ffmpeg.
    """
    if _is_wav(path):
        samples, sr = sf.read(path, dtype="float32")
    else:
        tmp_wav = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        tmp_wav.close()
        try:
            subprocess.run(
                [
                    "ffmpeg", "-y", "-i", path,
                    "-ar", str(SAMPLE_RATE),
                    "-ac", "1",
                    "-sample_fmt", "s16",
                    tmp_wav.name,
                ],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=True,
            )
            samples, sr = sf.read(tmp_wav.name, dtype="float32")
        finally:
            os.unlink(tmp_wav.name)

    # stereo → mono
    if samples.ndim > 1:
        samples = samples.mean(axis=1)

    # resample to target rate if needed (linear interpolation)
    if sr != SAMPLE_RATE:
        ratio = sr / SAMPLE_RATE
        num_out = int(len(samples) / ratio)
        src_indices = np.arange(num_out) * ratio
        floor = np.floor(src_indices).astype(int)
        ceil = np.minimum(floor + 1, len(samples) - 1)
        frac = src_indices - floor
        samples = samples[floor] * (1.0 - frac) + samples[ceil] * frac
        sr = SAMPLE_RATE

    # normalise to [-1, 1]
    peak = np.max(np.abs(samples))
    if peak > 0:
        samples = samples / peak

    return samples, sr


# ── Framing + Windowing ─────────────────────────────────────────────────────

def _hamming_window(length: int) -> np.ndarray:
    """Hamming window: w(n) = 0.54 - 0.46 * cos(2πn / (N-1))"""
    n = np.arange(length)
    return 0.54 - 0.46 * np.cos(2.0 * np.pi * n / (length - 1))


def frame_signal(samples: np.ndarray, sr: int) -> tuple[np.ndarray, int]:
    """
    Split audio into overlapping frames and apply a Hamming window.

    Returns:
        frames: 2-D array (num_frames, frame_length)
        sr: sample rate (pass-through for convenience)
    """
    frame_len = int(sr * FRAME_MS / 1000)
    hop_len = int(sr * HOP_MS / 1000)
    window = _hamming_window(frame_len)

    num_frames = max(1, (len(samples) - frame_len) // hop_len + 1)
    frames = np.zeros((num_frames, frame_len), dtype=np.float64)

    for i in range(num_frames):
        start = i * hop_len
        frame = samples[start : start + frame_len].copy()
        if len(frame) < frame_len:
            frame = np.pad(frame, (0, frame_len - len(frame)))
        frames[i] = frame * window

    return frames, sr
