from fastapi import APIRouter, HTTPException
from api.models.schemas import (
    ClusterRequest,
    ClusterBatchRequest,
    ClusterResponse,
    ClusterResult,
)
from api.services.clustering_service import clustering_service

router = APIRouter(prefix="/clustering", tags=["Clustering"])


@router.post("/predict", response_model=ClusterResponse, summary="Predict cluster for a single comment")
def predict_single(body: ClusterRequest):
    """
    Assign **one** comment to a cluster.

    Returns:
    - **cluster_id** — integer cluster label (0-indexed)
    - **total_clusters** — total number of clusters in the trained model
    """
    try:
        results = clustering_service.predict([body.text])
        return ClusterResponse(
            results=[ClusterResult(**r) for r in results],
            total_clusters=clustering_service.n_clusters,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/predict/batch", response_model=ClusterResponse, summary="Predict clusters for multiple comments")
def predict_batch(body: ClusterBatchRequest):
    """
    Assign **multiple** comments to clusters in one call.
    More efficient than calling `/predict` many times.
    """
    try:
        results = clustering_service.predict(body.texts)
        return ClusterResponse(
            results=[ClusterResult(**r) for r in results],
            total_clusters=clustering_service.n_clusters,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
