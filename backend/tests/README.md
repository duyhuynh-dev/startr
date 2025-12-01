# Test Suite

Pytest-based test suite for the VC × Startup Matching API backend.

## Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run only unit tests
pytest -m unit

# Run only integration tests
pytest -m integration

# Run a specific test file
pytest tests/test_profiles.py

# Run with verbose output
pytest -v
```

## Test Structure

- **`conftest.py`**: Shared fixtures for database sessions, Redis clients, and test data
- **`test_*.py`**: Test files organized by feature/module
- **Fixtures**:
  - `db_session`: In-memory SQLite database session (automatically cleaned up)
  - `redis_client`: FakeRedis client for testing (automatically flushed)
  - `client`: FastAPI TestClient with dependencies overridden
  - `sample_*_data`: Sample data fixtures for creating test objects

## Test Markers

- `@pytest.mark.unit`: Fast unit tests (no external dependencies)
- `@pytest.mark.integration`: Integration tests (may require DB/Redis setup)
- `@pytest.mark.slow`: Slow tests that may take longer to run

## Writing Tests

Example test:

```python
@pytest.mark.unit
def test_create_profile(client, db_session, sample_investor_profile_data):
    """Test creating an investor profile."""
    response = client.post(
        "/api/v1/profiles",
        json={
            "role": "investor",
            "full_name": sample_investor_profile_data["full_name"],
            # ... other fields
        },
    )

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["role"] == "investor"
```

## Notes

- Tests use an in-memory SQLite database (fast, isolated)
- Tests use FakeRedis for caching (no external Redis needed)
- Rate limiting is disabled during tests
- Each test gets a fresh database session and Redis instance

