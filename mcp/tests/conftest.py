"""
Pytest configuration for figshare-mcp integration tests.

Required environment variables before running:
  FIGSHARE_TOKEN    — personal access token for a test account on the local instance
  FIGSHARE_BASE_URL — e.g. http://localhost:8080/v2

Run with:
  FIGSHARE_TOKEN=xxx FIGSHARE_BASE_URL=http://localhost:8080/v2 pytest mcp/tests/ -v
"""

import os

import pytest


def pytest_configure(config):
    """Register custom markers."""
    config.addinivalue_line("markers", "requires_token: test requires FIGSHARE_TOKEN to be set")
    config.addinivalue_line("markers", "write: test creates or modifies data on the instance")


def pytest_runtest_setup(item):
    """Skip token-required tests if no token is configured."""
    if item.get_closest_marker("requires_token"):
        if not os.getenv("FIGSHARE_TOKEN"):
            pytest.skip("FIGSHARE_TOKEN not set — skipping authenticated test")


@pytest.fixture(scope="session")
def base_url() -> str:
    return os.getenv("FIGSHARE_BASE_URL", "https://api.figshare.com/v2")


@pytest.fixture(scope="session")
def has_token() -> bool:
    return bool(os.getenv("FIGSHARE_TOKEN"))
