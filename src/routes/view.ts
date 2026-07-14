import { Hono } from 'hono';
import { getArtifact, getArtifactContent, getArtifactByShareToken, listArtifacts, NotFoundError } from '../services/artifact.js';
import { viewRateLimit } from '../middleware/rate-limit.js';

const viewRoutes = new Hono();

// Middleware to skip API and MCP routes
viewRoutes.use('*', async (c, next) => {
  const path = c.req.path;
  if (path.startsWith('/api/') || path.startsWith('/mcp') || path === '/health') {
    return next();
  }
  await next();
});

// GET / - Landing page with recent artifacts
viewRoutes.get('/', viewRateLimit(), async (c) => {
  const { artifacts } = await listArtifacts(1, 10);

  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AnyArtifact — Free AI Artifact Hosting</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Inter',system-ui,sans-serif;background:#09090b;color:#fafafa;-webkit-font-smoothing:antialiased}
    a{color:inherit;text-decoration:none}

    /* NAV */
    nav{position:sticky;top:0;z-index:50;background:rgba(9,9,11,.85);backdrop-filter:blur(12px);border-bottom:1px solid rgba(255,255,255,.06)}
    .nav-inner{max-width:1100px;margin:0 auto;padding:0 2rem;height:56px;display:flex;align-items:center;justify-content:space-between}
    .nav-brand{display:flex;align-items:center;gap:10px;font-weight:700;font-size:1rem}
    .nav-brand .logo{width:28px;height:28px;background:linear-gradient(135deg,#6366f1,#a855f7);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:.8rem}
    .nav-links{display:flex;gap:2rem;font-size:.85rem;color:#a1a1aa}
    .nav-links a:hover{color:#fafafa}
    .nav-cta{background:#fafafa;color:#09090b;padding:7px 16px;border-radius:8px;font-size:.8rem;font-weight:600;cursor:pointer;border:none;transition:opacity .15s}
    .nav-cta:hover{opacity:.9}

    /* HERO */
    .hero{max-width:1100px;margin:0 auto;padding:5rem 2rem 3rem;text-align:center}
    .hero-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(99,102,241,.12);border:1px solid rgba(99,102,241,.25);color:#818cf8;padding:5px 14px;border-radius:999px;font-size:.75rem;font-weight:500;margin-bottom:1.5rem}
    .hero h1{font-size:3.2rem;font-weight:800;line-height:1.1;letter-spacing:-.03em;margin-bottom:1rem}
    .hero h1 span{background:linear-gradient(135deg,#818cf8,#c084fc,#f472b6);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
    .hero p{color:#a1a1aa;font-size:1.1rem;max-width:560px;margin:0 auto 2rem;line-height:1.6}
    .hero-btns{display:flex;gap:12px;justify-content:center}
    .btn-primary{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:12px 28px;border-radius:10px;font-size:.9rem;font-weight:600;border:none;cursor:pointer;transition:transform .15s,box-shadow .15s}
    .btn-primary:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(99,102,241,.3)}
    .btn-secondary{background:rgba(255,255,255,.06);color:#fafafa;padding:12px 28px;border-radius:10px;font-size:.9rem;font-weight:500;border:1px solid rgba(255,255,255,.08);cursor:pointer;transition:border-color .15s}
    .btn-secondary:hover{border-color:rgba(255,255,255,.2)}

    /* PROMPT BOX */
    .prompt-section{max-width:800px;margin:0 auto 4rem;padding:0 2rem}
    .prompt-card{background:linear-gradient(135deg,rgba(99,102,241,.08),rgba(168,85,247,.05));border:1px solid rgba(99,102,241,.2);border-radius:16px;padding:1.5rem;position:relative}
    .prompt-card .label{position:absolute;top:-11px;left:20px;background:#6366f1;color:#fff;padding:3px 12px;border-radius:8px;font-size:.7rem;font-weight:600;letter-spacing:.3px}
    .prompt-card pre{background:#0f0f11;border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:1rem 1.25rem;font-family:'JetBrains Mono',monospace;font-size:.78rem;color:#d4d4d8;line-height:1.7;overflow-x:auto;white-space:pre-wrap;word-break:break-word;margin-top:8px}
    .prompt-card .copy{position:absolute;top:14px;right:14px;background:rgba(255,255,255,.08);color:#d4d4d8;border:1px solid rgba(255,255,255,.08);padding:6px 14px;border-radius:8px;font-size:.75rem;font-weight:500;cursor:pointer;transition:all .15s}
    .prompt-card .copy:hover{background:rgba(255,255,255,.12)}
    .prompt-card .copy.ok{background:#22c55e;color:#000;border-color:#22c55e}

    /* TOOLS GRID */
    .tools-section{max-width:1100px;margin:0 auto 4rem;padding:0 2rem}
    .section-label{font-size:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#6366f1;margin-bottom:.75rem}
    .section-title{font-size:1.5rem;font-weight:700;margin-bottom:.5rem}
    .section-desc{color:#a1a1aa;font-size:.9rem;margin-bottom:1.5rem}
    .tools-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
    .tool-item{display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:12px 16px;cursor:pointer;transition:all .15s}
    .tool-item:hover{border-color:rgba(99,102,241,.4);background:rgba(99,102,241,.05)}
    .tool-item .left{display:flex;align-items:center;gap:10px}
    .tool-item .dot{width:8px;height:8px;border-radius:50%;background:#22c55e}
    .tool-item .name{font-size:.85rem;font-weight:500}
    .tool-item .hint{font-size:.7rem;color:#52525b}
    .tool-item .hint.done{color:#22c55e}

    /* FEATURES */
    .features{max-width:1100px;margin:0 auto 4rem;padding:0 2rem}
    .feat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
    .feat-card{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:1.5rem;transition:border-color .2s}
    .feat-card:hover{border-color:rgba(99,102,241,.3)}
    .feat-card .icon{font-size:1.5rem;margin-bottom:.75rem}
    .feat-card h3{font-size:.95rem;font-weight:600;margin-bottom:.35rem}
    .feat-card p{color:#71717a;font-size:.82rem;line-height:1.5}

    /* HOW IT WORKS */
    .how{max-width:1100px;margin:0 auto 4rem;padding:0 2rem}
    .steps{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:1.5rem}
    .step{position:relative;padding:1.5rem;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:14px}
    .step .num{position:absolute;top:-12px;left:20px;background:#6366f1;color:#fff;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:700}
    .step h3{font-size:.9rem;font-weight:600;margin-bottom:.35rem;margin-top:.25rem}
    .step p{color:#71717a;font-size:.8rem;line-height:1.5}
    .step code{font-family:'JetBrains Mono',monospace;font-size:.72rem;background:rgba(255,255,255,.06);padding:2px 6px;border-radius:4px;color:#c084fc}

    /* API REFERENCE */
    .api{max-width:1100px;margin:0 auto 4rem;padding:0 2rem}
    .api-card{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:1.5rem;overflow:hidden}
    .api-row{display:flex;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.04)}
    .api-row:last-child{border:none}
    .api-method{font-family:'JetBrains Mono',monospace;font-size:.72rem;font-weight:600;padding:3px 8px;border-radius:4px;min-width:50px;text-align:center}
    .api-method.post{background:rgba(34,197,94,.12);color:#4ade80}
    .api-method.put{background:rgba(234,179,8,.12);color:#facc15}
    .api-method.get{background:rgba(56,189,248,.12);color:#38bdf8}
    .api-method.del{background:rgba(239,68,68,.12);color:#f87171}
    .api-path{font-family:'JetBrains Mono',monospace;font-size:.8rem;color:#d4d4d8;margin-left:12px;flex:1}
    .api-desc{color:#52525b;font-size:.78rem}

    /* MCP SECTION */
    .mcp-section{max-width:1100px;margin:0 auto 4rem;padding:0 2rem}
    .mcp-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px}
    .mcp-card{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:1.25rem}
    .mcp-card h3{font-size:.85rem;font-weight:600;margin-bottom:.75rem;display:flex;align-items:center;gap:6px}
    .mcp-card p{color:#52525b;font-size:.75rem;margin-top:8px}
    .mcp-url{background:#0f0f11;border:1px solid rgba(255,255,255,.06);border-radius:8px;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;transition:border-color .15s}
    .mcp-url:hover{border-color:rgba(99,102,241,.4)}
    .mcp-url code{font-family:'JetBrains Mono',monospace;font-size:.72rem;color:#c084fc}
    .mcp-url .hint{font-size:.65rem;color:#52525b}
    .mcp-tools{display:flex;flex-direction:column;gap:6px}
    .mcp-tool{display:flex;align-items:center;justify-content:space-between;background:#0f0f11;border-radius:6px;padding:8px 10px}
    .mcp-tool code{font-family:'JetBrains Mono',monospace;font-size:.72rem;color:#38bdf8}
    .mcp-tool span{font-size:.68rem;color:#52525b}
    .mcp-ep{display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.04)}
    .mcp-ep:last-child{border:none}
    .mcp-ep code{font-family:'JetBrains Mono',monospace;font-size:.72rem;color:#4ade80}
    .mcp-ep span{font-size:.68rem;color:#52525b}
    .mcp-proto{display:flex;flex-wrap:wrap;gap:6px}
    .proto-item .badge{background:rgba(99,102,241,.12);border:1px solid rgba(99,102,241,.25);color:#818cf8;padding:4px 10px;border-radius:6px;font-size:.68rem;font-weight:500}
    .mcp-example{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:1.25rem}
    .mcp-example h3{font-size:.85rem;font-weight:600;margin-bottom:.75rem}
    .mcp-example pre{background:#0f0f11;border:1px solid rgba(255,255,255,.06);border-radius:8px;padding:1rem;font-family:'JetBrains Mono',monospace;font-size:.72rem;color:#d4d4d8;line-height:1.6;overflow-x:auto}

    /* FOOTER */
    footer{border-top:1px solid rgba(255,255,255,.06);padding:2rem;text-align:center;color:#52525b;font-size:.8rem}
    footer a{color:#a1a1aa}
    footer a:hover{color:#fafafa}

    @media(max-width:768px){.tools-grid,.feat-grid,.steps,.mcp-grid{grid-template-columns:1fr}.hero h1{font-size:2rem}}
  </style>
</head>
<body>
  <nav>
    <div class="nav-inner">
      <div class="nav-brand"><div class="logo">⚡</div>AnyArtifact</div>
      <div class="nav-links">
        <a href="#setup">Setup</a>
        <a href="#features">Features</a>
        <a href="#mcp">MCP</a>
        <a href="#api">API</a>
        <a href="https://github.com/pathakcodes/anyartifact">GitHub</a>
      </div>
      <button class="nav-cta" onclick="document.getElementById('prompt').scrollIntoView({behavior:'smooth'})">Get Started</button>
    </div>
  </nav>

  <section class="hero">
    <div class="hero-badge">⚡ Open Source & Free Forever</div>
    <h1>Interactive artifacts for<br><span>any AI agent</span></h1>
    <p>Publish HTML artifacts from Claude, Cursor, Cline, or any tool. No API key needed. Get a URL in seconds.</p>
    <div class="hero-btns">
      <button class="btn-primary" onclick="document.getElementById('prompt').scrollIntoView({behavior:'smooth'})">Quick Start →</button>
      <a href="https://github.com/pathakcodes/anyartifact" class="btn-secondary">View on GitHub</a>
    </div>
  </section>

  <section class="prompt-section" id="prompt">
    <div class="prompt-card">
      <div class="label">📋 SYSTEM PROMPT — COPY TO YOUR CODING ASSISTANT</div>
      <button class="copy" onclick="copyPrompt(this)">📋 Copy</button>
      <pre><code>AnyArtifact MCP Server: https://anyartifact-production.up.railway.app/mcp
MCP Tools: publish_artifact, update_artifact, get_artifact, list_artifacts
API Endpoint: https://anyartifact-production.up.railway.app/api/v1/artifacts

When I ask you to create an interactive HTML artifact (chart, dashboard, visualization, report, or any web page), publish it to AnyArtifact using the publish_artifact MCP tool. Use visibility "public" so anyone with the link can view it. After publishing, give me the URL. The MCP server is already configured — just call publish_artifact with content and title.</code></pre>
    </div>
  </section>

  <section class="tools-section" id="setup">
    <div class="section-label">Setup</div>
    <div class="section-title">One command to get started</div>
    <div class="section-desc">Add AnyArtifact to your favorite coding tool</div>
    <div class="tools-grid">
      <div class="tool-item" onclick="copyTool(this,'claude mcp add anyartifact https://anyartifact-production.up.railway.app/mcp')"><div class="left"><span class="dot"></span><span class="name">Claude Code</span></div><span class="hint">copy</span></div>
      <div class="tool-item" onclick="copyTool(this,'https://anyartifact-production.up.railway.app/mcp')"><div class="left"><span class="dot"></span><span class="name">Cline</span></div><span class="hint">copy URL</span></div>
      <div class="tool-item" onclick="copyTool(this,'{\"anyartifact\":{\"url\":\"https://anyartifact-production.up.railway.app/mcp\"}}')"><div class="left"><span class="dot"></span><span class="name">KiloCode</span></div><span class="hint">copy JSON</span></div>
      <div class="tool-item" onclick="copyTool(this,'{\"anyartifact\":{\"url\":\"https://anyartifact-production.up.railway.app/mcp\"}}')"><div class="left"><span class="dot"></span><span class="name">Cursor</span></div><span class="hint">copy JSON</span></div>
      <div class="tool-item" onclick="copyTool(this,'https://anyartifact-production.up.railway.app/mcp')"><div class="left"><span class="dot"></span><span class="name">OpenCode</span></div><span class="hint">copy URL</span></div>
      <div class="tool-item" onclick="copyTool(this,'https://anyartifact-production.up.railway.app/mcp')"><div class="left"><span class="dot"></span><span class="name">Windsurf</span></div><span class="hint">copy URL</span></div>
    </div>
  </section>

  <section class="features" id="features">
    <div class="section-label">Features</div>
    <div class="section-title">Everything you need</div>
    <div class="section-desc">Publish, share, and manage interactive artifacts</div>
    <div class="feat-grid">
      <div class="feat-card"><div class="icon">🌐</div><h3>Public Sharing</h3><p>Anyone with the link can view. Perfect for demos, dashboards, and reports.</p></div>
      <div class="feat-card"><div class="icon">🔑</div><h3>Password Protection</h3><p>Set a password. Only people who know it can view the artifact.</p></div>
      <div class="feat-card"><div class="icon">🔒</div><h3>Private by Default</h3><p>Only you can see it via your owner URL. Change anytime from the toolbar.</p></div>
      <div class="feat-card"><div class="icon">📦</div><h3>Versioned</h3><p>Update artifacts without changing URLs. View any version from the dropdown.</p></div>
      <div class="feat-card"><div class="icon">🔌</div><h3>MCP Integration</h3><p>Works with any MCP-compatible tool. Auto-discover publish and update tools.</p></div>
      <div class="feat-card"><div class="icon">🆓</div><h3>No API Key</h3><p>Anyone can publish. No signup, no auth. Just POST and get your URL.</p></div>
    </div>
  </section>

  <section class="how">
    <div class="section-label">How it works</div>
    <div class="section-title">Three steps to your artifact</div>
    <div class="steps">
      <div class="step"><div class="num">1</div><h3>Publish</h3><p>POST your HTML to the API or use the MCP tool. No authentication required.</p><code>POST /api/v1/artifacts</code></div>
      <div class="step"><div class="num">2</div><h3>Get your URL</h3><p>Receive an <code>owner_url</code>, <code>share_url</code>, and direct <code>url</code> in the response.</p><code>owner_url</code></div>
      <div class="step"><div class="num">3</div><h3>Manage</h3><p>Open your owner URL. Click the visibility badge to switch between Public, Password, or Private.</p><code>visibility badge</code></div>
    </div>
  </section>

  <section class="mcp-section" id="mcp">
    <div class="section-label">MCP Server</div>
    <div class="section-title">Native MCP protocol support</div>
    <div class="section-desc">Connect AnyArtifact directly to your AI agent via Model Context Protocol</div>
    <div class="mcp-grid">
      <div class="mcp-card">
        <h3>🔌 Server URL</h3>
        <div class="mcp-url" onclick="copyTool(this,'https://anyartifact-production.up.railway.app/mcp')">
          <code>https://anyartifact-production.up.railway.app/mcp</code>
          <span class="hint">copy</span>
        </div>
        <p>SSE + JSON-RPC transport</p>
      </div>
      <div class="mcp-card">
        <h3>🛠️ Available Tools</h3>
        <div class="mcp-tools">
          <div class="mcp-tool"><code>publish_artifact</code><span>Create new artifact</span></div>
          <div class="mcp-tool"><code>update_artifact</code><span>Update existing</span></div>
          <div class="mcp-tool"><code>get_artifact</code><span>Get metadata</span></div>
          <div class="mcp-tool"><code>list_artifacts</code><span>List public</span></div>
        </div>
      </div>
      <div class="mcp-card">
        <h3>📡 Endpoints</h3>
        <div class="mcp-ep"><code>/mcp/sse</code><span>SSE connection</span></div>
        <div class="mcp-ep"><code>/mcp/message</code><span>JSON-RPC messages</span></div>
        <div class="mcp-ep"><code>/mcp/tools</code><span>List tools (REST)</span></div>
        <div class="mcp-ep"><code>/mcp/tools/call</code><span>Call tool (REST)</span></div>
      </div>
      <div class="mcp-card">
        <h3>⚡ Protocol</h3>
        <div class="mcp-proto">
          <div class="proto-item"><span class="badge">JSON-RPC 2.0</span></div>
          <div class="proto-item"><span class="badge">SSE Transport</span></div>
          <div class="proto-item"><span class="badge">Session Mgmt</span></div>
          <div class="proto-item"><span class="badge">v2024-11-05</span></div>
        </div>
        <p style="margin-top:10px">Supports <code style="color:#818cf8">initialize</code>, <code style="color:#818cf8">tools/list</code>, <code style="color:#818cf8">tools/call</code></p>
      </div>
    </div>
    <div class="mcp-example">
      <h3>Example: MCP tool call</h3>
      <pre><code>{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "publish_artifact",
    "arguments": {
      "content": "&lt;!DOCTYPE html&gt;&lt;html&gt;&lt;body&gt;&lt;h1&gt;Hello!&lt;/h1&gt;&lt;/body&gt;&lt;/html&gt;",
      "title": "My Artifact",
      "visibility": "public"
    }
  }
}</code></pre>
    </div>
  </section>

  <section class="api" id="api">
    <div class="section-label">API Reference</div>
    <div class="section-title">REST API endpoints</div>
    <div class="section-desc">Full documentation for programmatic access</div>
    <div class="api-card">
      <div class="api-row"><span class="api-method post">POST</span><span class="api-path">/api/v1/artifacts</span><span class="api-desc">Publish a new artifact</span></div>
      <div class="api-row"><span class="api-method put">PUT</span><span class="api-path">/api/v1/artifacts/:id</span><span class="api-desc">Update an existing artifact</span></div>
      <div class="api-row"><span class="api-method get">GET</span><span class="api-path">/api/v1/artifacts</span><span class="api-desc">List recent public artifacts</span></div>
      <div class="api-row"><span class="api-method get">GET</span><span class="api-path">/api/v1/artifacts/:id</span><span class="api-desc">Get artifact metadata</span></div>
      <div class="api-row"><span class="api-method del">DEL</span><span class="api-path">/api/v1/artifacts/:id</span><span class="api-desc">Delete an artifact</span></div>
      <div class="api-row"><span class="api-method put">PUT</span><span class="api-path">/api/v1/artifacts/:id/visibility</span><span class="api-desc">Change visibility settings</span></div>
      <div class="api-row"><span class="api-method post">POST</span><span class="api-path">/api/v1/artifacts/:id/verify</span><span class="api-desc">Verify a password</span></div>
    </div>
  </section>

  <footer>
    Built by <a href="https://github.com/pathakcodes">Shivam Kumar Pathak</a> & Claude · <a href="https://github.com/pathakcodes/anyartifact">GitHub</a> · <a href="/health">Health</a> · <a href="/mcp/tools">MCP Tools</a>
    <div style="margin-top:8px;color:#3f3f46;font-size:.7rem">© 2026 AnyArtifact · Free forever</div>
  </footer>

  <script>
    function copyTool(el, text) {
      navigator.clipboard.writeText(text).then(() => {
        const h = el.querySelector('.hint');
        h.textContent = 'copied!';
        h.classList.add('done');
        setTimeout(() => { h.textContent = text.includes('claude') ? 'copy' : text.includes('{') ? 'copy JSON' : 'copy URL'; h.classList.remove('done'); }, 2000);
      });
    }
    function copyPrompt(btn) {
      const text = btn.parentElement.querySelector('code').textContent;
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = '✅ Copied!';
        btn.classList.add('ok');
        setTimeout(() => { btn.textContent = '📋 Copy'; btn.classList.remove('ok'); }, 2500);
      });
    }
  </script>
</body>
</html>
  `);
});

// GET /share/:token - View artifact via share token
viewRoutes.get('/share/:token', viewRateLimit(), async (c) => {
  try {
    const token = c.req.param('token');
    const artifact = await getArtifactByShareToken(token);
    const { content } = await getArtifactContent(artifact.id);

    // Owner token always grants access (for any visibility)
    const ownerToken = c.req.query('owner');
    const isOwner = ownerToken && artifact.owner_token && ownerToken === artifact.owner_token;

    if (isOwner) {
      return c.html(renderViewer(artifact, content, 1, true));
    }

    // Check visibility
    if (artifact.visibility === 'private') {
      return c.html(renderPasswordPrompt(artifact.id, 'private'), 403);
    }

    if (artifact.visibility === 'password') {
      // Check if password is provided in query
      const pwd = c.req.query('pwd');
      if (pwd) {
        const { verifyArtifactPassword } = await import('../services/artifact.js');
        const valid = await verifyArtifactPassword(artifact.id, pwd);
        if (valid) {
          return c.html(renderViewer(artifact, content, 1, true));
        }
      }
      return c.html(renderPasswordPrompt(artifact.id, 'password'), 403);
    }

    return c.html(renderViewer(artifact, content, 1, true));
  } catch (error) {
    if (error instanceof NotFoundError) {
      return c.html(renderNotFound(), 404);
    }
    throw error;
  }
});

// GET /:id - View artifact
viewRoutes.get('/:id', viewRateLimit(), async (c) => {
  try {
    const id = c.req.param('id');

    // Skip non-artifact routes
    if (['health', 'api', 'mcp'].includes(id) || id.startsWith('api') || id.startsWith('mcp')) {
      return c.json({ error: 'Not found' }, 404);
    }
    const versionParam = c.req.query('version');
    const version = versionParam ? parseInt(versionParam) : undefined;

    const { artifact, content } = await getArtifactContent(id, version);

    // Owner token always grants access (for any visibility)
    const ownerToken = c.req.query('owner');
    const isOwner = ownerToken && artifact.owner_token && ownerToken === artifact.owner_token;

    if (isOwner) {
      const currentVersion = version || 1;
      return c.html(renderViewer(artifact, content, currentVersion, true));
    }

    // Check visibility
    if (artifact.visibility === 'private') {
      return c.html(renderPasswordPrompt(id, 'private'), 403);
    }

    if (artifact.visibility === 'password') {
      const pwd = c.req.query('pwd');
      if (pwd) {
        const { verifyArtifactPassword } = await import('../services/artifact.js');
        const valid = await verifyArtifactPassword(id, pwd);
        if (valid) {
          const currentVersion = version || 1;
          return c.html(renderViewer(artifact, content, currentVersion));
        }
      }
      return c.html(renderPasswordPrompt(id, 'password'), 403);
    }

    // Public - show normally
    const currentVersion = version || 1;
    return c.html(renderViewer(artifact, content, currentVersion));
  } catch (error) {
    if (error instanceof NotFoundError) {
      return c.html(renderNotFound(), 404);
    }
    throw error;
  }
});

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderViewer(artifact: any, content: string, version: number, isShareLink: boolean = false): string {
  const versionOptions = artifact.versions
    ? artifact.versions.map((v: any) =>
        `<option value="${v.version_number}" ${v.version_number === version ? 'selected' : ''}>v${v.version_number}</option>`
      ).join('')
    : `<option value="${version}" selected>v${version}</option>`;

  const vis = artifact.visibility || 'public';
  const visColor = vis === 'private' ? '#ef4444' : vis === 'password' ? '#f59e0b' : '#22c55e';
  const visIcon = vis === 'private' ? '🔒' : vis === 'password' ? '🔑' : '🌐';
  const visLabel = vis === 'private' ? 'Private' : vis === 'password' ? 'Password' : 'Public';

  // Check if owner is viewing (has owner token in URL)
  const isOwner = isShareLink;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(artifact.title)} - AnyArtifact</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; background: #0a0a0a; color: #fff; height: 100vh; display: flex; flex-direction: column; }
    .toolbar { display: flex; align-items: center; gap: 1rem; padding: 0.75rem 1rem; background: #1a1a1a; border-bottom: 1px solid #333; }
    .toolbar h1 { font-size: 0.875rem; font-weight: 500; }
    .toolbar .meta { margin-left: auto; font-size: 0.75rem; color: #888; display: flex; gap: 0.75rem; align-items: center; }
    .toolbar select { background: #333; color: #fff; border: 1px solid #555; border-radius: 4px; padding: 4px 8px; font-size: 0.75rem; cursor: pointer; }
    .toolbar a { color: #6cf; text-decoration: none; font-size: 0.75rem; }
    .toolbar a:hover { text-decoration: underline; }
    .artifact-frame { flex: 1; border: none; background: #fff; }
    .vis-btn { background: ${visColor}; color: ${vis === 'password' ? '#000' : '#fff'}; padding: 4px 10px; border-radius: 12px; font-size: 0.7rem; font-weight: 600; cursor: pointer; border: none; position: relative; }
    .vis-btn:hover { opacity: 0.85; }
    .vis-dropdown { display: none; position: absolute; top: 100%; right: 0; margin-top: 8px; background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 8px 0; min-width: 220px; z-index: 100; box-shadow: 0 8px 24px rgba(0,0,0,.4); }
    .vis-dropdown.show { display: block; }
    .vis-option { padding: 10px 16px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 0.85rem; transition: background 0.15s; }
    .vis-option:hover { background: #334155; }
    .vis-option.active { background: #0f172a; color: #38bdf8; }
    .vis-option .icon { font-size: 1rem; }
    .vis-option .desc { font-size: 0.75rem; color: #64748b; }
    .pwd-section { padding: 12px 16px; border-top: 1px solid #334155; display: none; }
    .pwd-section.show { display: block; }
    .pwd-section input { width: 100%; padding: 8px; background: #0f172a; border: 1px solid #475569; border-radius: 4px; color: #fff; font-size: 0.85rem; margin-bottom: 8px; }
    .pwd-section button { width: 100%; padding: 8px; background: #38bdf8; color: #0f172a; border: none; border-radius: 4px; font-weight: 600; cursor: pointer; font-size: 0.85rem; }
    .pwd-section button:hover { background: #0ea5e9; }
    .pwd-section .hint { font-size: 0.7rem; color: #64748b; margin-top: 4px; }
    .copy-btn { background: #334155; color: #e2e8f0; padding: 4px 10px; border-radius: 12px; font-size: 0.7rem; font-weight: 500; cursor: pointer; border: none; display: flex; align-items: center; gap: 4px; transition: all 0.15s; }
    .copy-btn:hover { background: #475569; }
    .copy-btn.copied { background: #22c55e; color: #000; }
    .toast { position: fixed; bottom: 20px; right: 20px; background: #22c55e; color: #000; padding: 12px 20px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; opacity: 0; transition: opacity 0.3s; z-index: 200; }
    .toast.show { opacity: 1; }
    .toast.error { background: #ef4444; color: #fff; }
  </style>
</head>
<body>
  <div class="toolbar">
    <h1>${escapeHtml(artifact.title)}</h1>
    <div class="meta">
      <div style="position:relative">
        <button class="vis-btn" onclick="toggleVisDropdown()">${visIcon} ${visLabel}</button>
        <div class="vis-dropdown" id="visDropdown">
          <div class="vis-option ${vis === 'public' ? 'active' : ''}" onclick="changeVis('public')">
            <span class="icon">🌐</span>
            <div><div>Public</div><div class="desc">Anyone can view</div></div>
          </div>
          <div class="vis-option ${vis === 'password' ? 'active' : ''}" onclick="changeVis('password')">
            <span class="icon">🔑</span>
            <div><div>Password</div><div class="desc">Requires password</div></div>
          </div>
          <div class="vis-option ${vis === 'private' ? 'active' : ''}" onclick="changeVis('private')">
            <span class="icon">🔒</span>
            <div><div>Private</div><div class="desc">Owner only</div></div>
          </div>
          <div class="pwd-section" id="pwdSection">
            <input type="password" id="newPwd" placeholder="Set password..." />
            <button onclick="savePassword()">Save Password</button>
            <div class="hint">Set a password for password-protected mode</div>
          </div>
        </div>
      </div>
      <button class="copy-btn" onclick="copyUrl(this)" id="copyBtn">📋 Copy URL</button>
      <span>v${version}</span>
      <span>by ${escapeHtml(artifact.author_name || 'Anonymous')}</span>
      <select onchange="switchVersion(this.value)">
        ${versionOptions}
      </select>
      <a href="/api/v1/artifacts/${artifact.id}/raw?version=${version}" target="_blank">Raw</a>
      <a href="/">Gallery</a>
    </div>
  </div>
  <iframe class="artifact-frame" srcdoc="${escapeHtml(content).replace(/"/g, '&quot;')}" sandbox="allow-scripts allow-modals allow-forms allow-popups"></iframe>
  <div class="toast" id="toast"></div>
  <script>
    const ARTIFACT_ID = '${artifact.id}';
    const OWNER_TOKEN = new URLSearchParams(window.location.search).get('owner') || '';

    function switchVersion(v) {
      const url = new URL(window.location.href);
      url.searchParams.set('v', v);
      window.location.href = url.toString();
    }

    function copyUrl(btn) {
      const url = window.location.href;
      navigator.clipboard.writeText(url).then(() => {
        btn.innerHTML = '✅ Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.innerHTML = '📋 Copy URL';
          btn.classList.remove('copied');
        }, 2000);
      }).catch(() => {
        // Fallback
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        btn.innerHTML = '✅ Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.innerHTML = '📋 Copy URL';
          btn.classList.remove('copied');
        }, 2000);
      });
    }

    function toggleVisDropdown() {
      document.getElementById('visDropdown').classList.toggle('show');
    }

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.vis-btn') && !e.target.closest('.vis-dropdown')) {
        document.getElementById('visDropdown').classList.remove('show');
      }
    });

    function showToast(msg, isError = false) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.className = 'toast show' + (isError ? ' error' : '');
      setTimeout(() => t.className = 'toast', 2500);
    }

    async function changeVis(vis) {
      const pwdSection = document.getElementById('pwdSection');
      if (vis === 'password') {
        pwdSection.classList.toggle('show');
        return;
      }
      pwdSection.classList.remove('show');
      try {
        const res = await fetch('/api/v1/artifacts/' + ARTIFACT_ID + '/visibility?owner=' + OWNER_TOKEN, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visibility: vis })
        });
        const data = await res.json();
        if (res.ok) {
          showToast('✅ Changed to ' + vis);
          setTimeout(() => location.reload(), 800);
        } else {
          showToast('❌ ' + (data.error || 'Failed'), true);
        }
      } catch (e) {
        showToast('❌ Network error', true);
      }
    }

    async function savePassword() {
      const pwd = document.getElementById('newPwd').value;
      if (!pwd) { showToast('Enter a password', true); return; }
      try {
        const res = await fetch('/api/v1/artifacts/' + ARTIFACT_ID + '/visibility?owner=' + OWNER_TOKEN, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visibility: 'password', password: pwd })
        });
        const data = await res.json();
        if (res.ok) {
          showToast('✅ Password set!');
          setTimeout(() => location.reload(), 800);
        } else {
          showToast('❌ ' + (data.error || 'Failed'), true);
        }
      } catch (e) {
        showToast('❌ Network error', true);
      }
    }
  </script>
</body>
</html>`;
}

function renderPasswordPrompt(artifactId: string, type: 'private' | 'password'): string {
  const isPrivate = type === 'private';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isPrivate ? 'Private' : 'Password Protected'} - AnyArtifact</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; background: #0a0a0a; color: #fff; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .card { background: #1e293b; border-radius: 16px; padding: 40px; max-width: 400px; width: 90%; text-align: center; border: 1px solid #334155; }
    .icon { font-size: 3rem; margin-bottom: 16px; }
    h1 { font-size: 1.3rem; margin-bottom: 8px; }
    p { color: #94a3b8; font-size: 0.9rem; margin-bottom: 24px; }
    .form-group { margin-bottom: 16px; text-align: left; }
    .form-group label { display: block; font-size: 0.8rem; color: #94a3b8; margin-bottom: 6px; }
    .form-group input { width: 100%; padding: 12px; background: #0f172a; border: 1px solid #334155; border-radius: 8px; color: #fff; font-size: 0.95rem; }
    .form-group input:focus { outline: none; border-color: #38bdf8; }
    button { width: 100%; padding: 12px; background: #38bdf8; color: #0f172a; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: background 0.2s; }
    button:hover { background: #0ea5e9; }
    .error { color: #ef4444; font-size: 0.85rem; margin-top: 12px; display: none; }
    .back { color: #64748b; font-size: 0.8rem; margin-top: 20px; }
    .back a { color: #38bdf8; text-decoration: none; }
    .back a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${isPrivate ? '🔒' : '🔑'}</div>
    <h1>${isPrivate ? 'This artifact is private' : 'Password Protected'}</h1>
    <p>${isPrivate ? 'Only the owner can access this artifact.' : 'Enter the password to view this artifact.'}</p>
    ${isPrivate ? '' : `
    <form id="pwdForm">
      <div class="form-group">
        <label>Password</label>
        <input type="password" id="password" placeholder="Enter password" autofocus />
      </div>
      <button type="submit">Unlock</button>
      <div class="error" id="error">Incorrect password. Try again.</div>
    </form>
    `}
    <div class="back"><a href="/">← Back to AnyArtifact</a></div>
  </div>
  ${!isPrivate ? `
  <script>
    document.getElementById('pwdForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = document.getElementById('password').value;
      const res = await fetch('/api/v1/artifacts/${artifactId}/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (data.valid) {
        window.location.href = '/${artifactId}?pwd=' + encodeURIComponent(password);
      } else {
        document.getElementById('error').style.display = 'block';
      }
    });
  </script>` : ''}
</body>
</html>`;
}

function renderNotFound(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Not Found - AnyArtifact</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0a0a0a; color: #fff; display: flex; justify-content: center; align-items: center; height: 100vh; }
    .error { text-align: center; }
    h1 { font-size: 4rem; color: #333; }
    p { color: #666; margin: 1rem 0; }
    a { color: #6cf; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="error">
    <h1>404</h1>
    <p>Artifact not found</p>
    <a href="/">← Back to AnyArtifact</a>
  </div>
</body>
</html>`;
}

export { viewRoutes };
