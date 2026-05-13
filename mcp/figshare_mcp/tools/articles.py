"""
MCP tools for Figshare articles.

Tools:
  search_articles — search public or private articles
  get_article     — retrieve article details, files, and versions
  manage_article  — create or update a draft article
"""

import json
from typing import Any

from figshare_mcp.client import FigshareClient, clamp_page_size


def _format_article(article: dict) -> dict:
    """Return a trimmed article dict with only the most useful fields."""
    return {
        "id": article.get("id"),
        "title": article.get("title"),
        "doi": article.get("doi"),
        "url": article.get("url_public_html") or article.get("url"),
        "published_date": article.get("published_date"),
        "modified_date": article.get("modified_date"),
        "status": article.get("status"),
        "defined_type_name": article.get("defined_type_name"),
        "authors": [a.get("full_name") for a in article.get("authors", [])],
        "tags": article.get("tags", []),
        "categories": [c.get("title") for c in article.get("categories", [])],
        "files_count": len(article.get("files", [])),
    }


async def search_articles(
    query: str = "",
    private: bool = False,
    page: int = 1,
    page_size: int = 10,
    order: str = "published_date",
    order_direction: str = "desc",
    institution: int | None = None,
    published_since: str | None = None,
    modified_since: str | None = None,
    group: int | None = None,
    item_type: int | None = None,
) -> str:
    """Search Figshare articles.

    For public articles use private=False (no token needed).
    For private/draft articles owned by the authenticated user use private=True (token required).

    Args:
        query: Free-text search string.
        private: If True, search within the authenticated user's own articles (requires token).
        page: Page number (starts at 1).
        page_size: Results per page (1–50, default 10).
        order: Sort field — e.g. published_date, modified_date, views, citations.
        order_direction: "asc" or "desc".
        institution: Filter by institution ID.
        published_since: ISO 8601 date string (e.g. "2023-01-01").
        modified_since: ISO 8601 date string.
        group: Filter by group ID.
        item_type: Figshare item type ID (e.g. 1=figure, 3=dataset, 9=software).

    Returns:
        JSON string with matching articles and pagination metadata.
    """
    client = FigshareClient()
    page_size = clamp_page_size(page_size)

    if private:
        if not client.has_token:
            return json.dumps({"error": "FIGSHARE_TOKEN is required to search private articles"})
        # Private search uses POST with a body.
        body: dict[str, Any] = {
            "page": page,
            "page_size": page_size,
            "order_direction": order_direction,
        }
        if query:
            body["search_for"] = query
        if institution is not None:
            body["institution"] = institution
        if published_since:
            body["published_since"] = published_since
        if modified_since:
            body["modified_since"] = modified_since
        if group is not None:
            body["group"] = group
        try:
            results = await client.post("/account/articles/search", json=body)
        except RuntimeError as exc:
            return json.dumps({"error": str(exc)})
    else:
        # Public search uses POST /articles/search.
        body = {
            "page": page,
            "page_size": page_size,
            "order_direction": order_direction,
        }
        if query:
            body["search_for"] = query
        if institution is not None:
            body["institution"] = institution
        if published_since:
            body["published_since"] = published_since
        if modified_since:
            body["modified_since"] = modified_since
        if group is not None:
            body["group"] = group
        if item_type is not None:
            body["item_type"] = item_type
        try:
            results = await client.post("/articles/search", json=body)
        except RuntimeError as exc:
            return json.dumps({"error": str(exc)})

    articles = [_format_article(a) for a in (results if isinstance(results, list) else [])]
    return json.dumps(
        {
            "articles": articles,
            "count": len(articles),
            "page": page,
            "page_size": page_size,
            "has_more": len(articles) == page_size,
            "note": "Use page+1 to fetch the next page if has_more is true. Hard cap: 1000 total results.",
        },
        default=str,
    )


async def get_article(
    article_id: int,
    include_files: bool = True,
    include_versions: bool = True,
    private: bool = False,
) -> str:
    """Get full details for a single Figshare article.

    Args:
        article_id: Numeric Figshare article ID.
        include_files: Also fetch the list of files attached to this article.
        include_versions: Also fetch the list of published versions.
        private: If True, fetch from the authenticated user's private articles (requires token).

    Returns:
        JSON string with article details, optionally including files and versions.
    """
    client = FigshareClient()

    if private and not client.has_token:
        return json.dumps({"error": "FIGSHARE_TOKEN is required to fetch private article details"})

    base_path = f"/account/articles/{article_id}" if private else f"/articles/{article_id}"

    try:
        article = await client.get(base_path)
    except RuntimeError as exc:
        return json.dumps({"error": str(exc)})

    result: dict[str, Any] = {"article": article}

    if include_files:
        try:
            files = await client.get(f"/articles/{article_id}/files")
            result["files"] = files
        except RuntimeError as exc:
            result["files_error"] = str(exc)

    if include_versions:
        try:
            versions = await client.get(f"/articles/{article_id}/versions")
            result["versions"] = versions
        except RuntimeError as exc:
            result["versions_error"] = str(exc)

    return json.dumps(result, default=str)


async def manage_article(
    action: str,
    article_id: int | None = None,
    title: str | None = None,
    description: str | None = None,
    tags: list[str] | None = None,
    categories: list[int] | None = None,
    authors: list[dict] | None = None,
    license: int | None = None,
    defined_type: str | None = None,
    doi: str | None = None,
    funding: str | None = None,
    group_id: int | None = None,
) -> str:
    """Create or update a draft Figshare article. Requires authentication token.

    This tool never publishes — it only creates/edits drafts.
    To publish, go to the Figshare web interface.

    Args:
        action: "create" to create a new draft, "update" to edit an existing one.
        article_id: Required when action is "update". The article to update.
        title: Article title. Required when action is "create".
        description: Article description / abstract (HTML or plain text).
        tags: List of keyword tags.
        categories: List of category IDs.
        authors: List of author objects. Each can be {"name": "..."} or {"id": 123}.
        license: License ID (use get_account_info to list available licenses).
        defined_type: Item type string — e.g. "dataset", "figure", "software", "paper".
        doi: Custom DOI (leave blank to let Figshare assign one).
        funding: Funding acknowledgement string.
        group_id: Group ID to associate the article with.

    Returns:
        JSON string with the created/updated article details or an error message.
    """
    client = FigshareClient()

    if not client.has_token:
        return json.dumps({"error": "FIGSHARE_TOKEN is required to create or update articles"})

    if action not in ("create", "update"):
        return json.dumps({"error": f"Invalid action '{action}'. Use 'create' or 'update'."})

    if action == "create" and not title:
        return json.dumps({"error": "title is required when action is 'create'"})

    if action == "update" and article_id is None:
        return json.dumps({"error": "article_id is required when action is 'update'"})

    # Build the request body with only the provided (non-None) fields.
    body: dict[str, Any] = {}
    if title is not None:
        body["title"] = title
    if description is not None:
        body["description"] = description
    if tags is not None:
        body["tags"] = tags
    if categories is not None:
        body["categories"] = categories
    if authors is not None:
        body["authors"] = authors
    if license is not None:
        body["license"] = license
    if defined_type is not None:
        body["defined_type"] = defined_type
    if doi is not None:
        body["doi"] = doi
    if funding is not None:
        body["funding"] = funding
    if group_id is not None:
        body["group_id"] = group_id

    try:
        if action == "create":
            result = await client.post("/account/articles", json=body)
            return json.dumps({"success": True, "action": "created", "article": result}, default=str)
        else:
            # PUT replaces all fields; PATCH updates only provided fields — we use PUT here.
            await client.put(f"/account/articles/{article_id}", json=body)
            # PUT returns 205 with no body; fetch the updated article to confirm.
            updated = await client.get(f"/account/articles/{article_id}")
            return json.dumps({"success": True, "action": "updated", "article": updated}, default=str)
    except RuntimeError as exc:
        return json.dumps({"error": str(exc)})
