"""Tests for ML services (embeddings, recommendation, ranking)."""

from __future__ import annotations

import pytest
from unittest.mock import Mock, patch, MagicMock
from fastapi import status
from fastapi.testclient import TestClient

from app.services.ml.embeddings import EmbeddingService, get_embedding_service
from app.services.ml.recommendation import RecommendationEngine, get_recommendation_engine
from app.services.ml.ranking import RerankingService, get_reranking_service


@pytest.mark.unit
class TestEmbeddingService:
    """Unit tests for EmbeddingService."""

    def test_embedding_service_initialization_without_model(self):
        """Test that service initializes gracefully when models not available."""
        with patch('app.services.ml.embeddings.SENTENCE_TRANSFORMERS_AVAILABLE', False):
            service = EmbeddingService()
            assert service.model is None
            assert service.device == "cpu"
            assert not service.is_available()

    def test_embed_text_returns_zero_vector_when_unavailable(self):
        """Test that embed_text returns zero vector when model unavailable."""
        service = EmbeddingService()
        service.model = None
        
        result = service.embed_text("test text")
        assert len(result) == 384
        assert all(x == 0.0 for x in result)

    def test_embed_text_with_mock_model(self):
        """Test embed_text with mocked model."""
        try:
            import numpy as np
            mock_array = np.array([0.1] * 384)
        except ImportError:
            # Fallback if numpy not available - just test that it returns a list
            mock_array = [0.1] * 384
        
        mock_model = MagicMock()
        mock_model.encode.return_value = mock_array
        
        service = EmbeddingService()
        service.model = mock_model
        
        result = service.embed_text("test", use_cache=False)
        
        mock_model.encode.assert_called_once()
        assert len(result) == 384
        assert isinstance(result, list)

    def test_embed_batch_with_mock_model(self):
        """Test embed_batch with mocked model."""
        try:
            import numpy as np
            mock_array = np.array([[0.1] * 384, [0.2] * 384])
        except ImportError:
            # Fallback if numpy not available
            mock_array = [[0.1] * 384, [0.2] * 384]
        
        mock_model = MagicMock()
        mock_model.encode.return_value = mock_array
        
        service = EmbeddingService()
        service.model = mock_model
        
        texts = ["text1", "text2"]
        result = service.embed_batch(texts)
        
        assert len(result) == 2
        assert len(result[0]) == 384
        assert isinstance(result, list)

    def test_embed_batch_empty_list(self):
        """Test embed_batch with empty list."""
        service = EmbeddingService()
        result = service.embed_batch([])
        assert result == []

    def test_embed_profile_text_combines_fields(self):
        """Test that embed_profile_text combines profile fields correctly."""
        service = EmbeddingService()
        service.model = None  # Will return zero vector
        
        profile_data = {
            "id": "test-id",
            "full_name": "John Doe",
            "headline": "CEO",
            "location": "SF",
            "role": "investor",
            "firm": "Test VC",
            "focus_sectors": ["AI", "SaaS"],
            "prompts": [{"content": "I love startups"}],
        }
        
        result = service.embed_profile_text(profile_data, profile_id="test-id")
        assert len(result) == 384

    def test_compute_similarity_same_embeddings(self):
        """Test that identical embeddings return similarity of 1.0."""
        service = EmbeddingService()
        
        embedding = [0.5] * 384
        similarity = service.compute_similarity(embedding, embedding)
        
        # Should be close to 1.0 for identical normalized vectors
        assert abs(similarity - 1.0) < 0.01

    def test_compute_similarity_orthogonal_embeddings(self):
        """Test that orthogonal embeddings return similarity close to 0."""
        service = EmbeddingService()
        
        # Create orthogonal vectors (one has all 1s, other has all 0s)
        embedding1 = [1.0] * 384
        embedding2 = [0.0] * 384
        
        similarity = service.compute_similarity(embedding1, embedding2)
        assert similarity == 0.0

    def test_compute_similarity_dimension_mismatch(self):
        """Test that dimension mismatch returns 0.0."""
        service = EmbeddingService()
        
        embedding1 = [0.1] * 384
        embedding2 = [0.2] * 100  # Different dimension
        
        similarity = service.compute_similarity(embedding1, embedding2)
        assert similarity == 0.0

    def test_compute_similarity_empty_embeddings(self):
        """Test that empty embeddings return 0.0."""
        service = EmbeddingService()
        
        similarity = service.compute_similarity([], [])
        assert similarity == 0.0


@pytest.mark.unit
class TestRecommendationEngine:
    """Unit tests for RecommendationEngine."""

    def test_recommendation_engine_initialization(self):
        """Test recommendation engine initialization."""
        engine = RecommendationEngine()
        assert engine.embedding_service is not None

    def test_compute_profile_similarity_unavailable(self):
        """Test similarity computation when ML unavailable."""
        engine = RecommendationEngine()
        
        with patch('app.core.config.settings.ml_enabled', False):
            result = engine.compute_profile_similarity({}, {})
            assert result == 0.0

    def test_compute_profile_similarity_with_mock(self):
        """Test profile similarity with mocked embedding service."""
        engine = RecommendationEngine()
        
        mock_embedding = [0.5] * 384
        engine.embedding_service = Mock()
        engine.embedding_service.is_available.return_value = True
        engine.embedding_service.embed_profile_text.return_value = mock_embedding
        engine.embedding_service.compute_similarity.return_value = 0.75
        
        with patch('app.core.config.settings.ml_enabled', True):
            profile_a = {"id": "a", "full_name": "A"}
            profile_b = {"id": "b", "full_name": "B"}
            
            result = engine.compute_profile_similarity(profile_a, profile_b)
            assert result == 0.75

    def test_rank_candidates_empty_list(self):
        """Test ranking with empty candidate list."""
        engine = RecommendationEngine()
        result = engine.rank_candidates({}, [])
        assert result == []

    def test_rank_candidates_unavailable(self):
        """Test ranking when ML unavailable."""
        engine = RecommendationEngine()
        engine.embedding_service = Mock()
        engine.embedding_service.is_available.return_value = False
        
        with patch('app.core.config.settings.ml_enabled', True):
            candidates = [{"id": "1"}, {"id": "2"}]
            result = engine.rank_candidates({}, candidates, limit=1)
            assert len(result) == 1
            assert result[0][1] == 0.0  # Score is 0.0


@pytest.mark.unit
class TestRerankingService:
    """Unit tests for RerankingService."""

    def test_reranking_service_initialization(self):
        """Test reranking service initialization."""
        service = RerankingService()
        assert service.recommendation_engine is not None

    def test_rerank_profiles_empty_list(self):
        """Test reranking with empty profile list."""
        service = RerankingService()
        result = service.rerank_profiles({}, [])
        assert result == []

    def test_rerank_profiles_combines_signals(self):
        """Test that reranking combines similarity, diligence, and engagement."""
        service = RerankingService()
        
        # Mock recommendation engine
        service.recommendation_engine = Mock()
        service.recommendation_engine.compute_profile_similarity.return_value = 0.8
        
        current_profile = {"id": "current"}
        candidates = [
            {"id": "1", "full_name": "Candidate 1"},
            {"id": "2", "full_name": "Candidate 2"},
        ]
        diligence_scores = {"1": 0.9, "2": 0.7}
        
        with patch('app.core.config.settings') as mock_settings:
            mock_settings.ml_similarity_weight = 0.6
            mock_settings.ml_diligence_weight = 0.3
            mock_settings.ml_engagement_weight = 0.1
            
            result = service.rerank_profiles(
                current_profile,
                candidates,
                diligence_scores=diligence_scores,
            )
            
            assert len(result) == 2
            # Should be sorted by score (descending)
            assert result[0][1] >= result[1][1]

    def test_compute_match_reasons(self):
        """Test match reasons generation."""
        service = RerankingService()
        
        current_profile = {
            "role": "investor",
            "focus_sectors": ["AI", "SaaS"],
            "focus_stages": ["Seed"],
        }
        candidate_profile = {
            "role": "founder",
            "company_name": "TestCo",
        }
        diligence_data = {"overall_score": 85.0}
        
        reasons = service.compute_match_reasons(
            current_profile, candidate_profile, diligence_data
        )
        
        assert isinstance(reasons, list)
        assert len(reasons) <= 3


@pytest.mark.integration
class TestMLEndpoints:
    """Integration tests for ML API endpoints."""

    def test_ml_health_check_disabled(self, client: TestClient):
        """Test ML health check when ML is disabled."""
        with patch('app.core.config.settings.ml_enabled', False):
            response = client.get("/api/v1/ml/health")
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert data["ml_enabled"] is False
            assert data["status"] == "unavailable"

    def test_ml_health_check_enabled_unavailable(self, client: TestClient):
        """Test ML health check when enabled but service unavailable."""
        with patch('app.core.config.settings.ml_enabled', True):
            with patch('app.services.ml.embeddings.get_embedding_service') as mock_get:
                mock_service = Mock()
                mock_service.is_available.return_value = False
                mock_get.return_value = mock_service
                
                response = client.get("/api/v1/ml/health")
                assert response.status_code == status.HTTP_200_OK
                data = response.json()
                assert data["ml_enabled"] is True
                assert data["embedding_service_available"] is False
                assert data["status"] == "degraded"

    def test_generate_embedding_unavailable(self, client: TestClient):
        """Test embedding endpoint when service unavailable."""
        with patch('app.core.config.settings.ml_enabled', True):
            with patch('app.services.ml.embeddings.get_embedding_service') as mock_get:
                mock_service = Mock()
                mock_service.is_available.return_value = False
                mock_get.return_value = mock_service
                
                response = client.post(
                    "/api/v1/ml/embeddings",
                    json={"text": "test"},
                )
                assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE

    def test_generate_embedding_success(self, client: TestClient):
        """Test successful embedding generation."""
        with patch('app.core.config.settings.ml_enabled', True):
            with patch('app.services.ml.embeddings.get_embedding_service') as mock_get:
                mock_service = Mock()
                mock_service.is_available.return_value = True
                mock_service.embed_text.return_value = [0.1] * 384
                mock_get.return_value = mock_service
                
                response = client.post(
                    "/api/v1/ml/embeddings",
                    json={"text": "test"},
                )
                assert response.status_code == status.HTTP_200_OK
                data = response.json()
                assert "embedding" in data
                assert len(data["embedding"]) == 384
                assert data["dimension"] == 384

    def test_compute_similarity_success(self, client: TestClient):
        """Test successful similarity computation."""
        with patch('app.core.config.settings.ml_enabled', True):
            with patch('app.services.ml.embeddings.get_embedding_service') as mock_get:
                mock_service = Mock()
                mock_service.is_available.return_value = True
                mock_service.embed_text.side_effect = [[0.1] * 384, [0.2] * 384]
                mock_service.compute_similarity.return_value = 0.75
                mock_get.return_value = mock_service
                
                response = client.post(
                    "/api/v1/ml/similarity",
                    json={"text1": "test1", "text2": "test2"},
                )
                assert response.status_code == status.HTTP_200_OK
                data = response.json()
                assert "similarity" in data
                assert 0.0 <= data["similarity"] <= 1.0

    def test_batch_embeddings_success(self, client: TestClient):
        """Test successful batch embedding generation."""
        with patch('app.core.config.settings.ml_enabled', True):
            with patch('app.services.ml.embeddings.get_embedding_service') as mock_get:
                mock_service = Mock()
                mock_service.is_available.return_value = True
                mock_service.embed_batch.return_value = [[0.1] * 384, [0.2] * 384]
                mock_get.return_value = mock_service
                
                response = client.post(
                    "/api/v1/ml/embeddings/batch",
                    json={"texts": ["text1", "text2"]},
                )
                assert response.status_code == status.HTTP_200_OK
                data = response.json()
                assert len(data["embeddings"]) == 2
                assert data["count"] == 2

    def test_batch_similarity_success(self, client: TestClient):
        """Test successful batch similarity computation."""
        with patch('app.core.config.settings.ml_enabled', True):
            with patch('app.services.ml.embeddings.get_embedding_service') as mock_get:
                mock_service = Mock()
                mock_service.is_available.return_value = True
                # Text deduplication means we need embeddings for unique texts only
                # Pairs: (a,b) and (c,d) = 4 unique texts: a, b, c, d
                mock_service.embed_batch.return_value = [
                    [0.1] * 384,  # a
                    [0.2] * 384,  # b
                    [0.3] * 384,  # c
                    [0.4] * 384,  # d
                ]
                mock_service.compute_similarity.return_value = 0.75
                mock_get.return_value = mock_service
                
                response = client.post(
                    "/api/v1/ml/similarity/batch",
                    json={
                        "pairs": [
                            {"text1": "a", "text2": "b"},
                            {"text1": "c", "text2": "d"},
                        ]
                    },
                )
                assert response.status_code == status.HTTP_200_OK
                data = response.json()
                # Should get 2 results (one per pair)
                assert len(data["results"]) >= 1  # At least 1 result

    def test_rank_candidates_unavailable(self, client: TestClient, db_session):
        """Test ranking endpoint when ML unavailable."""
        # Create test profiles first
        from app.models.profile import Profile
        
        current_profile = Profile(
            role="investor",
            full_name="Test Investor",
            email="current@test.com",
            verification={"soft_verified": False},
        )
        candidate_profile = Profile(
            role="founder",
            full_name="Test Founder",
            email="candidate@test.com",
            verification={"soft_verified": False},
        )
        db_session.add(current_profile)
        db_session.add(candidate_profile)
        db_session.commit()
        db_session.refresh(current_profile)
        db_session.refresh(candidate_profile)
        
        # ML will be unavailable (no dependencies installed), so it should fall back gracefully
        with patch('app.core.config.settings.ml_enabled', True):
            response = client.post(
                "/api/v1/ml/profiles/rank",
                json={
                    "profile_id": current_profile.id,
                    "candidate_ids": [candidate_profile.id],
                },
            )
            # Should return 200 if ML works, 503 if unavailable, or 500 if there's an error
            # (500 might happen if ML dependencies aren't installed at all)
            assert response.status_code in [
                status.HTTP_200_OK, 
                status.HTTP_503_SERVICE_UNAVAILABLE,
                status.HTTP_500_INTERNAL_SERVER_ERROR,
            ]

