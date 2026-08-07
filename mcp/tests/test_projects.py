"""Integration tests for project tools."""

import json

import pytest

from figshare_mcp.tools.projects import get_projects


class TestGetProjects:
    async def test_list_public_projects(self):
        result = json.loads(await get_projects())
        assert "projects" in result
        assert isinstance(result["projects"], list)

    async def test_page_size_clamped(self):
        result = json.loads(await get_projects(page_size=999))
        assert result["page_size"] == 50

    async def test_nonexistent_project_returns_error(self):
        result = json.loads(await get_projects(project_id=999999999))
        assert "error" in result

    async def test_private_without_token_returns_error(self, monkeypatch):
        monkeypatch.delenv("FIGSHARE_TOKEN", raising=False)
        result = json.loads(await get_projects(private=True))
        assert "error" in result
        assert "FIGSHARE_TOKEN" in result["error"]

    async def test_get_specific_public_project(self):
        listing = json.loads(await get_projects(page_size=1))
        if not listing["projects"]:
            pytest.skip("No public projects available on this instance")

        pid = listing["projects"][0]["id"]
        result = json.loads(await get_projects(project_id=pid))
        assert "project" in result
        assert result["project"]["id"] == pid


@pytest.mark.requires_token
class TestGetProjectsPrivate:
    async def test_list_private_projects(self):
        result = json.loads(await get_projects(private=True))
        assert "projects" in result
        assert "error" not in result
