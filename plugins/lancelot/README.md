# Lancelot

An MCP server that answers search and retrieval queries against a local LanceDB database.
With an OpenAI API key it searches by embedding. Without one it falls back to text search.
It runs over stdio and needs Node 20 or newer.

## Tools

| Tool | Parameters | What it does |
|---|---|---|
| `lancedb_search` | `query`, `limit`, `searchType` (`vector`, `text` or `auto`), `table`, `textColumn`, `vectorColumn` | Searches a table and returns the matching rows. |
| `lancedb_query` | `question`, `contextBudget`, `warmStart`, `table`, `limit` | Answers a question with retrieved context, trimmed to the context budget. |
| `lancedb_status` | `verbose` | Reports the state of the database connection and its tables. |
| `lancedb_version` | none | Reports the server version. |

Lancelot also runs as a hosted read-only HTTPS endpoint at https://mcp.ayers.repair/lancelot over the Ayers public docs.

## Environment variables

| Variable | Required | What it sets |
|---|---|---|
| `LANCEDB_PATH` | Yes | Folder that holds the LanceDB database. |
| `LANCEDB_TABLE` | No | Default table. |
| `LANCEDB_TEXT_COLUMN` | No | Default text column. |
| `LANCEDB_VECTOR_COLUMN` | No | Default vector column. |
| `LANCEDB_DEFAULT_LIMIT` | No | Default number of results. |
| `LANCEDB_CONTEXT_BUDGET` | No | Default context budget for `lancedb_query`. |
| `EMBEDDING_MODEL` | No | OpenAI embedding model. |
| `EMBEDDING_DIMENSIONS` | No | Embedding dimensions. |
| `OPENAI_API_KEY` | No | Turns on embeddings. Without it, search is text only. |

## Install in Claude Code

```
/plugin marketplace add ayers-software-repair/marketplace
/plugin install lancelot@ayersrepair
```

Claude Code asks for the database folder and, optionally, an OpenAI API key.
The key is stored in your system's secure credential store.
To change either later, run `/plugin configure lancelot@ayersrepair`.

## Use it without the plugin

```
claude mcp add --env LANCEDB_PATH=/path/to/db --env OPENAI_API_KEY=... --transport stdio lancelot -- npx -y @ayersrepair/lancelot@0.3.0
```

## Other MCP clients

Add this to the client's MCP server configuration:

```json
{
  "mcpServers": {
    "lancelot": {
      "command": "npx",
      "args": ["-y", "@ayersrepair/lancelot@0.3.0"],
      "env": {
        "LANCEDB_PATH": "/path/to/db",
        "OPENAI_API_KEY": "..."
      }
    }
  }
}
```

Leave `OPENAI_API_KEY` out for text search only.

## Privacy

When `OPENAI_API_KEY` is set, query text is sent to OpenAI to compute embeddings. Without a key nothing leaves the machine. The database is only read.

[Privacy policy](https://ayers.repair/legal/lancelot/privacy.html) and [terms](https://ayers.repair/legal/lancelot/terms.html): the full statement, including what the hosted endpoint receives.

## Standard output

The server writes nothing but MCP messages to stdout. Logs go to stderr.
A client reads stdout as protocol messages only, so anything else on it breaks the connection.

## Source

https://github.com/ayers-software-repair/lancelot

Published by Ayers Electronics.

## Listing icon

`.claude-plugin/icon.png` is rendered at 1024 px with the sealed browser from `art/lancelot-icon.svg`, which `node art/lancelot-icon.mjs` at the repository root computes (Lancelot's great helm in the LanceDB mark's colours; computed art, no editor). Edit the generator and re-run it, then re-render; never hand-edit the SVG or the PNG. The directory fixes the icon at first submission.
