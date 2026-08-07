"""
MCP tool for Figshare account information.

Tools:
  get_account_info — retrieve profile, licenses, categories, and institution embargo options
"""

import json

from figshare_mcp.client import FigshareClient


async def get_account_info(
    include_profile: bool = True,
    include_licenses: bool = True,
    include_categories: bool = True,
    include_embargo_options: bool = False,
) -> str:
    """Retrieve Figshare account metadata: user profile, available licenses, categories, and embargo options.

    Use this tool to look up valid license IDs or category IDs before creating/updating articles.

    Args:
        include_profile: Include the authenticated user's profile details (requires token).
        include_licenses: Include the list of available licenses and their IDs.
        include_categories: Include the Figshare taxonomy of subject categories.
        include_embargo_options: Include the institution-level embargo configuration (requires token).

    Returns:
        JSON string with the requested account information sections.
    """
    client = FigshareClient()
    result = {}
    errors = {}

    if include_profile:
        if not client.has_token:
            errors["profile"] = "FIGSHARE_TOKEN is required to fetch profile"
        else:
            try:
                result["profile"] = await client.get("/account")
            except RuntimeError as exc:
                errors["profile"] = str(exc)

    if include_licenses:
        try:
            result["licenses"] = await client.get("/licenses")
        except RuntimeError as exc:
            errors["licenses"] = str(exc)

    if include_categories:
        try:
            result["categories"] = await client.get("/categories")
        except RuntimeError as exc:
            errors["categories"] = str(exc)

    if include_embargo_options:
        if not client.has_token:
            errors["embargo_options"] = "FIGSHARE_TOKEN is required to fetch embargo options"
        else:
            try:
                result["embargo_options"] = await client.get("/account/institution/embargo_options")
            except RuntimeError as exc:
                errors["embargo_options"] = str(exc)

    if errors:
        result["errors"] = errors

    return json.dumps(result, default=str)
