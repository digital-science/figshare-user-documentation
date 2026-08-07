"""
MCP tools for Figshare collections.

Tools:
  search_collections — search public or private collections
  get_collection     — retrieve collection details and its articles
  manage_collection  — create or update a draft collection
"""

import json
from typing import Any

from figshare_mcp.client import FigshareClient, clamp_page_size


async def search_collections(
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
) -> str:
    """Search Figshare collections.

    Args:
        query: Free-text search string.
        private: If True, search the authenticated user's own collections (requires token).
        page: Page number (starts at 1).
        page_size: Results per page (1–50, default 10).
        order: Sort field — e.g. published_date, modified_date, views.
        order_direction: "asc" or "desc".
        institution: Filter by institution ID.
        published_since: ISO 8601 date string (e.g. "2023-01-01").
        modified_since: ISO 8601 date string.
        group: Filter by group ID.

    Returns:
        JSON string with matching collections and pagination metadata.
    """
    client = FigshareClient()
    page_size = clamp_page_size(page_size)

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

    if private:
        if not client.has_token:
            return json.dumps({"error": "FIGSHARE_TOKEN is required to search private collections"})
        # Private collections: use GET with query params (no search POST for account collections).
        params = {
            "page": page,
            "page_size": page_size,
            "order": order,
            "order_direction": order_direction,
        }
        try:
            results = await client.get("/account/collections", params=params)
        except RuntimeError as exc:
            return json.dumps({"error": str(exc)})
    else:
        try:
            results = await client.post("/collections/search", json=body)
        except RuntimeError as exc:
            return json.dumps({"error": str(exc)})

    collections = results if isinstance(results, list) else []
    return json.dumps(
        {
            "collections": collections,
            "count": len(collections),
            "page": page,
            "page_size": page_size,
            "has_more": len(collections) == page_size,
            "note": "Use page+1 to fetch the next page if has_more is true.",
        },
        default=str,
    )


async def get_collection(
    collection_id: int,
    include_articles: bool = True,
    articles_page: int = 1,
    articles_page_size: int = 10,
    private: bool = False,
) -> str:
    """Get full details for a single Figshare collection, optionally including its articles.

    Args:
        collection_id: Numeric Figshare collection ID.
        include_articles: Also fetch the first page of articles in this collection.
        articles_page: Page number for articles listing (starts at 1).
        articles_page_size: Articles per page (1–50, default 10).
        private: If True, fetch from the authenticated user's private collections (requires token).

    Returns:
        JSON string with collection details and optionally its articles.
    """
    client = FigshareClient()

    if private and not client.has_token:
        return json.dumps({"error": "FIGSHARE_TOKEN is required to fetch private collection details"})

    base_path = (
        f"/account/collections/{collection_id}" if private else f"/collections/{collection_id}"
    )

    try:
        collection = await client.get(base_path)
    except RuntimeError as exc:
        return json.dumps({"error": str(exc)})

    result: dict[str, Any] = {"collection": collection}

    if include_articles:
        articles_page_size = clamp_page_size(articles_page_size)
        try:
            articles = await client.get(
                f"/collections/{collection_id}/articles",
                params={"page": articles_page, "page_size": articles_page_size},
            )
            result["articles"] = articles
            result["articles_page"] = articles_page
            result["articles_has_more"] = len(articles) == articles_page_size
        except RuntimeError as exc:
            result["articles_error"] = str(exc)

    return json.dumps(result, default=str)


async def manage_collection(
    action: str,
    collection_id: int | None = None,
    title: str | None = None,
    description: str | None = None,
    articles: list[int] | None = None,
    tags: list[str] | None = None,
    categories: list[int] | None = None,
    authors: list[dict] | None = None,
    doi: str | None = None,
    group_id: int | None = None,
    funding: str | None = None,
) -> str:
    """Create or update a Figshare collection. Requires authentication token.

    This tool never publishes — it only creates/edits drafts.

    Args:
        action: "create" to create a new collection, "update" to edit an existing one.
        collection_id: Required when action is "update".
        title: Collection title. Required when action is "create".
        description: Collection description (HTML or plain text).
        articles: List of article IDs to include in the collection.
        tags: List of keyword tags.
        categories: List of category IDs.
        authors: List of author objects. Each can be {"name": "..."} or {"id": 123}.
        doi: Custom DOI.
        group_id: Group ID to associate the collection with.
        funding: Funding acknowledgement string.

    Returns:
        JSON string with the created/updated collection details or an error message.
    """
    client = FigshareClient()

    if not client.has_token:
        return json.dumps({"error": "FIGSHARE_TOKEN is required to create or update collections"})

    if action not in ("create", "update"):
        return json.dumps({"error": f"Invalid action '{action}'. Use 'create' or 'update'."})

    if action == "create" and not title:
        return json.dumps({"error": "title is required when action is 'create'"})

    if action == "update" and collection_id is None:
        return json.dumps({"error": "collection_id is required when action is 'update'"})

    # Build body with only non-None fields.
    body: dict[str, Any] = {}
    if title is not None:
        body["title"] = title
    if description is not None:
        body["description"] = description
    if articles is not None:
        body["articles"] = articles
    if tags is not None:
        body["tags"] = tags
    if categories is not None:
        body["categories"] = categories
    if authors is not None:
        body["authors"] = authors
    if doi is not None:
        body["doi"] = doi
    if group_id is not None:
        body["group_id"] = group_id
    if funding is not None:
        body["funding"] = funding

    try:
        if action == "create":
            result = await client.post("/account/collections", json=body)
            return json.dumps({"success": True, "action": "created", "collection": result}, default=str)
        else:
            await client.put(f"/account/collections/{collection_id}", json=body)
            updated = await client.get(f"/account/collections/{collection_id}")
            return json.dumps({"success": True, "action": "updated", "collection": updated}, default=str)
    except RuntimeError as exc:
        return json.dumps({"error": str(exc)})
