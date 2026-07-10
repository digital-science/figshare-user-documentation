"""Integration tests for article tools."""

import json
import os

import pytest

from figshare_mcp.tools.articles import get_article, manage_article, search_articles


class TestSearchArticles:
    """Public article search — no token required."""

    async def test_basic_search_returns_results(self):
        result = json.loads(await search_articles(query="data"))
        assert "articles" in result
        assert isinstance(result["articles"], list)
        assert "count" in result
        assert "has_more" in result

    async def test_empty_query_returns_results(self):
        result = json.loads(await search_articles())
        assert "articles" in result

    async def test_page_size_is_clamped_to_50(self):
        result = json.loads(await search_articles(page_size=999))
        # We asked for 999 but should get at most 50 per page.
        assert result["page_size"] == 50

    async def test_page_size_minimum_is_1(self):
        result = json.loads(await search_articles(page_size=0))
        assert result["page_size"] == 1

    async def test_pagination_metadata(self):
        page1 = json.loads(await search_articles(page=1, page_size=3))
        assert page1["page"] == 1
        assert page1["page_size"] == 3

    async def test_order_direction_desc(self):
        result = json.loads(await search_articles(order_direction="desc", page_size=5))
        assert "articles" in result

    async def test_private_search_without_token_returns_error(self, monkeypatch):
        monkeypatch.delenv("FIGSHARE_TOKEN", raising=False)
        result = json.loads(await search_articles(private=True))
        assert "error" in result
        assert "FIGSHARE_TOKEN" in result["error"]


@pytest.mark.requires_token
class TestSearchArticlesPrivate:
    """Private article search — requires FIGSHARE_TOKEN."""

    async def test_private_search_returns_results(self):
        result = json.loads(await search_articles(private=True))
        assert "articles" in result
        assert "error" not in result


class TestGetArticle:
    """Public article retrieval — no token required for public articles."""

    async def test_get_nonexistent_article_returns_error(self):
        result = json.loads(await get_article(article_id=999999999))
        assert "error" in result
        assert "not found" in result["error"].lower()

    async def test_get_article_without_files_or_versions(self):
        # Fetch first available article to get a real ID.
        search = json.loads(await search_articles(page_size=1))
        if not search["articles"]:
            pytest.skip("No public articles available on this instance")

        article_id = search["articles"][0]["id"]
        result = json.loads(
            await get_article(article_id=article_id, include_files=False, include_versions=False)
        )
        assert "article" in result
        assert "files" not in result
        assert "versions" not in result

    async def test_get_article_with_files_and_versions(self):
        search = json.loads(await search_articles(page_size=1))
        if not search["articles"]:
            pytest.skip("No public articles available on this instance")

        article_id = search["articles"][0]["id"]
        result = json.loads(await get_article(article_id=article_id))
        assert "article" in result
        assert "files" in result
        assert "versions" in result


@pytest.mark.requires_token
@pytest.mark.write
class TestManageArticle:
    """Article create/update — requires FIGSHARE_TOKEN, creates data."""

    async def test_create_article_without_title_returns_error(self):
        result = json.loads(await manage_article(action="create"))
        assert "error" in result
        assert "title" in result["error"]

    async def test_create_article_invalid_action_returns_error(self):
        result = json.loads(await manage_article(action="publish", title="Test"))
        assert "error" in result
        assert "Invalid action" in result["error"]

    async def test_update_article_without_id_returns_error(self):
        result = json.loads(await manage_article(action="update", title="Test"))
        assert "error" in result
        assert "article_id" in result["error"]

    async def test_create_and_update_draft_article(self):
        # Create a draft.
        create_result = json.loads(
            await manage_article(
                action="create",
                title="MCP Integration Test Article",
                description="Created by figshare-mcp integration test — safe to delete.",
                tags=["mcp-test", "integration-test"],
            )
        )
        assert create_result.get("success") is True, f"Create failed: {create_result}"
        assert "article" in create_result

        article_id = (
            create_result["article"].get("id")
            or create_result["article"].get("entity_id")
        )
        assert article_id, "No article ID returned after create"

        # Update the draft.
        update_result = json.loads(
            await manage_article(
                action="update",
                article_id=article_id,
                title="MCP Integration Test Article (updated)",
            )
        )
        assert update_result.get("success") is True, f"Update failed: {update_result}"

    async def test_create_article_without_token_returns_error(self, monkeypatch):
        monkeypatch.delenv("FIGSHARE_TOKEN", raising=False)
        result = json.loads(await manage_article(action="create", title="Test"))
        assert "error" in result
        assert "FIGSHARE_TOKEN" in result["error"]
