# MessengerFlow MCP Server

[![npm](https://img.shields.io/npm/v/@messengerflow/mcp-server)](https://www.npmjs.com/package/@messengerflow/mcp-server)

MCP server for [MessengerFlow](https://messengerflow.com) — manage campaigns, accounts, leads, inbox, and analytics from AI assistants like Claude Desktop.

## Setup

### Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "messengerflow": {
      "command": "npx",
      "args": ["@messengerflow/mcp-server"],
      "env": {
        "MESSENGERFLOW_API_KEY": "mf_your_key_here"
      }
    }
  }
}
```

### Remote Server (OAuth)

No API key needed — authenticates with your MessengerFlow account:

```json
{
  "mcpServers": {
    "messengerflow": {
      "url": "https://mcp.messengerflow.com/mcp"
    }
  }
}
```

### Local Development

```bash
cd mcp
npm install
MESSENGERFLOW_API_KEY=mf_your_key npm run dev
```

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MESSENGERFLOW_API_KEY` | Yes | — | API key (starts with `mf_`) |
| `MESSENGERFLOW_BASE_URL` | No | `https://app.messengerflow.com/api/v1` | API base URL |

To get your API key:
1. Log in to [app.messengerflow.com](https://app.messengerflow.com)
2. Go to **Settings > API Keys**
3. Click **Create API Key** and copy the key (starts with `mf_`)

## Tools

| Tool | Description |
|------|-------------|
| `manage_campaigns` | Create, update, start/stop, delete campaigns. View leads and activity. |
| `manage_accounts` | Add, update, delete Facebook accounts. View stats and logs. |
| `manage_leads` | Import CSV, scrape groups/pages, merge, export lead collections. |
| `manage_inbox` | View conversations, search, send messages, manage read status. |
| `get_analytics` | Dashboard stats, activity charts, performance metrics. |

## Resources

| URI | Description |
|-----|-------------|
| `messengerflow://dashboard` | Dashboard stats |

## Examples

- "List my campaigns"
- "Show dashboard stats"
- "How many unread messages do I have?"
- "Create a new campaign called 'Spring Launch'"
- "Export leads from collection X"

## Build

```bash
npm run build   # Outputs to dist/
npm start       # Run built version
```
