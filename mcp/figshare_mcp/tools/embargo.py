"""
MCP tool for Figshare article embargo management.

Tools:
  manage_embargo — get, set, or remove embargo on an article
"""

import json
from typing import Any

from figshare_mcp.client import FigshareClient


async def manage_embargo(
    action: str,
    article_id: int | None = None,
    is_embargoed: bool | None = None,
    embargo_date: str | None = None,
    embargo_type: str | None = None,
    embargo_title: str | None = None,
    embargo_reason: str | None = None,
    include_institution_options: bool = False,
) -> str:
    """Get, set, or remove embargo on a Figshare article. Requires authentication token.

    Embargo controls public access to an article's files until a specified date.

    Actions:
      "get"     — retrieve the current embargo status for an article
      "set"     — apply or update an embargo on an article
      "remove"  — lift (delete) the embargo, making the article publicly accessible immediately
      "options" — list available embargo types for your institution (no article_id needed)

    Args:
        action: One of "get", "set", "remove", "options".
        article_id: The article to act on. Required for get/set/remove.
        is_embargoed: Whether to enable the embargo. Required for "set".
        embargo_date: Embargo expiry date in ISO 8601 format (e.g. "2025-12-31"). Required for "set".
        embargo_type: Embargo type string (e.g. "file", "article"). Required for "set".
                      Use action="options" to see valid types for your institution.
        embargo_title: Optional human-readable title for the embargo notice.
        embargo_reason: Optional explanation shown to users who try to access embargoed content.
        include_institution_options: For action="get", also fetch institution-level embargo options.

    Returns:
        JSON string with the embargo details or a confirmation of the action taken.
    """
    client = FigshareClient()

    if not client.has_token:
        return json.dumps({"error": "FIGSHARE_TOKEN is required for all embargo operations"})

    if action not in ("get", "set", "remove", "options"):
        return json.dumps({"error": f"Invalid action '{action}'. Use 'get', 'set', 'remove', or 'options'."})

    # Fetch institution-level embargo options (no article needed).
    if action == "options":
        try:
            options = await client.get("/account/institution/embargo_options")
            return json.dumps({"embargo_options": options}, default=str)
        except RuntimeError as exc:
            return json.dumps({"error": str(exc)})

    # All other actions require an article_id.
    if article_id is None:
        return json.dumps({"error": f"article_id is required for action '{action}'"})

    if action == "get":
        try:
            embargo = await client.get(f"/account/articles/{article_id}/embargo")
            result: dict[str, Any] = {"article_id": article_id, "embargo": embargo}
            if include_institution_options:
                try:
                    result["institution_options"] = await client.get(
                        "/account/institution/embargo_options"
                    )
                except RuntimeError as exc:
                    result["institution_options_error"] = str(exc)
            return json.dumps(result, default=str)
        except RuntimeError as exc:
            return json.dumps({"error": str(exc)})

    if action == "set":
        if is_embargoed is None:
            return json.dumps({"error": "is_embargoed is required for action 'set'"})
        if not embargo_date:
            return json.dumps({"error": "embargo_date is required for action 'set' (ISO 8601, e.g. '2025-12-31')"})
        if not embargo_type:
            return json.dumps({"error": "embargo_type is required for action 'set'. Use action='options' to see valid types."})

        body: dict[str, Any] = {
            "is_embargoed": is_embargoed,
            "embargo_date": embargo_date,
            "embargo_type": embargo_type,
        }
        if embargo_title is not None:
            body["embargo_title"] = embargo_title
        if embargo_reason is not None:
            body["embargo_reason"] = embargo_reason

        try:
            await client.put(f"/account/articles/{article_id}/embargo", json=body)
            # Fetch the updated embargo to confirm.
            updated = await client.get(f"/account/articles/{article_id}/embargo")
            return json.dumps(
                {"success": True, "action": "embargo_set", "article_id": article_id, "embargo": updated},
                default=str,
            )
        except RuntimeError as exc:
            return json.dumps({"error": str(exc)})

    # action == "remove"
    try:
        await client.delete(f"/account/articles/{article_id}/embargo")
        return json.dumps(
            {
                "success": True,
                "action": "embargo_removed",
                "article_id": article_id,
                "note": "The embargo has been lifted. The article is now publicly accessible.",
            }
        )
    except RuntimeError as exc:
        return json.dumps({"error": str(exc)})
