"""
Low-level feature extraction from preprocessed audio frames.

Functions here return raw numerical arrays / dicts — no scoring logic.
"""

from __future__ import annotations

import numpy as np
from scipy.signal import medfilt

from .preprocessing import HOP_MS

# ── Constants ────────────────────────────────────────────────────────────────

SILENCE_DB_THRESHOLD = -40   # frames below this dB level count as silence


# ── Pitch (F0) via autocorrelation ──────────────────────────────────────────

def _estimate_pitch(frame: np.ndarray, sr: int) -> float:
    """
    Estimate fundamental frequency (F0) of a single frame using
    autocorrelation.  Returns frequency in Hz (0 if unvoiced).
    """
    if np.max(np.abs(frame)) < 1e-8:
        return 0.0

    n = len(frame)
    fft_size = 1
    while fft_size < 2 * n:
        fft_size *= 2
    fft_frame = np.fft.fft(frame, n=fft_size)
    acf = np.fft.ifft(fft_frame * np.conj(fft_frame)).real[:n]

    if acf[0] != 0:
        acf = acf / acf[0]

    min_lag = max(1, int(sr / 500))
    max_lag = min(n - 1, int(sr / 60))

    if min_lag >= max_lag:
        return 0.0

    search_region = acf[min_lag : max_lag + 1]
    if len(search_region) == 0:
        return 0.0

    peak_idx = np.argmax(search_region)
    peak_val = search_region[peak_idx]

    if peak_val < 0.3:
        return 0.0

    if 0 < peak_idx < len(search_region) - 1:
        alpha = search_region[peak_idx - 1]
        beta = search_region[peak_idx]
        gamma = search_region[peak_idx + 1]
        denom = alpha - 2 * beta + gamma
        if abs(denom) > 1e-12:
            shift = 0.5 * (alpha - gamma) / denom
        else:
            shift = 0.0
        lag = min_lag + peak_idx + shift
    else:
        lag = min_lag + peak_idx

    if lag <= 0:
        return 0.0

    return float(sr / lag)


def extract_pitch_contour(frames: np.ndarray, sr: int) -> np.ndarray:
    """Return median-smoothed F0 (Hz) for every frame.  0 = unvoiced."""
    f0 = np.array([_estimate_pitch(f, sr) for f in frames])
    return medfilt(f0, kernel_size=5) if len(f0) >= 5 else f0


# ── Energy / Amplitude ──────────────────────────────────────────────────────

def extract_energy(frames: np.ndarray) -> np.ndarray:
    """RMS energy per frame."""
    return np.sqrt(np.mean(frames ** 2, axis=1))


# ── Spectral Features ───────────────────────────────────────────────────────

def _spectral_centroid(magnitude: np.ndarray, freqs: np.ndarray) -> float:
    total = np.sum(magnitude)
    if total < 1e-12:
        return 0.0
    return float(np.sum(freqs * magnitude) / total)


def _spectral_rolloff(magnitude: np.ndarray, freqs: np.ndarray, percentile: float = 0.85) -> float:
    cumulative = np.cumsum(magnitude)
    total = cumulative[-1]
    if total < 1e-12:
        return 0.0
    idx = np.searchsorted(cumulative, percentile * total)
    idx = min(idx, len(freqs) - 1)
    return float(freqs[idx])


def _spectral_flatness(magnitude: np.ndarray) -> float:
    mag = magnitude[magnitude > 0]
    if len(mag) == 0:
        return 1.0
    log_mag = np.log(mag)
    geometric_mean = np.exp(np.mean(log_mag))
    arithmetic_mean = np.mean(mag)
    if arithmetic_mean < 1e-12:
        return 1.0
    return float(np.clip(geometric_mean / arithmetic_mean, 0, 1))


def _mel_filterbank(sr: int, n_fft: int, n_mels: int = 26) -> np.ndarray:
    """Build a mel-spaced triangular filter bank.  Returns (n_mels, n_fft//2+1)."""
    n_freqs = n_fft // 2 + 1
    low_mel = _hz_to_mel(0)
    high_mel = _hz_to_mel(sr / 2)
    mel_points = np.linspace(low_mel, high_mel, n_mels + 2)
    hz_points = _mel_to_hz(mel_points)
    bin_points = np.round(hz_points / (sr / n_fft)).astype(int)

    filters = np.zeros((n_mels, n_freqs))
    for m in range(n_mels):
        left = bin_points[m]
        center = bin_points[m + 1]
        right = bin_points[m + 2]
        for k in range(left, min(center + 1, n_freqs)):
            if center != left:
                filters[m, k] = (k - left) / (center - left)
        for k in range(center, min(right + 1, n_freqs)):
            if right != center:
                filters[m, k] = (right - k) / (right - center)

    return filters


def _hz_to_mel(hz: float) -> float:
    return 2595.0 * np.log10(1.0 + hz / 700.0)


def _mel_to_hz(mel: np.ndarray) -> np.ndarray:
    return 700.0 * (10.0 ** (mel / 2595.0) - 1.0)


def _dct(x: np.ndarray) -> np.ndarray:
    """Type-II DCT (no normalization)."""
    n = len(x)
    k = np.arange(n)
    result = np.sum(
        x[np.newaxis, :]
        * np.cos(np.pi * k[:, np.newaxis] * (2 * np.arange(n)[np.newaxis, :] + 1) / (2 * n)),
        axis=1,
    )
    return result


def extract_spectral_features(frames: np.ndarray, sr: int) -> dict:
    """
    Per-frame spectral features, returned as arrays.
    Also returns MFCCs (first 13 coefficients) computed via DCT of
    mel-spaced filter-bank energies.
    """
    n_fft = frames.shape[1]
    freqs = np.fft.rfftfreq(n_fft, d=1.0 / sr)

    centroids = []
    rolloffs = []
    flatnesses = []
    mfcc_matrix = []

    mel_filters = _mel_filterbank(sr, n_fft, n_mels=26)

    for frame in frames:
        spectrum = np.abs(np.fft.rfft(frame)) ** 2

        centroids.append(_spectral_centroid(spectrum, freqs))
        rolloffs.append(_spectral_rolloff(spectrum, freqs))
        flatnesses.append(_spectral_flatness(spectrum))

        mel_energies = mel_filters @ spectrum
        mel_energies = np.maximum(mel_energies, 1e-12)
        log_mel = np.log(mel_energies)
        mfccs = _dct(log_mel)[:13]
        mfcc_matrix.append(mfccs)

    return {
        "centroid": np.array(centroids),
        "rolloff": np.array(rolloffs),
        "flatness": np.array(flatnesses),
        "mfccs": np.array(mfcc_matrix),
    }


# ── Pause Detection ─────────────────────────────────────────────────────────

def detect_pauses(energy: np.ndarray, sr: int) -> dict:
    """
    Detect silent regions and compute pause statistics.

    Returns:
        pause_count:          number of silent segments
        total_pause_ratio:    fraction of audio that is silent
        longest_pause_ms:     duration of longest silent segment in ms
    """
    frame_duration_ms = HOP_MS
    energy_db = 20 * np.log10(np.maximum(energy, 1e-12))
    noise_floor_db = np.percentile(energy_db, 20)
    threshold_db = np.clip(noise_floor_db + 6.0, -50.0, -20.0)
    is_silent = energy_db < threshold_db

    if not np.any(is_silent):
        return {
            "pause_count": 0,
            "total_pause_ratio": 0.0,
            "longest_pause_ms": 0.0,
        }

    pauses = []
    in_pause = False
    pause_len = 0
    for silent in is_silent:
        if silent:
            pause_len += 1
            in_pause = True
        else:
            if in_pause:
                pauses.append(pause_len)
            pause_len = 0
            in_pause = False
    if in_pause:
        pauses.append(pause_len)

    total_frames = len(is_silent)
    total_silent_frames = sum(pauses)

    return {
        "pause_count": len(pauses),
        "total_pause_ratio": total_silent_frames / total_frames if total_frames > 0 else 0.0,
        "longest_pause_ms": max(pauses) * frame_duration_ms if pauses else 0.0,
    }
