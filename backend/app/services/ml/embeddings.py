"""Sentence transformer embeddings for semantic profile/prompt matching."""

from __future__ import annotations

import logging
from typing import List, Optional

try:
    from sentence_transformers import SentenceTransformer
    import torch
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False
    SentenceTransformer = None
    torch = None

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Service for generating embeddings using sentence transformers."""

    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        """Initialize the embedding service.
        
        Args:
            model_name: HuggingFace model name. Default is 'all-MiniLM-L6-v2'
                (lightweight, fast). Alternatives: 'all-mpnet-base-v2' (better quality),
                'instructor-xl' (requires custom training).
        """
        self.model_name = model_name
        self.model: Optional[SentenceTransformer] = None
        self.device = "cpu"
        
        if not SENTENCE_TRANSFORMERS_AVAILABLE:
            logger.warning(
                "sentence-transformers or torch not installed. "
                "Install with: pip install -e '.[ml]'"
            )
            return
        
        try:
            # Detect device
            if torch and torch.cuda.is_available():
                self.device = "cuda"
            elif torch and hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                self.device = "mps"  # Apple Silicon
            
            logger.info(f"Loading sentence transformer model: {model_name} on {self.device}")
            self.model = SentenceTransformer(model_name, device=self.device)
            logger.info(f"✓ Model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}")
            self.model = None

    def embed_text(self, text: str) -> List[float]:
        """Generate embedding for a single text string.
        
        Args:
            text: Input text to embed
            
        Returns:
            List of floats representing the embedding vector
        """
        if not self.model:
            logger.warning("Model not available, returning zero vector")
            # Return zero vector of typical embedding size (384 for all-MiniLM-L6-v2)
            return [0.0] * 384
        
        try:
            embedding = self.model.encode(text, convert_to_numpy=True, normalize_embeddings=True)
            return embedding.tolist()
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            return [0.0] * 384

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for a batch of texts (more efficient).
        
        Args:
            texts: List of input texts to embed
            
        Returns:
            List of embedding vectors (each is a list of floats)
        """
        if not self.model:
            logger.warning("Model not available, returning zero vectors")
            return [[0.0] * 384] * len(texts)
        
        if not texts:
            return []
        
        try:
            embeddings = self.model.encode(
                texts,
                batch_size=32,
                convert_to_numpy=True,
                normalize_embeddings=True,
                show_progress_bar=False,
            )
            return embeddings.tolist()
        except Exception as e:
            logger.error(f"Error generating batch embeddings: {e}")
            return [[0.0] * 384] * len(texts)

    def embed_profile_text(self, profile_data: dict) -> List[float]:
        """Generate a single embedding for a profile by combining its text fields.
        
        Combines:
        - Full name
        - Headline
        - Location
        - Prompt responses (content)
        - Focus sectors/stages (for investors)
        - Company info (for founders)
        
        Args:
            profile_data: Profile dict with fields like full_name, headline, prompts, etc.
            
        Returns:
            Combined embedding vector for the profile
        """
        text_parts = []
        
        # Basic info
        if profile_data.get("full_name"):
            text_parts.append(profile_data["full_name"])
        if profile_data.get("headline"):
            text_parts.append(profile_data["headline"])
        if profile_data.get("location"):
            text_parts.append(profile_data["location"])
        
        # Prompts (semantic content)
        prompts = profile_data.get("prompts", [])
        if isinstance(prompts, list):
            for prompt in prompts:
                if isinstance(prompt, dict) and prompt.get("content"):
                    text_parts.append(prompt["content"])
        
        # Role-specific fields
        if profile_data.get("role") == "investor":
            if profile_data.get("firm"):
                text_parts.append(profile_data["firm"])
            if profile_data.get("focus_sectors"):
                text_parts.extend(profile_data["focus_sectors"])
            if profile_data.get("focus_stages"):
                text_parts.extend(profile_data["focus_stages"])
        elif profile_data.get("role") == "founder":
            if profile_data.get("company_name"):
                text_parts.append(profile_data["company_name"])
            if profile_data.get("focus_markets"):
                text_parts.extend(profile_data["focus_markets"])
        
        # Combine all text parts
        combined_text = " ".join(text_parts)
        
        if not combined_text.strip():
            logger.warning("Empty profile text, returning zero vector")
            return [0.0] * 384
        
        return self.embed_text(combined_text)

    def compute_similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
        """Compute cosine similarity between two embeddings.
        
        Args:
            embedding1: First embedding vector
            embedding2: Second embedding vector
            
        Returns:
            Similarity score between 0 and 1 (1 = identical, 0 = orthogonal)
        """
        if not embedding1 or not embedding2:
            return 0.0
        
        if len(embedding1) != len(embedding2):
            logger.warning(f"Embedding dimension mismatch: {len(embedding1)} vs {len(embedding2)}")
            return 0.0
        
        # Cosine similarity: dot product of normalized vectors
        try:
            try:
                import numpy as np
            except ImportError:
                logger.warning("numpy not available, using fallback similarity calculation")
                # Fallback: simple dot product with manual normalization
                dot_product = sum(a * b for a, b in zip(embedding1, embedding2))
                norm1 = sum(a * a for a in embedding1) ** 0.5
                norm2 = sum(b * b for b in embedding2) ** 0.5
                
                if norm1 == 0 or norm2 == 0:
                    return 0.0
                
                similarity = dot_product / (norm1 * norm2)
                return float(max(-1.0, min(1.0, similarity)))
            
            vec1 = np.array(embedding1)
            vec2 = np.array(embedding2)
            
            # Normalize vectors
            norm1 = np.linalg.norm(vec1)
            norm2 = np.linalg.norm(vec2)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            similarity = np.dot(vec1, vec2) / (norm1 * norm2)
            # Clip to [-1, 1] range (though should be [0, 1] for normalized embeddings)
            return float(np.clip(similarity, -1.0, 1.0))
        except Exception as e:
            logger.error(f"Error computing similarity: {e}")
            return 0.0

    def is_available(self) -> bool:
        """Check if the embedding service is available."""
        return self.model is not None


# Global instance
_embedding_service: Optional[EmbeddingService] = None


def get_embedding_service() -> EmbeddingService:
    """Get or create the global embedding service instance."""
    global _embedding_service
    if _embedding_service is None:
        model_name = getattr(settings, "embedding_model", "all-MiniLM-L6-v2")
        _embedding_service = EmbeddingService(model_name=model_name)
    return _embedding_service

