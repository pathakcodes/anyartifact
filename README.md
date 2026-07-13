# AnyArtifact

**Free interactive artifact hosting for any AI agent**

AnyArtifact is a free hosting platform where any AI agent (Claude, GPT, Gemini, or any other) can publish interactive HTML artifacts at a persistent URL. No paid plan required to view; simple API key for publishing.

## Features

- 🚀 **Free hosting** - No paid plans required
- 🔌 **MCP Server** - Auto-discovery for Claude Code and Agent SDK
- 🌐 **Public URLs** - Share artifacts with anyone
- 📝 **Versioning** - Update artifacts without changing URLs
- 🔒 **Sandboxed** - Secure iframe rendering
- ⚡ **Fast** - Lightweight Hono server with SQLite

## Quick Start

### 1. Get an API Key

```bash
curl -X POST https://your-deployment.up.railway.app/api/v1/keys \
  -d '{"label": "My Agent"}'
```

### 2. Publish an Artifact

```bash
curl -X POST https://your-deployment.up.railway.app/api/v1/artifacts \
  -H "Authorization: Bearer aa_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "<!DOCTYPE html><html><body><h1>Hello!</h1></body></html>",
    "title": "My First Artifact"
  }'
```

### 3. View Your Artifact

Open the returned URL in your browser!

## Installation

### Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/anyartifact.git
cd anyartifact

# Install dependencies
npm install

# Seed the database with an API key
npm run db:seed

# Start the development server
npm run dev
```

### Docker

```bash
docker build -t anyartifact .
docker run -p 3000:3000 -v ./data:/app/data anyartifact
```

### Deploy to Railway

1. Create a free account at [railway.app](https://railway.app)
2. Connect your GitHub repository
3. Add a volume mount at `/app/data`
4. Deploy!

Your app will be live at `https://your-project.up.railway.app`

## API Reference

### Artifacts

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/artifacts` | ✅ | Publish new artifact |
| `PUT` | `/api/v1/artifacts/:id` | ✅ | Update artifact |
| `DELETE` | `/api/v1/artifacts/:id` | ✅ | Delete artifact |
| `GET` | `/api/v1/artifacts` | ❌ | List artifacts |
| `GET` | `/api/v1/artifacts/:id` | ❌ | Get metadata |
| `GET` | `/api/v1/artifacts/:id/raw` | ❌ | Get raw HTML |

### API Keys

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/keys` | Create new API key |

### MCP Server

| Endpoint | Description |
|----------|-------------|
| `GET` | `/mcp/tools` | List available tools |
| `POST` | `/mcp/tools/call` | Execute a tool |

## MCP Integration

### Claude Code

Add AnyArtifact to your Claude Code settings:

```bash
claude mcp add anyartifact https://your-deployment.up.railway.app/mcp
```

### Agent SDK

```typescript
import { Client } from "@anthropic-ai/sdk";

const client = new Client({
  mcpServers: {
    anyartifact: {
      url: "https://your-deployment.up.railway.app/mcp"
    }
  }
});
```

## CLI Tool

```bash
# Install the CLI
cd cli && npm install

# Initialize
anyartifact init

# Publish from file
anyartifact publish ./my-artifact.html --title "My Chart"

# Update existing artifact
anyartifact update aB3kL9mN2pQr ./updated-artifact.html

# List artifacts
anyartifact list
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `BASE_URL` | `http://localhost:3000` | Public URL for artifacts |
| `DATABASE_PATH` | `./data/anyartifact.db` | SQLite database path |
| `RATE_LIMIT_PUBLISH` | `60` | Requests per minute for publishing |
| `RATE_LIMIT_VIEW` | `1000` | Requests per minute for viewing |

## Security

- **Sandboxed iframes** - Artifacts run in isolated iframes
- **Rate limiting** - Prevents abuse
- **Content validation** - Max 500KB, must be valid HTML
- **API key authentication** - Required for publishing

## License

MIT
