from pydantic import BaseModel, Field
from typing import List, Optional


# ─────────────────────────────────────────────────────────────────────────────
# Sentiment Schemas
# ─────────────────────────────────────────────────────────────────────────────

class SentimentRequest(BaseModel):
    """Single-text sentiment request."""
    text: str = Field(..., min_length=1, description="Comment text to analyse")

    model_config = {
        "json_schema_extra": {
            "examples": [{"text": "Smart ល្អណាស់ ប្រើបានស្រួល"}]
        }
    }


class SentimentBatchRequest(BaseModel):
    """Batch sentiment request (multiple texts at once)."""
    texts: List[str] = Field(..., min_length=1, description="List of comment texts")
    batch_size: int = Field(16, ge=1, le=64, description="Inference batch size")


class SentimentResult(BaseModel):
    """Prediction for one text."""
    text: str
    label: str                  # "Positive" | "Neutral" | "Negative"
    confidence: float           # 0-1
    scores: dict                # {"positive": float, "neutral": float, "negative": float}
    language_tag: Optional[str] # language detected by CharCNN (e.g. "KM")


class SentimentResponse(BaseModel):
    results: List[SentimentResult]


# ─────────────────────────────────────────────────────────────────────────────
# Clustering Schemas
# ─────────────────────────────────────────────────────────────────────────────

class ClusterRequest(BaseModel):
    """Single-text clustering request."""
    text: str = Field(..., min_length=1, description="Comment text to cluster")

    model_config = {
        "json_schema_extra": {
            "examples": [{"text": "តម្លៃថ្លៃពេក ប្រើមិនសូវឃើញថ្ងៃ"}]
        }
    }


class ClusterBatchRequest(BaseModel):
    """Batch clustering request."""
    texts: List[str] = Field(..., min_length=1, description="List of comment texts")


class ClusterResult(BaseModel):
    """Cluster prediction for one text."""
    text: str
    cluster_id: int


class ClusterResponse(BaseModel):
    results: List[ClusterResult]
    total_clusters: int         # total number of clusters the model knows about
