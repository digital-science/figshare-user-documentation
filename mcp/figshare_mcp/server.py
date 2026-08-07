"""
Figshare MCP server entry point.

Exposes 9 semantic tools over the MCP stdio transport:
  search_articles     — search public or private articles
  get_article         — get article details, files, and versions
  manage_article      — create or update a draft article (no publish)
  search_collections  — search public or private collections
  get_collection      — get collection details and its articles
  manage_collection   — create or update a collection (no publish)
  get_projects        — list or get details of a project
  get_account_info    — profile, licenses, categories, embargo options
  manage_embargo      — get/set/remove embargo on an article

Configuration via environment variables:
  FIGSHARE_TOKEN    — personal access token (required for private/write operations)
  FIGSHARE_BASE_URL — API base URL (default: https://api.figshare.com/v2)
"""

from mcp.server.fastmcp import FastMCP

from figshare_mcp.tools.account import get_account_info
from figshare_mcp.tools.articles import get_article, manage_article, search_articles
from figshare_mcp.tools.collections import get_collection, manage_collection, search_collections
from figshare_mcp.tools.embargo import manage_embargo
from figshare_mcp.tools.projects import get_projects

# Create the MCP server instance.
mcp = FastMCP("figshare")

# Register all tools — FastMCP reads the function signature and docstring automatically.
mcp.tool()(search_articles)
mcp.tool()(get_article)
mcp.tool()(manage_article)
mcp.tool()(search_collections)
mcp.tool()(get_collection)
mcp.tool()(manage_collection)
mcp.tool()(get_projects)
mcp.tool()(get_account_info)
mcp.tool()(manage_embargo)


def main() -> None:
    """Start the MCP server using stdio transport."""
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
