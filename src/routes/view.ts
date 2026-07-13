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
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:system-ui,-apple-system,sans-serif;background:#0a0a0a;color:#e2e8f0;overflow-x:hidden}
    .wrap{max-width:1400px;margin:0 auto;padding:1.5rem 2rem}
    .top{display:grid;grid-template-columns:1fr 1.8fr;gap:2rem;align-items:start;margin-bottom:1.5rem}
    .left h1{font-size:2.2rem;background:linear-gradient(135deg,#38bdf8,#818cf8,#c084fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:4px}
    .left .sub{color:#94a3b8;font-size:.95rem;margin-bottom:10px}
    .tags{display:flex;gap:6px;flex-wrap:wrap}
    .tag{background:#1e293b;border:1px solid #334155;padding:3px 10px;border-radius:16px;font-size:.7rem;color:#94a3b8}
    .prompt-box{background:linear-gradient(135deg,#1e1b4b,#0f172a);border:2px solid #818cf8;border-radius:12px;padding:1rem 1.25rem;position:relative}
    .prompt-box .lbl{position:absolute;top:-10px;left:16px;background:#818cf8;color:#fff;padding:2px 10px;border-radius:6px;font-size:.65rem;font-weight:700;letter-spacing:.5px}
    .prompt-box pre{background:#0f172a;border-color:#4c1d95;border-radius:8px;padding:.75rem 1rem;font-size:.72rem;color:#e2e8f0;margin:8px 0 0;overflow-x:auto;white-space:pre-wrap;word-break:break-word}
    .prompt-box .copy-btn{position:absolute;top:10px;right:10px;background:#818cf8;color:#fff;border:none;padding:5px 12px;border-radius:6px;font-size:.7rem;font-weight:600;cursor:pointer}
    .prompt-box .copy-btn:hover{background:#a78bfa}
    .prompt-box .copy-btn.copied{background:#22c55e}
    .mid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;margin-bottom:1.5rem}
    .mid .col{background:#1e293b;border:1px solid #334155;border-radius:10px;padding:1rem}
    .mid .col h3{font-size:.85rem;color:#e2e8f0;margin-bottom:8px;display:flex;align-items:center;gap:6px}
    .tool{display:flex;align-items:center;justify-content:space-between;background:#0f172a;padding:6px 10px;border-radius:6px;margin-bottom:5px;border:1px solid #1e293b;cursor:pointer;transition:border-color .15s}
    .tool:hover{border-color:#475569}
    .tool .n{font-size:.78rem;color:#e2e8f0;display:flex;align-items:center;gap:6px}
    .tool .n .d{width:6px;height:6px;border-radius:50%;background:#22c55e}
    .tool .c{font-size:.6rem;color:#64748b}
    .tool .c.copied{color:#22c55e}
    .vis{display:flex;gap:8px}
    .vis .v{flex:1;text-align:center;padding:10px 6px;background:#0f172a;border-radius:8px;border:1px solid #1e293b}
    .vis .v .i{font-size:1.2rem}
    .vis .v .l{font-size:.75rem;font-weight:600;margin-top:2px}
    .vis .v .d{font-size:.65rem;color:#64748b}
    .api-row{display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #1e293b;font-size:.78rem}
    .api-row:last-child{border:none}
    .api-row .method{font-family:monospace;color:#38bdf8;font-weight:600;width:50px}
    .api-row .path{font-family:monospace;color:#e2e8f0;flex:1}
    .api-row .desc{color:#64748b;font-size:.72rem}
    .bottom{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
    .bottom .col{background:#1e293b;border:1px solid #334155;border-radius:10px;padding:1rem}
    .bottom .col h3{font-size:.85rem;color:#e2e8f0;margin-bottom:8px}
    .art-card{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #1e293b}
    .art-card:last-child{border:none}
    .art-card a{color:#38bdf8;text-decoration:none;font-size:.82rem}
    .art-card .m{color:#64748b;font-size:.7rem}
    .empty{color:#475569;text-align:center;padding:1.5rem;font-size:.85rem}
    .foot{text-align:center;color:#475569;font-size:.75rem;margin-top:1.5rem;padding-top:1rem;border-top:1px solid #1e293b}
    .foot a{color:#38bdf8;text-decoration:none}
    code{font-family:'SF Mono','Fira Code',monospace}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="top">
      <div class="left">
        <h1>AnyArtifact</h1>
        <p class="sub">Free interactive artifact hosting for any AI agent</p>
        <div class="tags">
          <span class="tag">🌐 Public</span><span class="tag">🔑 Password</span><span class="tag">🔒 Private</span>
          <span class="tag">🔌 MCP</span><span class="tag">📦 Versioned</span><span class="tag">🆓 No API Key</span>
        </div>
      </div>
      <div class="prompt-box">
        <span class="lbl">📋 COPY THIS PROMPT TO YOUR CODING ASSISTANT</span>
        <button class="copy-btn" onclick="copyPrompt(this)">📋 Copy</button>
        <pre><code>AnyArtifact MCP Server: https://anyartifact-production.up.railway.app/mcp
MCP Tools: publish_artifact, update_artifact, get_artifact, list_artifacts
API: https://anyartifact-production.up.railway.app/api/v1/artifacts

When I ask you to create an interactive HTML artifact (chart, dashboard, visualization, report, or any web page), publish it to AnyArtifact using the publish_artifact MCP tool. Use visibility "public" so anyone with the link can view it. After publishing, give me the URL. The MCP server is already configured — just call publish_artifact with content and title.</code></pre>
      </div>
    </div>

    <div class="mid">
      <div class="col">
        <h3>⚡ Setup Your Tool</h3>
        <div class="tool" onclick="copyTool(this,'claude mcp add anyartifact https://anyartifact-production.up.railway.app/mcp')"><span class="n"><span class="d"></span>Claude Code</span><span class="c">copy</span></div>
        <div class="tool" onclick="copyTool(this,'https://anyartifact-production.up.railway.app/mcp')"><span class="n"><span class="d"></span>Cline</span><span class="c">copy URL</span></div>
        <div class="tool" onclick="copyTool(this,'{\"anyartifact\":{\"url\":\"https://anyartifact-production.up.railway.app/mcp\"}}')"><span class="n"><span class="d"></span>KiloCode</span><span class="c">copy JSON</span></div>
        <div class="tool" onclick="copyTool(this,'{\"anyartifact\":{\"url\":\"https://anyartifact-production.up.railway.app/mcp\"}}')"><span class="n"><span class="d"></span>Cursor</span><span class="c">copy JSON</span></div>
        <div class="tool" onclick="copyTool(this,'https://anyartifact-production.up.railway.app/mcp')"><span class="n"><span class="d"></span>OpenCode</span><span class="c">copy URL</span></div>
        <div class="tool" onclick="copyTool(this,'https://anyartifact-production.up.railway.app/mcp')"><span class="n"><span class="d"></span>Windsurf</span><span class="c">copy URL</span></div>
      </div>
      <div class="col">
        <h3>🌐 Visibility</h3>
        <div class="vis">
          <div class="v"><div class="i">🌐</div><div class="l">Public</div><div class="d">Anyone views</div></div>
          <div class="v"><div class="i">🔑</div><div class="l">Password</div><div class="d">Needs password</div></div>
          <div class="v"><div class="i">🔒</div><div class="l">Private</div><div class="d">Owner only</div></div>
        </div>
        <div style="margin-top:10px;padding:8px;background:#0f172a;border-radius:6px;font-size:.72rem;color:#94a3b8">
          Publish → get <code style="color:#38bdf8">owner_url</code> → open it → click badge to change. Default: private.
        </div>
      </div>
      <div class="col">
        <h3>📡 API Endpoints</h3>
        <div class="api-row"><span class="method">POST</span><span class="path">/api/v1/artifacts</span><span class="desc">Publish</span></div>
        <div class="api-row"><span class="method">PUT</span><span class="path">/api/v1/artifacts/:id</span><span class="desc">Update</span></div>
        <div class="api-row"><span class="method">GET</span><span class="path">/api/v1/artifacts</span><span class="desc">List</span></div>
        <div class="api-row"><span class="method">GET</span><span class="path">/api/v1/artifacts/:id</span><span class="desc">Metadata</span></div>
        <div class="api-row"><span class="method">DEL</span><span class="path">/api/v1/artifacts/:id</span><span class="desc">Delete</span></div>
        <div class="api-row"><span class="method">PUT</span><span class="path">/api/v1/artifacts/:id/visibility</span><span class="desc">Change vis</span></div>
        <div class="api-row"><span class="method">POST</span><span class="path">/api/v1/artifacts/:id/verify</span><span class="desc">Check pwd</span></div>
      </div>
    </div>

    <div class="bottom">
      <div class="col">
        <h3>📦 Recent Public Artifacts</h3>
        ${artifacts.length === 0
          ? '<p class="empty">No public artifacts yet. Be the first!</p>'
          : artifacts.map(a => `
        <div class="art-card">
          <div><a href="/${a.id}">${escapeHtml(a.title)}</a><div class="m">by ${escapeHtml(a.author_name)} · ${new Date(a.created_at).toLocaleDateString()}</div></div>
        </div>`).join('')}
      </div>
      <div class="col">
        <h3>🚀 Quick Publish (No API Key)</h3>
        <pre style="margin:0;font-size:.72rem"><code>curl -X POST https://anyartifact-production.up.railway.app/api/v1/artifacts \\
  -H "Content-Type: application/json" \\
  -d '{"content":"&lt;!DOCTYPE html&gt;&lt;html&gt;...&lt;/html&gt;","title":"My Artifact"}'</code></pre>
        <div style="margin-top:8px;padding:8px;background:#0f172a;border-radius:6px;font-size:.72rem;color:#94a3b8">
          Response: <code style="color:#38bdf8">id</code>, <code style="color:#38bdf8">url</code>, <code style="color:#38bdf8">owner_url</code>, <code style="color:#38bdf8">share_url</code>, <code style="color:#38bdf8">visibility</code>
        </div>
      </div>
    </div>

    <div class="foot">
      Built by <a href="https://github.com/pathakcodes">Shivam Kumar Pathak</a> & Claude · <a href="https://github.com/pathakcodes/anyartifact">GitHub</a> · <a href="/health">Health</a> · <a href="/mcp/tools">MCP Tools</a>
    </div>
  </div>
  <script>
    function copyTool(el, text) {
      navigator.clipboard.writeText(text).then(() => {
        const c = el.querySelector('.c');
        c.textContent = 'copied!';
        c.classList.add('copied');
        setTimeout(() => { c.textContent = text.includes('claude') ? 'copy' : text.includes('{') ? 'copy JSON' : 'copy URL'; c.classList.remove('copied'); }, 2000);
      });
    }
    function copyPrompt(btn) {
      const text = btn.parentElement.querySelector('code').textContent;
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = '✅ Copied!';
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = '📋 Copy'; btn.classList.remove('copied'); }, 2500);
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
