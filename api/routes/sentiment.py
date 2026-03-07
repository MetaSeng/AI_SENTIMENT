from fastapi import APIRouter, HTTPException
from api.models.schemas import (
    SentimentRequest,
    SentimentBatchRequest,
    SentimentResponse,
    SentimentResult,
)
from api.services.sentiment_service import sentiment_service

router = APIRouter(prefix="/sentiment", tags=["Sentiment"])


@router.post("/predict", response_model=SentimentResponse, summary="Predict sentiment for a single comment")
def predict_single(body: SentimentRequest):
    """
    Analyse the sentiment of **one** comment.

    Returns:
    - **label** — Positive / Neutral / Negative
    - **confidence** — model confidence (0–1)
    - **scores** — per-class probabilities
    - **language_tag** — detected language tag (e.g. KM, EN)
    """
    try:
        results = sentiment_service.predict([body.text])
        return SentimentResponse(
            results=[SentimentResult(**r) for r in results]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/predict/batch", response_model=SentimentResponse, summary="Predict sentiment for multiple comments")
def predict_batch(body: SentimentBatchRequest):
    """
    Analyse the sentiment of **multiple** comments in one call.
    More efficient than calling `/predict` many times.
    """
    try:
        results = sentiment_service.predict(body.texts, batch_size=body.batch_size)
        return SentimentResponse(
            results=[SentimentResult(**r) for r in results]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
