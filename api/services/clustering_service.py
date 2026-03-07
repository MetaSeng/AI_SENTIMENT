"""
Clustering Service
------------------
Wraps the KMeans clustering model and Sentence Transformer encoder
that were trained/saved in Comment-clustering/flexible-clustering.ipynb.

All heavy objects are loaded ONCE and reused across requests.
"""

import os
import re
import logging
from typing import List, Dict

import joblib
import numpy as np
import emoji
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Paths (relative to project root)
# ─────────────────────────────────────────────────────────────────────────────
_BASE          = os.path.join(os.path.dirname(__file__), "..", "..", "Comment-clustering")
KMEANS_PATH    = os.path.join(_BASE, "kmeans_clustering_model.pkl")
TRANSFORMER_PATH = os.path.join(_BASE, "models", "sentence_transformer_local")

# Emoji → sentiment token map (must match training preprocessing)
EMOJI_SENTIMENT_MAP = {
    "crying_face":                "EMO_SAD",
    "loudly_crying_face":         "EMO_SAD",
    "broken_heart":               "EMO_SAD",
    "red_heart":                  "EMO_LOVE",
    "heart":                      "EMO_LOVE",
    "smiling_face_with_heart_eyes": "EMO_LOVE",
    "grinning_face":              "EMO_HAPPY",
    "smiling_face":               "EMO_HAPPY",
    "face_with_tears_of_joy":     "EMO_HAPPY",
    "angry_face":                 "EMO_ANGRY",
    "pouting_face":               "EMO_ANGRY",
}


# ─────────────────────────────────────────────────────────────────────────────
# Service class (singleton — loaded once at startup)
# ─────────────────────────────────────────────────────────────────────────────
class ClusteringService:
    def __init__(self):
        self.encoder      = None   # SentenceTransformer
        self.kmeans       = None   # trained KMeans
        self._use_khmer   = True   # set False if khmernltk not available

        # Try to import khmernltk (optional — graceful fallback)
        try:
            from khmernltk import word_tokenize as khmer_word_tokenize
            self._khmer_tokenize = khmer_word_tokenize
        except ImportError:
            logger.warning("khmernltk not found — Khmer segmentation disabled.")
            self._khmer_tokenize = None
            self._use_khmer      = False

    def load(self):
        """Load encoder + KMeans. Call this once at app startup."""
        logger.info("Loading Sentence Transformer for clustering…")
        if os.path.exists(TRANSFORMER_PATH):
            self.encoder = SentenceTransformer(TRANSFORMER_PATH)
            logger.info("Loaded local Sentence Transformer.")
        else:
            logger.warning("Local model not found — downloading from HuggingFace.")
            self.encoder = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")

        logger.info("Loading KMeans model…")
        if os.path.exists(KMEANS_PATH):
            self.kmeans = joblib.load(KMEANS_PATH)
            logger.info(f"KMeans loaded. Number of clusters: {self.kmeans.n_clusters}")
        else:
            logger.warning(
                f"KMeans model not found at {KMEANS_PATH}. "
                "Clustering endpoints will be unavailable until the model file is added."
            )
            self.kmeans = None

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _is_khmer(self, text: str) -> bool:
        if not isinstance(text, str) or len(text) == 0:
            return False
        khmer_chars = sum(1 for c in text if '\u1780' <= c <= '\u17FF')
        return (khmer_chars / len(text)) > 0.3

    def _khmer_segment(self, text: str) -> str:
        if self._use_khmer and self._khmer_tokenize and self._is_khmer(text):
            tokens = self._khmer_tokenize(text)
            return ' '.join(t for t in tokens if t.strip())
        return text

    def _clean(self, text: str) -> str:
        """Same cleaning pipeline as training notebook."""
        # Remove URLs
        text = re.sub(r'https?://\S+|www\.\S+', '', text)
        # Emoji → sentiment token
        text = emoji.demojize(text, delimiters=(" ", " "))
        for emoji_name, token in EMOJI_SENTIMENT_MAP.items():
            text = re.sub(rf"\b{emoji_name}\b", token, text)
        # Remove timestamps
        text = re.sub(r'\b\d{1,2}:\d{2}(:\d{2})?\b', '', text)
        # Khmer segmentation
        text = self._khmer_segment(text)
        return text.lower().strip()

    # ── Public API ────────────────────────────────────────────────────────────

    def predict(self, texts: List[str]) -> List[Dict]:
        """
        Predict cluster IDs for a list of raw texts.

        Returns a list of dicts: {"text": ..., "cluster_id": int}
        """
        if self.encoder is None or self.kmeans is None:
            raise RuntimeError("Clustering model is not loaded.")
        cleaned    = [self._clean(t) for t in texts]
        embeddings = self.encoder.encode(cleaned, convert_to_numpy=True, show_progress_bar=False)
        cluster_ids = self.kmeans.predict(embeddings)
        return [
            {"text": original, "cluster_id": int(cid)}
            for original, cid in zip(texts, cluster_ids)
        ]

    @property
    def n_clusters(self) -> int:
        return self.kmeans.n_clusters if self.kmeans else 0


# Singleton instance — imported by routes
clustering_service = ClusteringService()
