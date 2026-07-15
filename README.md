<h1 align="center">
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#5c5cff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 10px;">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
  </svg>
  <span style="vertical-align: middle;">AnyArtifact</span>
</h1>

<p align="center">
  <strong>Free interactive web page hosting for any AI agent workflow</strong>
</p>

<p align="center">
  <a href="https://anyartifact-production.up.railway.app"><strong>anyartifact-production.up.railway.app</strong></a>
</p>

<p align="center">
  <a href="https://anyartifact-production.up.railway.app/health"><img src="https://img.shields.io/website?url=https%3A%2F%2Fanyartifact-production.up.railway.app%2Fhealth&label=status&up_color=10b981&down_color=ef4444" alt="Website Status"></a>
</p>

---

AnyArtifact is a free hosting platform where any AI assistant (Claude Code, Cursor, Cline, etc.) can publish interactive HTML artifacts (dashboards, prototypes, maps) instantly. No signups required for viewing, and fully integrated with the Model Context Protocol (MCP).

## Features

* 🚀 **Zero Config Hosting** - Instant deployment of sandboxed HTML content
* 🔌 **Model Context Protocol (MCP)** - Direct connection to Claude Code and Cursor
* 📱 **Viewport Simulator** - Test designs inside Desktop, Tablet, and Mobile viewport frames
* 📝 **Version History** - AI agents can overwrite previous pages to create version tracks
* 🔒 **Visibility Controls** - Toggle between Public, Private (token-based), or Password-Protected
* ⚡ **Optimized Engine** - Built with Hono, TypeScript, and compiled Node.js for zero cold starts

## Quick Start

### 1. Register MCP Server
Add AnyArtifact as a tool to your AI agent of choice:

**Claude Code**:
```bash
claude mcp add --transport sse anyartifact https://anyartifact-production.up.railway.app/mcp
```

**Cursor / Windsurf**:
Add as an SSE MCP Server inside settings pointing to:
`https://anyartifact-production.up.railway.app/mcp`

### 2. Supply Agent Instructions
Add the following rule to your `.cursorrules` or `.clinerules` to let the agent auto-deploy:

```markdown
## AnyArtifact Integration

When creating interactive HTML artifacts (charts, dashboards, visualizations, reports, or web pages), use the AnyArtifact MCP tools to publish them.

MCP Server: https://anyartifact-production.up.railway.app/mcp
Tools: publish_artifact, update_artifact, get_artifact, list_artifacts

Workflow:
1. Generate the HTML content.
2. Call publish_artifact with the code and title.
3. Use visibility "public" so the user can view it.
4. Return the deployment URL to the user.
```

## API Reference

### Artifacts

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/artifacts` | ✅ | Publish a new HTML page |
| `PUT` | `/api/v1/artifacts/:id` | ✅ | Push a new version to the page |
| `DELETE` | `/api/v1/artifacts/:id` | ✅ | Delete a page permanently |
| `GET` | `/api/v1/artifacts` | ❌ | Retrieve recent public pages |
| `GET` | `/api/v1/artifacts/:id` | ❌ | Get page details & versions |

### MCP Server

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/mcp/tools` | List available MCP tools |
| `POST` | `/mcp/tools/call` | Execute a tool |

---

## Installation & Local Development

### Prerequisites
* Node.js >= 20.0.0
* npm

### Running Locally

```bash
# Clone the repository
git clone https://github.com/pathakcodes/anyartifact.git
cd anyartifact

# Install dependencies
npm install

# Seed the database and generate local developer keys
npm run db:seed

# Start the development server
npm run dev
```

### Docker Builds (Production Ready)

```bash
# Compile and run container
docker build -t anyartifact .
docker run -p 3000:3000 -v ./data:/app/data anyartifact
```

---

## History & Releases

### v1.2.0 (July 15, 2026)
* **Revamped UX/UI**: Designed a developer-first dark console layout (mimicking Geist/Linear) with grid backdrops and monochrome borders.
* **Interactive Prompts**: Added a horizontal marquee ribbon featuring click-to-copy Mars example prompts.
* **Viewport simulator**: Added Desktop, Tablet, and Mobile simulation buttons to preview published pages on various screen dimensions.
* **Typing Optimizations**: Switched compiler resolution to `NodeNext` and resolved type shadowing for `sql.js`.
* **Deployment Refactoring**: Changed production dockerization to build and run compiled standard Node (`node dist/index.js`) instead of `tsx` wrapper.
* **DB Bug Fixes**: Corrected database migration order where index generations were running before `ALTER TABLE` columns were created.

### v1.1.0 (June 2026)
* **Security & Tokens**: Added owner token checks and password-protected visibility mode.

### v1.0.0 (May 2026)
* **First Launch**: Introduced Hono HTTP API, sql.js backend, and the initial Model Context Protocol SSE server endpoints.
