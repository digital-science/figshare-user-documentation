# figshare-mcp

An MCP (Model Context Protocol) server that exposes the [Figshare API v2](https://docs.figshare.com) as tools for Claude and other MCP-compatible AI assistants.

## What it does

Provides 9 semantic tools for interacting with any Figshare instance:

| Tool | Description |
|------|-------------|
| `search_articles` | Search public or private articles |
| `get_article` | Get article details, files, and version history |
| `manage_article` | Create or update a draft article (never publishes) |
| `search_collections` | Search public or private collections |
| `get_collection` | Get collection details and its articles |
| `manage_collection` | Create or update a collection |
| `get_projects` | List or inspect a project |
| `get_account_info` | Fetch profile, available licenses, and subject categories |
| `manage_embargo` | Get, set, or remove an embargo on an article |

**This MCP never publishes or deletes articles/collections.** Destructive and publish operations must be done via the Figshare web interface.

## Requirements

- Python 3.11+
- Claude Desktop, Claude Code, or any other MCP-compatible client

## Installation

Clone the repo and install the package:

```bash
git clone https://github.com/digital-science/figshare-user-documentation.git
cd figshare-user-documentation/mcp
pip install -e .
```

## Configuration

### 1. Get a personal access token

In Figshare, go to **Account → Applications → Create personal token**.

You only need a token for private/authenticated operations. Public search and read work without a token.

### 2. Add to Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "figshare": {
      "command": "python3",
      "args": ["-m", "figshare_mcp.server"],
      "env": {
        "FIGSHARE_TOKEN": "your-token-here",
        "FIGSHARE_BASE_URL": "https://api.figshare.com/v2"
      }
    }
  }
}
```

For an institutional instance, replace `FIGSHARE_BASE_URL` with your institution's API base URL.

### 3. Add to Claude Code

```bash
claude mcp add figshare \
  -e FIGSHARE_TOKEN=your-token-here \
  -e FIGSHARE_BASE_URL=https://api.figshare.com/v2 \
  -- python3 -m figshare_mcp.server
```

## Usage examples

Once connected, you can ask Claude things like:

- *"Search for articles about climate change published after 2022"*
- *"Get the details and files for article 12345678"*
- *"Create a new draft article titled 'My Dataset' with tags 'climate' and 'ocean'"*
- *"Show me my private articles"*
- *"What embargo options does my institution have?"*
- *"Set an embargo on article 123 until 2026-06-01"*

## Running tests

Integration tests run against a local Figshare instance.

```bash
# Public tests only (no token needed, uses figshare.com):
pytest tests/ -v -m "not requires_token and not write"

# All tests against a local instance:
FIGSHARE_TOKEN=xxx \
FIGSHARE_BASE_URL=http://localhost:8080/v2 \
pytest tests/ -v

# Skip write tests (read-only against local instance):
FIGSHARE_TOKEN=xxx \
FIGSHARE_BASE_URL=http://localhost:8080/v2 \
pytest tests/ -v -m "not write"
```

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FIGSHARE_TOKEN` | For private/write ops | — | Personal access token |
| `FIGSHARE_BASE_URL` | No | `https://api.figshare.com/v2` | API base URL |
