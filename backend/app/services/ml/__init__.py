"""ML services for recommendation and ranking.

This package provides:
- Sentence transformer embeddings for semantic matching
- PyTorch-based recommendation engine
- Candidate generation and re-ranking pipelines
"""

from app.services.ml.embeddings import EmbeddingService, get_embedding_service
from app.services.ml.recommendation import RecommendationEngine, get_recommendation_engine
from app.services.ml.ranking import RerankingService, get_reranking_service

__all__ = [
    "EmbeddingService",
    "RecommendationEngine",
    "RerankingService",
    "get_embedding_service",
    "get_recommendation_engine",
    "get_reranking_service",
]

