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
  <title>AnyArtifact - Free AI Artifact Hosting</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #0a0a0a; color: #e2e8f0; line-height: 1.6; }
    .container { max-width: 900px; margin: 0 auto; padding: 2rem 1.5rem; }
    .hero { text-align: center; padding: 3rem 0 2rem; }
    .hero h1 { font-size: 2.5rem; margin-bottom: 0.5rem; background: linear-gradient(135deg,#38bdf8,#818cf8,#c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .hero .subtitle { color: #94a3b8; font-size: 1.1rem; margin-bottom: 1rem; }
    .hero .tagline { color: #64748b; font-size: 0.9rem; }
    .section { margin: 2rem 0; }
    .section h2 { font-size: 1.3rem; margin-bottom: 1rem; color: #e2e8f0; display: flex; align-items: center; gap: 8px; }
    .section h2 .emoji { font-size: 1.2rem; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem; }
    .card h3 { font-size: 1rem; margin-bottom: 0.5rem; color: #e2e8f0; }
    .card p { color: #94a3b8; font-size: 0.9rem; }
    pre { background: #0f172a; padding: 1rem; border-radius: 8px; overflow-x: auto; font-size: 0.82rem; color: #e2e8f0; border: 1px solid #1e293b; margin: 0.75rem 0; }
    code { font-family: 'SF Mono', 'Fira Code', monospace; }
    .inline-code { background: #334155; padding: 2px 6px; border-radius: 4px; font-size: 0.85rem; }
    .tools-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; margin-top: 1rem; }
    .tool-card { background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 16px; transition: border-color 0.2s; }
    .tool-card:hover { border-color: #38bdf8; }
    .tool-card .name { font-weight: 600; color: #e2e8f0; margin-bottom: 4px; font-size: 0.95rem; }
    .tool-card .cmd { background: #0f172a; padding: 8px 12px; border-radius: 6px; font-family: monospace; font-size: 0.78rem; color: #38bdf8; margin-top: 8px; cursor: pointer; border: 1px solid #1e293b; display: flex; justify-content: space-between; align-items: center; }
    .tool-card .cmd:hover { border-color: #475569; }
    .tool-card .cmd .copy { color: #64748b; font-size: 0.7rem; }
    .vis-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 1rem; }
    .vis-card { background: #1e293b; border-radius: 10px; padding: 16px; text-align: center; border: 1px solid #334155; }
    .vis-card .icon { font-size: 1.5rem; margin-bottom: 8px; }
    .vis-card .label { font-weight: 600; font-size: 0.9rem; margin-bottom: 4px; }
    .vis-card .desc { color: #64748b; font-size: 0.8rem; }
    .artifacts { margin-top: 2rem; }
    .artifacts h2 { margin-bottom: 1rem; }
    .artifact-card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 1rem 1.25rem; margin-bottom: 0.5rem; transition: border-color 0.2s; display: flex; justify-content: space-between; align-items: center; }
    .artifact-card:hover { border-color: #38bdf8; }
    .artifact-card a { color: #38bdf8; text-decoration: none; font-weight: 500; }
    .artifact-card a:hover { text-decoration: underline; }
    .artifact-card .meta { color: #64748b; font-size: 0.8rem; }
    .empty { color: #475569; text-align: center; padding: 2rem; }
    .footer { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid #1e293b; color: #475569; text-align: center; font-size: 0.8rem; }
    .footer a { color: #38bdf8; text-decoration: none; }
    .footer a:hover { text-decoration: underline; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 0.7rem; font-weight: 600; }
    .badge.green { background: rgba(34,197,94,.15); color: #4ade80; }
    .badge.blue { background: rgba(56,189,248,.15); color: #38bdf8; }
    .badge.purple { background: rgba(168,85,247,.15); color: #a855f7; }
  </style>
</head>
<body>
  <div class="container">
    <div class="hero">
      <h1>AnyArtifact</h1>
      <p class="subtitle">Free interactive artifact hosting for any AI agent</p>
      <p class="tagline">Works with Claude Code, Cursor, Cline, KiloCode, OpenCode, and any MCP-compatible tool</p>
    </div>

    <div class="section">
      <h2><span class="emoji">⚡</span> One-Line Setup</h2>
      <p style="color:#94a3b8;margin-bottom:12px;font-size:.9rem">Add AnyArtifact to your coding tool in one command:</p>
      <div class="tools-grid">
        <div class="tool-card">
          <div class="name">Claude Code</div>
          <div class="cmd" onclick="copyCmd(this)"><span>claude mcp add anyartifact https://anyartifact-production.up.railway.app/mcp</span><span class="copy">copy</span></div>
        </div>
        <div class="tool-card">
          <div class="name">Cline</div>
          <div class="cmd" onclick="copyCmd(this)"><span>Add MCP server URL in Cline settings → MCP Servers</span><span class="copy">copy</span></div>
        </div>
        <div class="tool-card">
          <div class="name">KiloCode</div>
          <div class="cmd" onclick="copyCmd(this)"><span>Add to .kilocode/mcp.json: {"anyartifact":{"url":"https://anyartifact-production.up.railway.app/mcp"}}</span><span class="copy">copy</span></div>
        </div>
        <div class="tool-card">
          <div class="name">OpenCode</div>
          <div class="cmd" onclick="copyCmd(this)"><span>Add to opencode.json mcpServers.anyartifact</span><span class="copy">copy</span></div>
        </div>
        <div class="tool-card">
          <div class="name">Cursor</div>
          <div class="cmd" onclick="copyCmd(this)"><span>Add to .cursor/mcp.json: {"anyartifact":{"url":"https://anyartifact-production.up.railway.app/mcp"}}</span><span class="copy">copy</span></div>
        </div>
        <div class="tool-card">
          <div class="name">Windsurf</div>
          <div class="cmd" onclick="copyCmd(this)"><span>Add to .windsurfrules mcp section with the URL above</span><span class="copy">copy</span></div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2><span class="emoji">🔌</span> MCP Server URL</h2>
      <div class="card">
        <p>Copy this URL and add it to any MCP-compatible tool:</p>
        <pre><code>https://anyartifact-production.up.railway.app/mcp</code></pre>
        <p style="font-size:.85rem;color:#64748b">Tools auto-discover: <code class="inline-code">publish_artifact</code>, <code class="inline-code">update_artifact</code>, <code class="inline-code">get_artifact</code>, <code class="inline-code">list_artifacts</code></p>
      </div>
    </div>

    <div class="section">
      <h2><span class="emoji">🚀</span> Publish — No API Key Needed</h2>
      <div class="card">
        <p style="margin-bottom:8px">Anyone can publish. You get an <strong>owner URL</strong> back — that's your key to view and manage the artifact.</p>
        <pre><code>curl -X POST https://anyartifact-production.up.railway.app/api/v1/artifacts \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "&lt;!DOCTYPE html&gt;&lt;html&gt;&lt;body&gt;&lt;h1&gt;Hello!&lt;/h1&gt;&lt;/body&gt;&lt;/html&gt;",
    "title": "My Artifact"
  }'</code></pre>
        <p style="font-size:.85rem;color:#64748b">Default visibility: <code class="inline-code">private</code> (owner only). You'll get an <code class="inline-code">owner_url</code> in the response.</p>
      </div>
    </div>

    <div class="section">
      <h2><span class="emoji">🌐</span> Visibility Controls</h2>
      <div class="vis-grid">
        <div class="vis-card">
          <div class="icon">🌐</div>
          <div class="label">Public</div>
          <div class="desc">Anyone with the link can view</div>
        </div>
        <div class="vis-card">
          <div class="icon">🔑</div>
          <div class="label">Password</div>
          <div class="desc">Requires password to view</div>
        </div>
        <div class="vis-card">
          <div class="icon">🔒</div>
          <div class="label">Private</div>
          <div class="desc">Owner only via owner URL</div>
        </div>
      </div>
      <div class="card" style="margin-top:12px">
        <h3>Publish with visibility</h3>
        <pre><code>curl -X POST https://anyartifact-production.up.railway.app/api/v1/artifacts \\
  -H "Authorization: Bearer aa_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "&lt;!DOCTYPE html&gt;&lt;html&gt;...&lt;/html&gt;",
    "title": "My Artifact",
    "visibility": "password",
    "password": "secret123"
  }'</code></pre>
      </div>
    </div>

    <div class="section">
      <h2><span class="emoji">📡</span> REST API</h2>
      <div class="card">
        <table style="width:100%;font-size:.85rem;border-collapse:collapse">
          <tr style="border-bottom:1px solid #334155"><td style="padding:8px;color:#38bdf8;font-family:monospace">POST /api/v1/artifacts</td><td style="padding:8px;color:#94a3b8">Publish artifact</td></tr>
          <tr style="border-bottom:1px solid #334155"><td style="padding:8px;color:#38bdf8;font-family:monospace">PUT /api/v1/artifacts/:id</td><td style="padding:8px;color:#94a3b8">Update artifact</td></tr>
          <tr style="border-bottom:1px solid #334155"><td style="padding:8px;color:#38bdf8;font-family:monospace">GET /api/v1/artifacts</td><td style="padding:8px;color:#94a3b8">List artifacts</td></tr>
          <tr style="border-bottom:1px solid #334155"><td style="padding:8px;color:#38bdf8;font-family:monospace">GET /api/v1/artifacts/:id</td><td style="padding:8px;color:#94a3b8">Get metadata</td></tr>
          <tr style="border-bottom:1px solid #334155"><td style="padding:8px;color:#38bdf8;font-family:monospace">DELETE /api/v1/artifacts/:id</td><td style="padding:8px;color:#94a3b8">Delete artifact</td></tr>
          <tr style="border-bottom:1px solid #334155"><td style="padding:8px;color:#38bdf8;font-family:monospace">PUT /api/v1/artifacts/:id/visibility</td><td style="padding:8px;color:#94a3b8">Change visibility</td></tr>
          <tr><td style="padding:8px;color:#38bdf8;font-family:monospace">POST /api/v1/artifacts/:id/verify</td><td style="padding:8px;color:#94a3b8">Verify password</td></tr>
        </table>
      </div>
    </div>

    <div class="artifacts">
      <h2><span class="emoji">📦</span> Recent Public Artifacts</h2>
      ${artifacts.length === 0
        ? '<p class="empty">No public artifacts yet. Be the first to publish!</p>'
        : artifacts.map(a => `
        <div class="artifact-card">
          <div>
            <a href="/${a.id}">${escapeHtml(a.title)}</a>
            <div class="meta">by ${escapeHtml(a.author_name)} · ${new Date(a.created_at).toLocaleDateString()}</div>
          </div>
          <span class="badge green">🌐 Public</span>
        </div>
      `).join('')}
    </div>

    <div class="footer">
      <p>Built by <a href="https://github.com/pathakcodes">Shivam Kumar Pathak</a> & Claude</p>
      <p style="margin-top:6px"><a href="https://github.com/pathakcodes/anyartifact">GitHub</a> · <a href="/health">Health</a> · <a href="/mcp/tools">MCP Tools</a></p>
    </div>
  </div>
  <script>
    function copyCmd(el) {
      const text = el.querySelector('span').textContent;
      navigator.clipboard.writeText(text).then(() => {
        el.querySelector('.copy').textContent = 'copied!';
        el.style.borderColor = '#22c55e';
        setTimeout(() => {
          el.querySelector('.copy').textContent = 'copy';
          el.style.borderColor = '';
        }, 2000);
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
