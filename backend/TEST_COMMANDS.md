# Pytest Test Commands Quick Reference

## Quick Commands

```bash
# Run all tests with coverage
pytest

# Run only fast unit tests
pytest -m unit

# Run a specific test file
pytest tests/test_profiles.py

# Run with verbose output and see print statements
pytest -v -s

# Generate HTML coverage report
pytest --cov=app --cov-report=html
open htmlcov/index.html  # macOS
```

## Test Types (Markers)

- `@pytest.mark.unit` - Fast unit tests
- `@pytest.mark.integration` - Integration tests
- `@pytest.mark.slow` - Slow tests

```bash
pytest -m unit              # Unit tests only
pytest -m integration       # Integration tests only
pytest -m "not slow"        # Exclude slow tests
```

## Useful Flags

- `-v` / `-vv` - Verbose output (more v's = more detail)
- `-s` - Show print statements
- `-x` - Stop on first failure
- `-k "pattern"` - Run tests matching pattern
- `-l` - Show local variables on failure
- `--pdb` - Drop into debugger on failure
- `--durations=10` - Show 10 slowest tests
- `--lf` - Run last failed tests only
- `--ff` - Run failed tests first

## Coverage

```bash
pytest --cov=app                    # With coverage
pytest --cov=app --cov-report=html  # Generate HTML report
pytest --no-cov                     # Disable coverage (faster)
```

