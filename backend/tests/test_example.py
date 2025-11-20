"""Example test file to verify pytest setup."""

import pytest


def test_example():
    """Example test to verify pytest is working."""
    assert 1 + 1 == 2


@pytest.mark.unit
def test_unit_example():
    """Example unit test."""
    assert True


@pytest.mark.integration
def test_integration_example():
    """Example integration test."""
    assert True


