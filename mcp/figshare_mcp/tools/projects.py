"""
MCP tool for Figshare projects.

Tools:
  get_projects — list or retrieve a specific project (public or private)
"""

import json
from typing import Any

from figshare_mcp.client import FigshareClient, clamp_page_size


async def get_projects(
    project_id: int | None = None,
    private: bool = False,
    page: int = 1,
    page_size: int = 10,
    order: str = "published_date",
    order_direction: str = "desc",
    institution: int | None = None,
    group: int | None = None,
    storage: str | None = None,
    roles: str | None = None,
) -> str:
    """List Figshare projects or get details of a specific project.

    Args:
        project_id: If provided, returns details for that specific project.
                    If omitted, returns a paginated list of projects.
        private: If True, lists/fetches from the authenticated user's own projects (requires token).
        page: Page number (starts at 1). Used only when project_id is not provided.
        page_size: Results per page (1–50, default 10).
        order: Sort field — e.g. published_date, modified_date.
        order_direction: "asc" or "desc".
        institution: Filter by institution ID (public listing only).
        group: Filter by group ID (public listing only).
        storage: Filter by storage type ("individual" or "group") — private only.
        roles: Filter by role ("viewer", "collaborator", "owner") — private only.

    Returns:
        JSON string with project(s) details and pagination metadata.
    """
    client = FigshareClient()

    if private and not client.has_token:
        return json.dumps({"error": "FIGSHARE_TOKEN is required to access private projects"})

    # Fetch a single project by ID.
    if project_id is not None:
        path = f"/account/projects/{project_id}" if private else f"/projects/{project_id}"
        try:
            project = await client.get(path)
            return json.dumps({"project": project}, default=str)
        except RuntimeError as exc:
            return json.dumps({"error": str(exc)})

    # List projects.
    page_size = clamp_page_size(page_size)

    if private:
        params: dict[str, Any] = {
            "page": page,
            "page_size": page_size,
            "order": order,
            "order_direction": order_direction,
        }
        if storage:
            params["storage"] = storage
        if roles:
            params["roles"] = roles
        try:
            results = await client.get("/account/projects", params=params)
        except RuntimeError as exc:
            return json.dumps({"error": str(exc)})
    else:
        params = {
            "page": page,
            "page_size": page_size,
            "order": order,
            "order_direction": order_direction,
        }
        if institution is not None:
            params["institution"] = institution
        if group is not None:
            params["group"] = group
        try:
            results = await client.get("/projects", params=params)
        except RuntimeError as exc:
            return json.dumps({"error": str(exc)})

    projects = results if isinstance(results, list) else []
    return json.dumps(
        {
            "projects": projects,
            "count": len(projects),
            "page": page,
            "page_size": page_size,
            "has_more": len(projects) == page_size,
            "note": "Use page+1 to fetch the next page if has_more is true.",
        },
        default=str,
    )
