"""Pytest configuration and shared fixtures."""

from __future__ import annotations

import os
import sys
import uuid
from typing import Generator

# Set test environment variables BEFORE any imports
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["REDIS_URL"] = "redis://localhost:6379/15"
os.environ["RATE_LIMIT_ENABLED"] = "false"
os.environ["ML_ENABLED"] = "false"  # Disable ML in tests to avoid dependency conflicts

import pytest
from fakeredis import FakeStrictRedis
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine

from app.core.config import get_settings, settings
from app.core.redis import redis_client as original_redis_client
from app.db.session import get_session
from app.main import app

# Import after app.main to avoid circular imports
from app.core import redis as redis_module

# Clear settings cache to force reload with test env vars
get_settings.cache_clear()


# Override settings for testing
@pytest.fixture(scope="session", autouse=True)
def test_settings():
    """Override settings for testing."""
    # Use in-memory SQLite for testing - set before any imports use settings
    os.environ["DATABASE_URL"] = "sqlite:///:memory:"
    os.environ["REDIS_URL"] = "redis://localhost:6379/15"  # Use a test DB
    os.environ["RATE_LIMIT_ENABLED"] = "false"  # Disable rate limiting in tests
    os.environ["ML_ENABLED"] = "false"  # Disable ML in tests to avoid dependency conflicts
    
    # Clear settings cache to force reload with new env vars
    from app.core.config import get_settings
    get_settings.cache_clear()
    
    yield
    
    # Cleanup - restore cache
    get_settings.cache_clear()


@pytest.fixture(scope="function")
def db_session() -> Generator[Session, None, None]:
    """Create a test database session with in-memory SQLite."""
    # Import models to ensure metadata is populated
    from app.models import (  # noqa: F401
        Like,
        Match,
        Message,
        Profile,
        PromptTemplate,
        StartupOfMonth,
        User,
    )
    
    # Create in-memory SQLite engine
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    
    # Create all tables BEFORE creating session
    SQLModel.metadata.create_all(engine)
    
    # Create session - use engine.connect() to ensure connection is active
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)
    
    try:
        yield session
        session.rollback()
    finally:
        session.close()
        transaction.rollback()
        connection.close()
        # Drop all tables after test
        SQLModel.metadata.drop_all(engine)


@pytest.fixture(scope="function")
def redis_client() -> Generator[FakeStrictRedis, None, None]:
    """Create a fake Redis client for testing."""
    fake_redis = FakeStrictRedis(decode_responses=True)
    
    # Replace the redis_client in the redis module temporarily
    original_client = redis_module.redis_client
    redis_module.redis_client = fake_redis
    
    yield fake_redis
    
    # Restore original client
    redis_module.redis_client = original_client
    fake_redis.flushall()


@pytest.fixture(scope="function")
def client(db_session: Session, redis_client: FakeStrictRedis) -> Generator[TestClient, None, None]:
    """Create a FastAPI test client with overridden dependencies."""
    
    def override_get_session():
        """Override database session dependency."""
        try:
            yield db_session
        finally:
            pass
    
    # Override database dependency - this ensures all endpoints use our test session
    from app.db import session as db_session_module
    
    # Override the dependency
    app.dependency_overrides[get_session] = override_get_session
    
    # Disable rate limiting for tests
    if hasattr(app.state, "limiter"):
        app.state.limiter.enabled = False
    
    with TestClient(app) as test_client:
        yield test_client
    
    # Cleanup
    app.dependency_overrides.clear()
    if hasattr(app.state, "limiter"):
        app.state.limiter.enabled = True


@pytest.fixture
def sample_investor_profile_data():
    """Sample investor profile data for testing."""
    return {
        "id": str(uuid.uuid4()),
        "role": "investor",
        "full_name": "Test Investor",
        "email": "investor@test.com",
        "headline": "Partner at Test VC",
        "location": "San Francisco, CA",
        "firm": "Test VC",
        "check_size_min": 100000,
        "check_size_max": 1000000,
        "focus_sectors": ["AI", "SaaS"],
        "focus_stages": ["Seed", "Series A"],
        "prompts": [
            {"prompt_id": "inv_mission", "content": "I love startups solving hard problems."}
        ],
        "verification": {
            "soft_verified": True,
            "manual_reviewed": False,
            "accreditation_attested": True,
            "badges": ["verified_email"],
        },
    }


@pytest.fixture
def sample_founder_profile_data():
    """Sample founder profile data for testing."""
    return {
        "id": str(uuid.uuid4()),
        "role": "founder",
        "full_name": "Test Founder",
        "email": "founder@test.com",
        "headline": "CEO at Test Startup",
        "location": "New York, NY",
        "company_name": "Test Startup",
        "company_url": "https://test.com",
        "revenue_run_rate": 500000.0,
        "team_size": 10,
        "runway_months": 18,
        "focus_markets": ["US"],
        "prompts": [
            {"prompt_id": "found_mission", "content": "We're building the future of work."}
        ],
        "verification": {
            "soft_verified": True,
            "manual_reviewed": False,
            "accreditation_attested": False,
            "badges": ["verified_email"],
        },
    }


@pytest.fixture
def sample_prompt_template_data():
    """Sample prompt template data for testing."""
    return {
        "id": "test_template_1",
        "text": "What gets you excited about a startup?",
        "role": "investor",
        "category": "mission",
        "display_order": 1,
        "is_active": True,
    }

