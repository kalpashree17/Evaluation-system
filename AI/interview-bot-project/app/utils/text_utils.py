"""
We need THREE different levels of text cleaning, because each downstream
consumer wants something different out of the same raw transcript:

1. clean_for_semantic()   -> SBERT/embeddings want natural sentences.
                             Only lowercase + normalize whitespace.
                             (Stripping words/punctuation actively hurts
                             embedding quality.)

2. deep_preprocess()      -> TF-IDF wants a classic bag-of-words:
                             lowercase, punctuation stripped, stopwords
                             removed, lemmatized. Returns a token list.

3. light_preprocess()     -> Keyword matching + negation detection need
                             punctuation stripped and words lemmatized,
                             but stopwords (like "not", "never") must be
                             KEPT, otherwise negation detection breaks.
                             Returns a token list.
"""

import re
import string

import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import word_tokenize

# Download quietly if not already present (safe to call every startup).
for pkg in ["punkt", "punkt_tab", "stopwords", "wordnet", "omw-1.4"]:
    try:
        nltk.data.find(pkg)
    except LookupError:
        nltk.download(pkg, quiet=True)

_STOPWORDS = set(stopwords.words("english"))
_LEMMATIZER = WordNetLemmatizer()


def clean_for_semantic(text: str) -> str:
    """Light cleaning that preserves sentence structure for SBERT/TF-IDF-source text."""
    if not text:
        return ""
    text = text.strip().lower()
    text = re.sub(r"\s+", " ", text)
    return text


def deep_preprocess(text: str) -> list[str]:
    """Full classical NLP pipeline -> used for TF-IDF vectors."""
    if not text:
        return []
    text = text.lower()
    text = text.translate(str.maketrans("", "", string.punctuation))
    tokens = word_tokenize(text)
    tokens = [t for t in tokens if t not in _STOPWORDS]
    tokens = [_LEMMATIZER.lemmatize(t) for t in tokens]
    return tokens


def light_preprocess(text: str) -> list[str]:
    """Punctuation stripped + lemmatized, but stopwords KEPT ->
    used for keyword/alias/fuzzy matching and negation detection."""
    if not text:
        return []
    text = text.lower()
    text = text.translate(str.maketrans("", "", string.punctuation))
    tokens = word_tokenize(text)
    tokens = [_LEMMATIZER.lemmatize(t) for t in tokens]
    return tokens
