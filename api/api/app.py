"""
Main FastAPI Application
─────────────────────────
ML API that exposes:
  POST /sentiment/predict          — single comment sentiment
  POST /sentiment/predict/batch    — batch sentiment
  POST /clustering/predict         — single comment clustering
  POST /clustering/predict/batch   — batch clustering

Start with:
    uvicorn api.app:app --reload --host 0.0.0.0 --port 8000
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import sentiment as sentiment_router
from api.routes import clustering as clustering_router
from api.services.sentiment_service import sentiment_service
from api.services.clustering_service import clustering_service

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Lifespan — load all ML models once when the server boots
# ─────────────────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Loading ML models…")
    sentiment_service.load()
    clustering_service.load()
    logger.info("✅ All models ready. API is accepting requests.")
    yield
    logger.info("🛑 Shutting down API.")


# ─────────────────────────────────────────────────────────────────────────────
# App
# ─────────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Project Management — Sentiment & Clustering API",
    description=(
        "Analyse Facebook comments in **Khmer** and **English**.\n\n"
        "- `/sentiment/*` — XLM-RoBERTa fine-tuned on Khmer data\n"
        "- `/clustering/*` — KMeans + multilingual Sentence Transformer"
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# Allow the frontend (any origin during development) to call this API.
# In production, replace "*" with the actual frontend URL.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────────────────────
# Routers
# ─────────────────────────────────────────────────────────────────────────────
app.include_router(sentiment_router.router)
app.include_router(clustering_router.router)


# ─────────────────────────────────────────────────────────────────────────────
# Health check
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "message": "Sentiment & Clustering API is running."}


@app.get("/health", tags=["Health"])
def health():
    return {
        "status": "ok",
        "sentiment_model_loaded": sentiment_service.xlmr_model is not None,
        "clustering_model_loaded": clustering_service.kmeans is not None,
    }
