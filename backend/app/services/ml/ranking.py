"""Re-ranking service that combines ML embeddings with diligence scores and user behavior."""

from __future__ import annotations

import logging
from typing import Dict, List, Optional, Tuple

from app.core.config import settings
from app.services.ml.recommendation import get_recommendation_engine

logger = logging.getLogger(__name__)


class RerankingService:
    """Re-ranks profiles by combining multiple signals:
    - ML embedding similarity
    - Due diligence scores
    - User engagement signals (likes, views, matches)
    """

    def __init__(self):
        """Initialize the reranking service."""
        self.recommendation_engine = get_recommendation_engine()

    def rerank_profiles(
        self,
        current_profile: dict,
        candidate_profiles: List[dict],
        diligence_scores: Optional[Dict[str, float]] = None,
        engagement_signals: Optional[Dict[str, Dict[str, float]]] = None,
        limit: Optional[int] = None,
    ) -> List[Tuple[dict, float]]:
        """Re-rank candidate profiles using a weighted combination of signals.
        
        Args:
            current_profile: Current user's profile data
            candidate_profiles: List of candidate profile data dicts
            diligence_scores: Optional dict mapping profile_id -> diligence score (0-1)
            engagement_signals: Optional dict mapping profile_id -> engagement metrics
                e.g., {"profile_id": {"likes": 10, "views": 50, "match_rate": 0.15}}
            limit: Optional limit on number of results
            
        Returns:
            List of (profile_data, final_score) tuples sorted by score descending
        """
        if not candidate_profiles:
            return []
        
        # Default weights from config
        similarity_weight = settings.ml_similarity_weight
        diligence_weight = settings.ml_diligence_weight
        engagement_weight = settings.ml_engagement_weight
        
        # Normalize weights to sum to 1.0
        total_weight = similarity_weight + diligence_weight + engagement_weight
        if total_weight > 0:
            similarity_weight /= total_weight
            diligence_weight /= total_weight
            engagement_weight /= total_weight
        else:
            # Fallback: equal weights
            similarity_weight = diligence_weight = engagement_weight = 1.0 / 3.0
        
        scored_profiles = []
        
        for candidate in candidate_profiles:
            profile_id = candidate.get("id")
            if not profile_id:
                continue
            
            # 1. ML similarity score
            similarity_score = self._get_similarity_score(current_profile, candidate)
            
            # 2. Diligence score (default to 0.5 if not provided)
            diligence_score = 0.5
            if diligence_scores and profile_id in diligence_scores:
                diligence_score = diligence_scores[profile_id]
                # Ensure in [0, 1] range
                diligence_score = max(0.0, min(1.0, diligence_score))
            
            # 3. Engagement score (default to 0.0)
            engagement_score = self._compute_engagement_score(
                profile_id, engagement_signals
            )
            
            # Weighted combination
            final_score = (
                similarity_score * similarity_weight +
                diligence_score * diligence_weight +
                engagement_score * engagement_weight
            )
            
            scored_profiles.append((candidate, final_score))
        
        # Sort by final score (descending)
        scored_profiles.sort(key=lambda x: x[1], reverse=True)
        
        if limit:
            return scored_profiles[:limit]
        return scored_profiles

    def _get_similarity_score(self, current_profile: dict, candidate_profile: dict) -> float:
        """Get ML-based similarity score."""
        try:
            return self.recommendation_engine.compute_profile_similarity(
                current_profile, candidate_profile
            )
        except Exception as e:
            logger.error(f"Error computing similarity score: {e}")
            return 0.0

    def _compute_engagement_score(
        self,
        profile_id: str,
        engagement_signals: Optional[Dict[str, Dict[str, float]]] = None,
    ) -> float:
        """Compute normalized engagement score from user behavior signals.
        
        Engagement is computed from:
        - Number of likes received (normalized)
        - Number of views (normalized)
        - Match rate (likes that resulted in matches)
        
        Returns a score between 0 and 1.
        """
        if not engagement_signals or profile_id not in engagement_signals:
            return 0.0
        
        signals = engagement_signals[profile_id]
        
        # Normalize each signal to [0, 1] range
        likes = signals.get("likes", 0.0)
        views = signals.get("views", 0.0)
        match_rate = signals.get("match_rate", 0.0)  # Already 0-1
        
        # Normalize likes (assume max is ~100 for normalization)
        likes_normalized = min(1.0, likes / 100.0) if likes > 0 else 0.0
        
        # Normalize views (assume max is ~1000 for normalization)
        views_normalized = min(1.0, views / 1000.0) if views > 0 else 0.0
        
        # Weighted combination (match rate is most important)
        engagement_score = (
            match_rate * 0.5 +
            likes_normalized * 0.3 +
            views_normalized * 0.2
        )
        
        return max(0.0, min(1.0, engagement_score))

    def compute_match_reasons(
        self,
        current_profile: dict,
        candidate_profile: dict,
        diligence_data: Optional[dict] = None,
    ) -> List[str]:
        """Generate human-readable reasons why profiles might be a good match.
        
        Args:
            current_profile: Current user's profile
            candidate_profile: Candidate profile
            diligence_data: Optional diligence summary data
            
        Returns:
            List of match reason strings (e.g., "Strong sector alignment", "High diligence score")
        """
        reasons = []
        
        # Check role-specific alignment
        if current_profile.get("role") == "investor" and candidate_profile.get("role") == "founder":
            # Sector alignment
            investor_sectors = set(current_profile.get("focus_sectors", []))
            # For founders, we might infer sector from company/prompts
            if investor_sectors:
                reasons.append(f"Interested in {', '.join(list(investor_sectors)[:2])}")
            
            # Stage alignment
            investor_stages = set(current_profile.get("focus_stages", []))
            if investor_stages:
                reasons.append(f"Focuses on {', '.join(list(investor_stages)[:2])} stage")
            
            # Check size
            check_min = current_profile.get("check_size_min")
            check_max = current_profile.get("check_size_max")
            revenue = candidate_profile.get("revenue_run_rate")
            if check_min and check_max and revenue:
                if check_min <= revenue <= check_max:
                    reasons.append("Check size aligns with revenue")
        
        # Diligence score
        if diligence_data:
            diligence_score = diligence_data.get("overall_score", 0.0)
            if diligence_score >= 0.8:
                reasons.append("High diligence score")
            elif diligence_score >= 0.6:
                reasons.append("Good diligence metrics")
        
        # Similarity-based
        try:
            similarity = self.recommendation_engine.compute_profile_similarity(
                current_profile, candidate_profile
            )
            if similarity >= 0.7:
                reasons.append("Strong profile similarity")
            elif similarity >= 0.5:
                reasons.append("Similar interests and focus")
        except Exception:
            pass
        
        return reasons[:3]  # Return top 3 reasons


# Global instance
_reranking_service: Optional[RerankingService] = None


def get_reranking_service() -> RerankingService:
    """Get or create the global reranking service instance."""
    global _reranking_service
    if _reranking_service is None:
        _reranking_service = RerankingService()
    return _reranking_service

