"""Integration tests for embargo management tool."""

import json

import pytest

from figshare_mcp.tools.embargo import manage_embargo


class TestManageEmbargoValidation:
    """Validation tests — do not require a token or live instance."""

    async def test_no_token_returns_error(self, monkeypatch):
        monkeypatch.delenv("FIGSHARE_TOKEN", raising=False)
        result = json.loads(await manage_embargo(action="get", article_id=1))
        assert "error" in result
        assert "FIGSHARE_TOKEN" in result["error"]

    async def test_invalid_action_returns_error(self, monkeypatch):
        monkeypatch.setenv("FIGSHARE_TOKEN", "fake-token")
        result = json.loads(await manage_embargo(action="delete", article_id=1))
        assert "error" in result
        assert "Invalid action" in result["error"]

    async def test_set_without_is_embargoed_returns_error(self, monkeypatch):
        monkeypatch.setenv("FIGSHARE_TOKEN", "fake-token")
        result = json.loads(
            await manage_embargo(action="set", article_id=1, embargo_date="2025-12-31", embargo_type="file")
        )
        assert "error" in result
        assert "is_embargoed" in result["error"]

    async def test_set_without_embargo_date_returns_error(self, monkeypatch):
        monkeypatch.setenv("FIGSHARE_TOKEN", "fake-token")
        result = json.loads(
            await manage_embargo(action="set", article_id=1, is_embargoed=True, embargo_type="file")
        )
        assert "error" in result
        assert "embargo_date" in result["error"]

    async def test_set_without_embargo_type_returns_error(self, monkeypatch):
        monkeypatch.setenv("FIGSHARE_TOKEN", "fake-token")
        result = json.loads(
            await manage_embargo(action="set", article_id=1, is_embargoed=True, embargo_date="2025-12-31")
        )
        assert "error" in result
        assert "embargo_type" in result["error"]

    async def test_get_without_article_id_returns_error(self, monkeypatch):
        monkeypatch.setenv("FIGSHARE_TOKEN", "fake-token")
        result = json.loads(await manage_embargo(action="get"))
        assert "error" in result
        assert "article_id" in result["error"]


@pytest.mark.requires_token
class TestManageEmbargoLive:
    """Live embargo tests against the local Figshare instance."""

    async def test_get_embargo_options(self):
        result = json.loads(await manage_embargo(action="options"))
        # Personal accounts (not belonging to an institution) get a 400 from this endpoint.
        # Both are valid outcomes — we just verify no unexpected exception is raised.
        assert "embargo_options" in result or "error" in result

    async def test_get_nonexistent_article_embargo_returns_error(self):
        result = json.loads(await manage_embargo(action="get", article_id=999999999))
        assert "error" in result


@pytest.mark.requires_token
@pytest.mark.write
class TestManageEmbargoWriteLive:
    """End-to-end embargo lifecycle — creates a draft article, applies and removes embargo."""

    async def test_embargo_lifecycle(self):
        from figshare_mcp.tools.articles import manage_article

        # 1. Create a test draft article.
        create_result = json.loads(
            await manage_article(
                action="create",
                title="MCP Embargo Lifecycle Test",
                description="Created by figshare-mcp embargo test — safe to delete.",
            )
        )
        assert create_result.get("success"), f"Article create failed: {create_result}"
        article_id = (
            create_result["article"].get("id")
            or create_result["article"].get("entity_id")
        )
        assert article_id, "No article ID returned"

        # 2. Fetch embargo options to get a valid type (may not be available for personal accounts).
        options_result = json.loads(await manage_embargo(action="options"))
        embargo_options = options_result.get("embargo_options", [])
        embargo_type = embargo_options[0].get("type", "file") if embargo_options else "file"

        # 3. Set embargo — use a date within the API's 25-year limit.
        set_result = json.loads(
            await manage_embargo(
                action="set",
                article_id=article_id,
                is_embargoed=True,
                embargo_date="2030-12-31",
                embargo_type=embargo_type,
                embargo_title="Test embargo",
                embargo_reason="Integration test",
            )
        )
        assert set_result.get("success"), f"Embargo set failed: {set_result}"
        assert set_result["embargo"].get("is_embargoed") is True

        # 4. Get embargo to verify.
        get_result = json.loads(await manage_embargo(action="get", article_id=article_id))
        assert get_result["embargo"].get("is_embargoed") is True

        # 5. Remove embargo.
        remove_result = json.loads(await manage_embargo(action="remove", article_id=article_id))
        assert remove_result.get("success"), f"Embargo remove failed: {remove_result}"
