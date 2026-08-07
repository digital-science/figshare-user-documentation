"""Integration tests for account info tools."""

import json

import pytest

from figshare_mcp.tools.account import get_account_info


class TestGetAccountInfo:
    async def test_licenses_always_accessible(self):
        result = json.loads(
            await get_account_info(
                include_profile=False,
                include_licenses=True,
                include_categories=False,
            )
        )
        assert "licenses" in result
        assert isinstance(result["licenses"], list)
        assert len(result["licenses"]) > 0

    async def test_categories_always_accessible(self):
        result = json.loads(
            await get_account_info(
                include_profile=False,
                include_licenses=False,
                include_categories=True,
            )
        )
        assert "categories" in result
        assert isinstance(result["categories"], list)

    async def test_profile_without_token_returns_error(self, monkeypatch):
        monkeypatch.delenv("FIGSHARE_TOKEN", raising=False)
        result = json.loads(
            await get_account_info(
                include_profile=True,
                include_licenses=False,
                include_categories=False,
            )
        )
        # Profile fetch should fail, others should succeed or be absent.
        assert "errors" in result
        assert "FIGSHARE_TOKEN" in result["errors"].get("profile", "")


@pytest.mark.requires_token
class TestGetAccountInfoAuthenticated:
    async def test_profile_with_token(self):
        result = json.loads(
            await get_account_info(
                include_profile=True,
                include_licenses=False,
                include_categories=False,
            )
        )
        assert "profile" in result
        assert "errors" not in result or "profile" not in result.get("errors", {})

    async def test_all_sections(self):
        result = json.loads(await get_account_info())
        assert "profile" in result
        assert "licenses" in result
        assert "categories" in result

    async def test_embargo_options_with_token(self):
        result = json.loads(
            await get_account_info(
                include_profile=False,
                include_licenses=False,
                include_categories=False,
                include_embargo_options=True,
            )
        )
        # May be empty list if institution has no custom options — should not be an error.
        assert "embargo_options" in result or "errors" in result
