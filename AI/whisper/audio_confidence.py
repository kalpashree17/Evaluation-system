"""
Audio Confidence Analysis — signal-processing pipeline that extracts
speaker-confidence features from raw audio.

Pipeline:
  1. Load audio (wav directly, webm/other via ffmpeg subprocess)
  2. Preprocessing: mono conversion, normalization, framing, Hamming windowing
  3. Feature extraction: pitch (F0), energy, spectral features, MFCCs, pauses
  4. Combine features into a single confidence score [0, 1]
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
SILENCE_DB_THRESHOLD = -40   # frames below this dB level count as silence
MIN_SPEECH_RATE_WPM = 60     # very slow speech → low confidence
MAX_SPEECH_RATE_WPM = 200    # very fast speech → low confidence
IDEAL_SPEECH_RATE_WPM = 140  # sweet spot for confident speech


# ── 0. Audio Loading ─────────────────────────────────────────────────────────

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
        # ffmpeg converts to 16-bit PCM wav, then we read that
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

    # resample to target rate if needed (linear interpolation — better than
    # nearest-neighbour for feature extraction; preserves waveform shape)
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


# ── 1. Preprocessing: Framing + Windowing ───────────────────────────────────

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
    frame_len = int(sr * FRAME_MS / 1000)   # e.g. 400 samples at 16 kHz
    hop_len = int(sr * HOP_MS / 1000)       # e.g. 160 samples at 16 kHz
    window = _hamming_window(frame_len)

    num_frames = max(1, (len(samples) - frame_len) // hop_len + 1)
    frames = np.zeros((num_frames, frame_len), dtype=np.float64)

    for i in range(num_frames):
        start = i * hop_len
        frame = samples[start : start + frame_len].copy()
        # pad last frame if short
        if len(frame) < frame_len:
            frame = np.pad(frame, (0, frame_len - len(frame)))
        frames[i] = frame * window

    return frames, sr


# ── 2. Feature Extraction ───────────────────────────────────────────────────

# 2a. Pitch (F0) via autocorrelation ─────────────────────────────────────────

def _estimate_pitch(frame: np.ndarray, sr: int) -> float:
    """
    Estimate fundamental frequency (F0) of a single frame using
    autocorrelation.  Returns frequency in Hz (0 if unvoiced).
    """
    if np.max(np.abs(frame)) < 1e-8:
        return 0.0

    # autocorrelation via FFT (much faster than direct for large N)
    n = len(frame)
    fft_size = 1
    while fft_size < 2 * n:
        fft_size *= 2
    fft_frame = np.fft.fft(frame, n=fft_size)
    acf = np.fft.ifft(fft_frame * np.conj(fft_frame)).real[:n]

    # normalise
    if acf[0] != 0:
        acf = acf / acf[0]

    # only look at lags corresponding to 60 Hz – 500 Hz (typical human voice)
    min_lag = max(1, int(sr / 500))
    max_lag = min(n - 1, int(sr / 60))

    if min_lag >= max_lag:
        return 0.0

    search_region = acf[min_lag : max_lag + 1]
    if len(search_region) == 0:
        return 0.0

    peak_idx = np.argmax(search_region)
    peak_val = search_region[peak_idx]

    # voiced/unvoiced decision — correlation must be strong enough
    if peak_val < 0.3:
        return 0.0

    # parabolic interpolation for sub-sample accuracy
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
    """Return F0 (Hz) for every frame. 0 = unvoiced."""
    return np.array([_estimate_pitch(f, sr) for f in frames])


def pitch_stability_score(f0: np.ndarray) -> float:
    """
    Score [0,1] — how stable the pitch contour is.
    High jitter (large frame-to-frame variation) → low score.
    """
    voiced = f0[f0 > 0]
    if len(voiced) < 2:
        return 0.5  # not enough voiced frames to judge

    # coefficient of variation of frame-to-frame differences
    diffs = np.abs(np.diff(voiced))
    mean_diff = np.mean(diffs)
    std_diff = np.std(diffs)

    # low mean_diff + low std_diff → stable → high score
    # normalise: a diff of 0 → score 1, a diff of 50 Hz → score ~0
    mean_penalty = np.clip(mean_diff / 50.0, 0, 1)
    std_penalty = np.clip(std_diff / 30.0, 0, 1)

    score = 1.0 - 0.6 * mean_penalty - 0.4 * std_penalty
    return float(np.clip(score, 0, 1))


def pitch_variation_score(f0: np.ndarray) -> float:
    """
    Score [0,1] — confident speech has natural pitch dynamics (F0 range).
    Monotone (tiny range) → low score.
    Moderate range (50-200 Hz) → high score.
    Extremely large range (>400 Hz) → slightly lower (nervous variability).
    """
    voiced = f0[f0 > 0]
    if len(voiced) < 3:
        return 0.5

    f0_range = float(np.max(voiced) - np.min(voiced))

    # ideal range is ~80-200 Hz for natural confident speech
    if f0_range < 30:
        score = 0.2 + (f0_range / 30.0) * 0.3   # very monotone
    elif f0_range < 80:
        score = 0.5 + ((f0_range - 30) / 50.0) * 0.3  # somewhat flat
    elif f0_range <= 200:
        score = 0.8 + ((f0_range - 80) / 120.0) * 0.2  # ideal range
    elif f0_range <= 400:
        score = 1.0 - ((f0_range - 200) / 200.0) * 0.2  # slightly penalise excess
    else:
        score = 0.6  # too much variation → nervous

    return float(np.clip(score, 0, 1))


# 2b. Energy / Amplitude ─────────────────────────────────────────────────────

def extract_energy(frames: np.ndarray) -> np.ndarray:
    """RMS energy per frame."""
    return np.sqrt(np.mean(frames ** 2, axis=1))


def energy_consistency_score(energy: np.ndarray) -> float:
    """
    Score [0,1] — consistent energy → confident.
    Large drops or spikes → less confident.
    """
    if len(energy) == 0:
        return 0.0

    mean_e = np.mean(energy)
    if mean_e < 1e-8:
        return 0.0

    # coefficient of variation
    cv = np.std(energy) / mean_e
    # low CV → high score.  CV of 0 → 1.0, CV of 1.0 → 0.0
    score = np.clip(1.0 - cv, 0, 1)
    return float(score)


# 2c. Spectral Features ──────────────────────────────────────────────────────

def _spectral_centroid(magnitude: np.ndarray, freqs: np.ndarray) -> float:
    """Weighted mean frequency — higher means more high-frequency content."""
    total = np.sum(magnitude)
    if total < 1e-12:
        return 0.0
    return float(np.sum(freqs * magnitude) / total)


def _spectral_rolloff(magnitude: np.ndarray, freqs: np.ndarray, percentile: float = 0.85) -> float:
    """Frequency below which `percentile` of energy is concentrated."""
    cumulative = np.cumsum(magnitude)
    total = cumulative[-1]
    if total < 1e-12:
        return 0.0
    idx = np.searchsorted(cumulative, percentile * total)
    idx = min(idx, len(freqs) - 1)
    return float(freqs[idx])


def _spectral_flatness(magnitude: np.ndarray) -> float:
    """Geometric mean / arithmetic mean — noise-like signals → ~1, tonal → ~0."""
    mag = magnitude[magnitude > 0]
    if len(mag) == 0:
        return 1.0
    log_mag = np.log(mag)
    geometric_mean = np.exp(np.mean(log_mag))
    arithmetic_mean = np.mean(mag)
    if arithmetic_mean < 1e-12:
        return 1.0
    return float(np.clip(geometric_mean / arithmetic_mean, 0, 1))


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
        spectrum = np.abs(np.fft.rfft(frame)) ** 2  # power spectrum

        centroids.append(_spectral_centroid(spectrum, freqs))
        rolloffs.append(_spectral_rolloff(spectrum, freqs))
        flatnesses.append(_spectral_flatness(spectrum))

        # mel filter-bank energies → log → DCT → MFCCs
        mel_energies = mel_filters @ spectrum
        mel_energies = np.maximum(mel_energies, 1e-12)
        log_mel = np.log(mel_energies)
        mfccs = _dct(log_mel)[:13]  # keep first 13 coefficients
        mfcc_matrix.append(mfccs)

    return {
        "centroid": np.array(centroids),
        "rolloff": np.array(rolloffs),
        "flatness": np.array(flatnesses),
        "mfccs": np.array(mfcc_matrix),   # shape: (num_frames, 13)
    }


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
    # outer product: (n, n)
    result = np.sum(x[np.newaxis, :] * np.cos(np.pi * k[:, np.newaxis] * (2 * np.arange(n)[np.newaxis, :] + 1) / (2 * n)), axis=1)
    return result


def spectral_stability_score(spectral: dict) -> float:
    """
    Score [0,1] — stable spectral features → confident.
    Measures frame-to-frame consistency of centroid, rolloff, and flatness.
    """
    scores = []
    for key in ("centroid", "rolloff", "flatness"):
        vals = spectral[key]
        if len(vals) < 2 or np.mean(vals) < 1e-8:
            scores.append(0.5)
            continue
        cv = np.std(vals) / (np.mean(vals) + 1e-12)
        scores.append(float(np.clip(1.0 - cv, 0, 1)))

    # MFCC stability: mean cosine similarity between consecutive frames
    mfccs = spectral["mfccs"]
    if len(mfccs) < 2:
        scores.append(0.5)
    else:
        norms = np.linalg.norm(mfccs, axis=1, keepdims=True)
        norms = np.maximum(norms, 1e-12)
        normed = mfccs / norms
        cos_sims = np.sum(normed[:-1] * normed[1:], axis=1)
        scores.append(float(np.clip(np.mean(cos_sims), 0, 1)))

    # weighted average of sub-scores
    weights = [0.25, 0.25, 0.20, 0.30]
    return float(np.clip(np.average(scores, weights=weights), 0, 1))


# 2d. Pause Detection ────────────────────────────────────────────────────────

def detect_pauses(energy: np.ndarray, sr: int) -> dict:
    """
    Detect silent regions and compute pause statistics.

    Returns:
        pause_count:          number of silent segments
        total_pause_ratio:   fraction of audio that is silent
        longest_pause_ms:    duration of longest silent segment in ms
    """
    frame_duration_ms = HOP_MS
    is_silent = energy < (10 ** (SILENCE_DB_THRESHOLD / 20))

    if not np.any(is_silent):
        return {
            "pause_count": 0,
            "total_pause_ratio": 0.0,
            "longest_pause_ms": 0.0,
        }

    # find contiguous silent regions
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


def pause_score(pause_info: dict, audio_duration_ms: float) -> float:
    """
    Score [0,1] — fewer/shorter pauses → higher confidence.
    Very long pauses or very high pause ratio → lower score.
    """
    if audio_duration_ms <= 0:
        return 0.5

    ratio = pause_info["total_pause_ratio"]
    longest_ms = pause_info["longest_pause_ms"]
    count = pause_info["pause_count"]

    # ratio penalty: 0% silence → 1.0, >40% silence → 0.0
    ratio_score = np.clip(1.0 - ratio / 0.4, 0, 1)

    # longest pause penalty: <500ms → 1.0, >3000ms → 0.0
    longest_score = np.clip(1.0 - (longest_ms - 500) / 2500, 0, 1)

    # count penalty: penalise many short pauses (stuttering/hesitation)
    # expected pauses ≈ sentence count, roughly 1 per 5 seconds of speech
    expected_pauses = max(1, audio_duration_ms / 5000)
    count_ratio = count / expected_pauses
    count_score = np.clip(1.0 - (count_ratio - 1.0) / 3.0, 0, 1)

    return float(np.clip(
        0.4 * ratio_score + 0.35 * longest_score + 0.25 * count_score,
        0, 1,
    ))


# 2e. Filler Word Detection ──────────────────────────────────────────────────

FILLER_WORDS = {
    "um", "uh", "erm", "ehm", "hmm", "mm",
    "like", "you know", "i mean", "sort of", "kind of",
    "basically", "actually", "right", "so",
    "well", "ah", "oh",
}


def filler_word_score(text: str) -> float:
    """
    Score [0,1] — fewer filler words → higher confidence.
    Counts filler words relative to total word count.
    """
    if not text or not text.strip():
        return 0.5

    words = text.lower().split()
    total_words = len(words)
    if total_words == 0:
        return 0.5

    # count single-word fillers
    filler_count = sum(1 for w in words if w.strip(".,!?;:") in FILLER_WORDS)

    # count multi-word fillers
    text_lower = text.lower()
    for phrase in ("you know", "i mean", "sort of", "kind of"):
        filler_count += text_lower.count(phrase)

    filler_ratio = filler_count / total_words

    # 0 fillers → 1.0, ~5% fillers → 0.5, >15% → 0.0
    score = 1.0 - (filler_ratio / 0.15) * 1.0
    return float(np.clip(score, 0, 1))


# 2f. Speaking Fluency ───────────────────────────────────────────────────────

def fluency_score(text: str) -> float:
    """
    Score [0,1] — penalises repetitions, false starts, and incomplete phrases.
    """
    if not text or not text.strip():
        return 0.5

    words = text.lower().split()
    total_words = len(words)
    if total_words < 3:
        return 0.7

    penalties = 0.0

    # 1. Consecutive word repetitions ("I I I think")
    for i in range(1, total_words):
        if words[i] == words[i - 1] and len(words[i]) > 1:
            penalties += 1.0

    # 2. Phrase repetitions ("I think I think")
    phrase_len = min(3, total_words // 3)
    if phrase_len >= 2:
        seen_phrases = {}
        for i in range(total_words - phrase_len + 1):
            phrase = " ".join(words[i : i + phrase_len])
            seen_phrases[phrase] = seen_phrases.get(phrase, 0) + 1
        for count in seen_phrases.values():
            if count > 1:
                penalties += (count - 1) * 0.5

    # 3. Incomplete phrases (ending with filler or very short trailing fragment)
    trailing_fillers = sum(
        1 for w in words[-3:]
        if w.strip(".,!?;:") in FILLER_WORDS
    )
    if trailing_fillers > 0:
        penalties += trailing_fillers * 0.3

    # normalise penalty per 100 words
    penalty_rate = (penalties / total_words) * 100
    score = 1.0 - (penalty_rate / 15.0)  # 15 penalties per 100 words → 0
    return float(np.clip(score, 0, 1))


# 2g. Speech Rate ────────────────────────────────────────────────────────────

def speech_rate_score(word_timestamps: list[dict], audio_duration_ms: float) -> float:
    """
    Score [0,1] based on words-per-minute.

    word_timestamps: list of dicts with 'start' and 'end' keys (seconds)
                     as returned by faster-whisper segments.
    audio_duration_ms: total duration of the audio in milliseconds.
    """
    if not word_timestamps or audio_duration_ms <= 0:
        return 0.5

    speech_duration_s = sum(
        w["end"] - w["start"] for w in word_timestamps
        if w["end"] > w["start"]
    )

    if speech_duration_s <= 0:
        return 0.0

    word_count = len(word_timestamps)
    wpm = (word_count / speech_duration_s) * 60

    # score peaks at IDEAL_SPEECH_RATE_WPM, drops off linearly
    deviation = abs(wpm - IDEAL_SPEECH_RATE_WPM)
    if wpm < MIN_SPEECH_RATE_WPM:
        return 0.2  # too slow — struggling
    if wpm > MAX_SPEECH_RATE_WPM:
        return 0.3  # too fast — nervous / rushing

    # within range: score = 1.0 at ideal, drops to 0.4 at edges
    max_dev = max(IDEAL_SPEECH_RATE_WPM - MIN_SPEECH_RATE_WPM,
                  MAX_SPEECH_RATE_WPM - IDEAL_SPEECH_RATE_WPM)
    score = 1.0 - 0.6 * (deviation / max_dev)
    return float(np.clip(score, 0, 1))


# ── 3. Confidence Fusion ────────────────────────────────────────────────────

def compute_confidence(
    speech_rate: float,
    pause: float,
    filler_word: float,
    pitch_variation: float,
    energy_stability: float,
    silence_ratio: float,
    fluency: float,
) -> dict:
    """
    Combine all sub-scores into a single confidence score using
    research-informed weights:

        Speech Rate            25%
        Pause Score            20%
        Filler Word Score      20%
        Pitch Variation (F0)   15%
        Energy Stability (RMS) 10%
        Silence Ratio           5%
        Speaking Fluency        5%
    """
    weights = {
        "speech_rate":        0.25,
        "pause_score":        0.20,
        "filler_word_score":  0.20,
        "pitch_variation":    0.15,
        "energy_stability":   0.10,
        "silence_ratio":      0.05,
        "speaking_fluency":   0.05,
    }

    sub_scores = {
        "speech_rate":        speech_rate,
        "pause_score":        pause,
        "filler_word_score":  filler_word,
        "pitch_variation":    pitch_variation,
        "energy_stability":   energy_stability,
        "silence_ratio":      silence_ratio,
        "speaking_fluency":   fluency,
    }

    combined = sum(weights[k] * sub_scores[k] for k in weights)

    return {
        "confidence_score": round(float(np.clip(combined, 0, 1)), 4),
        "confidence_breakdown": {k: round(v, 4) for k, v in sub_scores.items()},
    }


# ── 4. Public API ───────────────────────────────────────────────────────────

def analyze_audio_confidence(
    audio_path: str,
    word_timestamps: list[dict] | None = None,
    text: str | None = None,
) -> dict:
    """
    Full pipeline: load → preprocess → extract features → compute confidence.

    Args:
        audio_path:       path to any audio file (wav, webm, mp3, etc.)
        word_timestamps:  optional list of {'start': float, 'end': float}
                          from faster-whisper segments (used for speech rate).
        text:             transcript text (used for filler-word and fluency scoring).

    Returns:
        dict with 'confidence_score' (float 0-1) and 'confidence_breakdown'.
    """
    # load & preprocess
    samples, sr = load_audio(audio_path)
    frames, sr = frame_signal(samples, sr)

    # extract features
    f0 = extract_pitch_contour(frames, sr)
    energy = extract_energy(frames)
    spectral = extract_spectral_features(frames, sr)
    pauses = detect_pauses(energy, sr)

    audio_duration_ms = len(samples) / sr * 1000

    # ── compute all 7 sub-scores ─────────────────────────────────────────────
    # 1. Speech Rate (25%)
    if word_timestamps:
        rate = speech_rate_score(word_timestamps, audio_duration_ms=audio_duration_ms)
    else:
        rate = 0.5

    # 2. Pause Score (20%)
    pa = pause_score(pauses, audio_duration_ms=audio_duration_ms)

    # 3. Filler Word Score (20%)
    fw = filler_word_score(text) if text else 0.5

    # 4. Pitch Variation / F0 Range (15%)
    pv = pitch_variation_score(f0)

    # 5. Energy Stability / RMS (10%)
    es = energy_consistency_score(energy)

    # 6. Silence Ratio (5%)  — inverse of pause ratio; less silence → higher score
    sr_score = float(np.clip(1.0 - pauses["total_pause_ratio"], 0, 1))

    # 7. Speaking Fluency (5%)
    fl = fluency_score(text) if text else 0.5

    # fuse
    result = compute_confidence(rate, pa, fw, pv, es, sr_score, fl)

    # attach raw features for debugging / future use
    voiced = f0[f0 > 0]
    result["raw_features"] = {
        "pitch_mean_hz": round(float(np.mean(voiced)) if len(voiced) > 0 else 0, 2),
        "pitch_std_hz": round(float(np.std(voiced)) if len(voiced) > 0 else 0, 2),
        "pitch_range_hz": round(float(np.max(voiced) - np.min(voiced)) if len(voiced) > 0 else 0, 2),
        "energy_mean": round(float(np.mean(energy)), 6),
        "energy_std": round(float(np.std(energy)), 6),
        "silence_ratio": round(pauses["total_pause_ratio"], 4),
        "pause_count": pauses["pause_count"],
        "longest_pause_ms": round(pauses["longest_pause_ms"], 1),
        "num_voiced_frames": int(np.sum(f0 > 0)),
        "total_frames": len(f0),
    }

    return result
