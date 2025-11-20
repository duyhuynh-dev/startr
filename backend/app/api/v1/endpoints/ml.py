"""ML inference endpoints for embeddings, recommendations, and ranking."""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import Session

from app.core.config import settings
from app.db.session import get_session
from app.schemas.profile import BaseProfile

router = APIRouter()


class EmbeddingRequest(BaseModel):
    """Request for text embedding."""
    text: str = Field(..., description="Text to generate embedding for")


class EmbeddingResponse(BaseModel):
    """Response with embedding vector."""
    embedding: List[float] = Field(..., description="Embedding vector")
    dimension: int = Field(..., description="Dimension of the embedding vector")


class SimilarityRequest(BaseModel):
    """Request for similarity computation."""
    text1: str = Field(..., description="First text")
    text2: str = Field(..., description="Second text")


class SimilarityResponse(BaseModel):
    """Response with similarity score."""
    similarity: float = Field(..., description="Similarity score between 0 and 1")
    text1: str
    text2: str


class ProfileSimilarityRequest(BaseModel):
    """Request for profile similarity."""
    profile_id_1: str = Field(..., description="First profile ID")
    profile_id_2: str = Field(..., description="Second profile ID")


class ProfileSimilarityResponse(BaseModel):
    """Response with profile similarity score."""
    similarity: float = Field(..., description="Similarity score between 0 and 1")
    profile_id_1: str
    profile_id_2: str


class RankCandidatesRequest(BaseModel):
    """Request for ranking candidates."""
    profile_id: str = Field(..., description="Current user's profile ID")
    candidate_ids: List[str] = Field(..., description="List of candidate profile IDs")
    limit: Optional[int] = Field(None, description="Optional limit on results")


class RankedCandidate(BaseModel):
    """A ranked candidate profile."""
    profile: BaseProfile
    score: float = Field(..., description="Ranking score")


class RankCandidatesResponse(BaseModel):
    """Response with ranked candidates."""
    ranked_candidates: List[RankedCandidate] = Field(..., description="Candidates sorted by score")


@router.post(
    "/embeddings",
    response_model=EmbeddingResponse,
    summary="Generate text embedding",
    description="Generate a sentence transformer embedding for the given text.",
    tags=["ML"],
)
def generate_embedding(
    request: EmbeddingRequest,
) -> EmbeddingResponse:
    """Generate embedding for text."""
    if not settings.ml_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ML features are disabled",
        )
    
    try:
        from app.services.ml.embeddings import get_embedding_service
        
        embedding_service = get_embedding_service()
        if not embedding_service.is_available():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Embedding service not available. Install ML dependencies: pip install -e '.[ml]'",
            )
        
        embedding = embedding_service.embed_text(request.text)
        return EmbeddingResponse(
            embedding=embedding,
            dimension=len(embedding),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating embedding: {str(e)}",
        )


@router.post(
    "/similarity",
    response_model=SimilarityResponse,
    summary="Compute text similarity",
    description="Compute cosine similarity between two texts using embeddings.",
    tags=["ML"],
)
def compute_similarity(
    request: SimilarityRequest,
) -> SimilarityResponse:
    """Compute similarity between two texts."""
    if not settings.ml_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ML features are disabled",
        )
    
    try:
        from app.services.ml.embeddings import get_embedding_service
        
        embedding_service = get_embedding_service()
        if not embedding_service.is_available():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Embedding service not available. Install ML dependencies: pip install -e '.[ml]'",
            )
        
        embedding1 = embedding_service.embed_text(request.text1)
        embedding2 = embedding_service.embed_text(request.text2)
        similarity = embedding_service.compute_similarity(embedding1, embedding2)
        
        return SimilarityResponse(
            similarity=similarity,
            text1=request.text1,
            text2=request.text2,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error computing similarity: {str(e)}",
        )


@router.post(
    "/profiles/similarity",
    response_model=ProfileSimilarityResponse,
    summary="Compute profile similarity",
    description="Compute similarity between two profiles using ML embeddings.",
    tags=["ML"],
)
def compute_profile_similarity(
    request: ProfileSimilarityRequest,
    session: Session = Depends(get_session),
) -> ProfileSimilarityResponse:
    """Compute similarity between two profiles."""
    if not settings.ml_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ML features are disabled",
        )
    
    try:
        from app.models.profile import Profile
        from app.services.ml.recommendation import get_recommendation_engine
        from app.services.profile_cache import profile_cache_service
        
        # Get profiles
        profile1 = session.get(Profile, request.profile_id_1)
        profile2 = session.get(Profile, request.profile_id_2)
        
        if not profile1 or not profile2:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="One or both profiles not found",
            )
        
        # Convert to dicts
        profile1_dict = profile_cache_service._profile_to_base(profile1).model_dump()
        profile2_dict = profile_cache_service._profile_to_base(profile2).model_dump()
        
        # Compute similarity
        recommendation_engine = get_recommendation_engine()
        similarity = recommendation_engine.compute_profile_similarity(profile1_dict, profile2_dict)
        
        return ProfileSimilarityResponse(
            similarity=similarity,
            profile_id_1=request.profile_id_1,
            profile_id_2=request.profile_id_2,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error computing profile similarity: {str(e)}",
        )


@router.post(
    "/profiles/rank",
    response_model=RankCandidatesResponse,
    summary="Rank candidate profiles",
    description="Rank candidate profiles by similarity to a given profile using ML.",
    tags=["ML"],
)
def rank_candidates(
    request: RankCandidatesRequest,
    session: Session = Depends(get_session),
) -> RankCandidatesResponse:
    """Rank candidate profiles."""
    if not settings.ml_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ML features are disabled",
        )
    
    try:
        from app.models.profile import Profile
        from app.services.ml.recommendation import get_recommendation_engine
        from app.services.profile_cache import profile_cache_service
        
        # Get current profile
        current_profile = session.get(Profile, request.profile_id)
        if not current_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found",
            )
        
        # Get candidate profiles
        from sqlalchemy import select
        
        candidates = session.exec(
            select(Profile).where(Profile.id.in_(request.candidate_ids))
        ).all()
        
        if not candidates:
            return RankCandidatesResponse(ranked_candidates=[])
        
        # Convert to dicts
        current_profile_dict = profile_cache_service._profile_to_base(current_profile).model_dump()
        candidate_dicts = [
            profile_cache_service._profile_to_base(c).model_dump()
            for c in candidates
        ]
        
        # Rank candidates
        recommendation_engine = get_recommendation_engine()
        ranked = recommendation_engine.rank_candidates(
            current_profile_dict,
            candidate_dicts,
            limit=request.limit,
        )
        
        # Convert back to BaseProfile schemas
        ranked_candidates = []
        for candidate_dict, score in ranked:
            # Find corresponding profile object to ensure we have all fields
            profile_id = candidate_dict.get("id")
            profile = next((c for c in candidates if c.id == profile_id), None)
            if profile:
                base_profile = profile_cache_service._profile_to_base(profile)
                ranked_candidates.append(RankedCandidate(profile=base_profile, score=score))
        
        return RankCandidatesResponse(ranked_candidates=ranked_candidates)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error ranking candidates: {str(e)}",
        )

