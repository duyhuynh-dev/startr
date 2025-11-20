"""PyTorch-based recommendation engine for profile matching."""

from __future__ import annotations

import logging
from typing import Dict, List, Optional, Tuple

try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    torch = None
    nn = None
    F = None

from app.core.config import settings
from app.services.ml.embeddings import get_embedding_service

logger = logging.getLogger(__name__)


class RecommendationEngine:
    """PyTorch-based recommendation engine using embeddings for similarity matching."""

    def __init__(self):
        """Initialize the recommendation engine."""
        self.embedding_service = get_embedding_service()
        self.device = "cpu"
        
        if TORCH_AVAILABLE:
            if torch.cuda.is_available():
                self.device = "cuda"
            elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                self.device = "mps"  # Apple Silicon
        
        if not settings.ml_enabled:
            logger.info("ML features are disabled in config")
    
    def compute_profile_similarity(
        self,
        profile_a_data: dict,
        profile_b_data: dict,
    ) -> float:
        """Compute similarity score between two profiles using embeddings.
        
        Args:
            profile_a_data: First profile data dict
            profile_b_data: Second profile data dict
            
        Returns:
            Similarity score between 0 and 1
        """
        if not settings.ml_enabled or not self.embedding_service.is_available():
            return 0.0
        
        try:
            # Generate embeddings for both profiles
            embedding_a = self.embedding_service.embed_profile_text(profile_a_data)
            embedding_b = self.embedding_service.embed_profile_text(profile_b_data)
            
            # Compute cosine similarity
            similarity = self.embedding_service.compute_similarity(embedding_a, embedding_b)
            return similarity
        except Exception as e:
            logger.error(f"Error computing profile similarity: {e}")
            return 0.0

    def compute_prompt_similarity(
        self,
        prompt_a: str,
        prompt_b: str,
    ) -> float:
        """Compute similarity between two prompt responses using embeddings.
        
        Args:
            prompt_a: First prompt response text
            prompt_b: Second prompt response text
            
        Returns:
            Similarity score between 0 and 1
        """
        if not settings.ml_enabled or not self.embedding_service.is_available():
            return 0.0
        
        try:
            embedding_a = self.embedding_service.embed_text(prompt_a)
            embedding_b = self.embedding_service.embed_text(prompt_b)
            return self.embedding_service.compute_similarity(embedding_a, embedding_b)
        except Exception as e:
            logger.error(f"Error computing prompt similarity: {e}")
            return 0.0

    def rank_candidates(
        self,
        current_profile: dict,
        candidate_profiles: List[dict],
        limit: Optional[int] = None,
    ) -> List[Tuple[dict, float]]:
        """Rank candidate profiles by similarity to current profile.
        
        Args:
            current_profile: The current user's profile data
            candidate_profiles: List of candidate profile data dicts
            limit: Optional limit on number of results
            
        Returns:
            List of tuples (profile_data, similarity_score) sorted by score descending
        """
        if not settings.ml_enabled or not self.embedding_service.is_available():
            # Fallback: return candidates in original order with 0.0 scores
            return [(p, 0.0) for p in candidate_profiles[:limit] if limit else candidate_profiles]
        
        if not candidate_profiles:
            return []
        
        try:
            # Generate embedding for current profile once
            current_embedding = self.embedding_service.embed_profile_text(current_profile)
            
            # Generate embeddings for all candidates (batch for efficiency)
            candidate_texts = [
                self._profile_to_text(p) for p in candidate_profiles
            ]
            candidate_embeddings = self.embedding_service.embed_batch(candidate_texts)
            
            # Compute similarities
            scored_candidates = []
            for candidate_profile, candidate_embedding in zip(
                candidate_profiles, candidate_embeddings
            ):
                similarity = self.embedding_service.compute_similarity(
                    current_embedding, candidate_embedding
                )
                scored_candidates.append((candidate_profile, similarity))
            
            # Sort by similarity (descending)
            scored_candidates.sort(key=lambda x: x[1], reverse=True)
            
            if limit:
                return scored_candidates[:limit]
            return scored_candidates
            
        except Exception as e:
            logger.error(f"Error ranking candidates: {e}")
            # Fallback: return original order
            return [(p, 0.0) for p in candidate_profiles[:limit] if limit else candidate_profiles]

    def find_similar_profiles(
        self,
        target_profile: dict,
        candidate_profiles: List[dict],
        similarity_threshold: float = 0.5,
        top_k: int = 10,
    ) -> List[Tuple[dict, float]]:
        """Find profiles similar to target profile above a threshold.
        
        Args:
            target_profile: Profile to find matches for
            candidate_profiles: List of candidate profiles
            similarity_threshold: Minimum similarity score (0-1)
            top_k: Maximum number of results
            
        Returns:
            List of (profile, similarity_score) tuples above threshold
        """
        ranked = self.rank_candidates(target_profile, candidate_profiles, limit=None)
        filtered = [(p, score) for p, score in ranked if score >= similarity_threshold]
        return filtered[:top_k]

    @staticmethod
    def _profile_to_text(profile: dict) -> str:
        """Convert profile dict to text for embedding."""
        text_parts = []
        
        if profile.get("full_name"):
            text_parts.append(profile["full_name"])
        if profile.get("headline"):
            text_parts.append(profile["headline"])
        if profile.get("location"):
            text_parts.append(profile["location"])
        
        # Prompts
        prompts = profile.get("prompts", [])
        if isinstance(prompts, list):
            for prompt in prompts:
                if isinstance(prompt, dict) and prompt.get("content"):
                    text_parts.append(prompt["content"])
        
        # Role-specific
        if profile.get("role") == "investor":
            if profile.get("firm"):
                text_parts.append(profile["firm"])
            if profile.get("focus_sectors"):
                text_parts.extend(profile["focus_sectors"])
            if profile.get("focus_stages"):
                text_parts.extend(profile["focus_stages"])
        elif profile.get("role") == "founder":
            if profile.get("company_name"):
                text_parts.append(profile["company_name"])
            if profile.get("focus_markets"):
                text_parts.extend(profile["focus_markets"])
        
        return " ".join(text_parts)


# Global instance
_recommendation_engine: Optional[RecommendationEngine] = None


def get_recommendation_engine() -> RecommendationEngine:
    """Get or create the global recommendation engine instance."""
    global _recommendation_engine
    if _recommendation_engine is None:
        _recommendation_engine = RecommendationEngine()
    return _recommendation_engine

