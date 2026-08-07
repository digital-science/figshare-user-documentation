"""Integration tests for collection tools."""

import json

import pytest

from figshare_mcp.tools.collections import get_collection, manage_collection, search_collections


class TestSearchCollections:
    async def test_basic_search_returns_results(self):
        result = json.loads(await search_collections())
        assert "collections" in result
        assert isinstance(result["collections"], list)

    async def test_page_size_clamped(self):
        result = json.loads(await search_collections(page_size=999))
        assert result["page_size"] == 50

    async def test_private_without_token_returns_error(self, monkeypatch):
        monkeypatch.delenv("FIGSHARE_TOKEN", raising=False)
        result = json.loads(await search_collections(private=True))
        assert "error" in result
        assert "FIGSHARE_TOKEN" in result["error"]


@pytest.mark.requires_token
class TestSearchCollectionsPrivate:
    async def test_private_collections(self):
        result = json.loads(await search_collections(private=True))
        assert "collections" in result
        assert "error" not in result


class TestGetCollection:
    async def test_nonexistent_collection_returns_error(self):
        result = json.loads(await get_collection(collection_id=999999999))
        assert "error" in result

    async def test_get_collection_with_articles(self):
        search = json.loads(await search_collections(page_size=1))
        if not search["collections"]:
            pytest.skip("No public collections available on this instance")

        cid = search["collections"][0]["id"]
        result = json.loads(await get_collection(collection_id=cid))
        assert "collection" in result
        assert "articles" in result

    async def test_get_collection_without_articles(self):
        search = json.loads(await search_collections(page_size=1))
        if not search["collections"]:
            pytest.skip("No public collections available on this instance")

        cid = search["collections"][0]["id"]
        result = json.loads(await get_collection(collection_id=cid, include_articles=False))
        assert "collection" in result
        assert "articles" not in result


@pytest.mark.requires_token
@pytest.mark.write
class TestManageCollection:
    async def test_create_without_title_returns_error(self):
        result = json.loads(await manage_collection(action="create"))
        assert "error" in result
        assert "title" in result["error"]

    async def test_update_without_id_returns_error(self):
        result = json.loads(await manage_collection(action="update"))
        assert "error" in result
        assert "collection_id" in result["error"]

    async def test_create_and_update_collection(self):
        create_result = json.loads(
            await manage_collection(
                action="create",
                title="MCP Integration Test Collection",
                description="Created by figshare-mcp integration test — safe to delete.",
                tags=["mcp-test"],
            )
        )
        assert create_result.get("success") is True, f"Create failed: {create_result}"

        cid = (
            create_result["collection"].get("id")
            or create_result["collection"].get("entity_id")
        )
        assert cid

        update_result = json.loads(
            await manage_collection(
                action="update",
                collection_id=cid,
                title="MCP Integration Test Collection (updated)",
            )
        )
        assert update_result.get("success") is True, f"Update failed: {update_result}"
