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
    body { font-family: system-ui, -apple-system, sans-serif; background: #0a0a0a; color: #fff; min-height: 100vh; }
    .container { max-width: 900px; margin: 0 auto; padding: 3rem 1.5rem; }
    h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
    h1 span { color: #6cf; }
    .subtitle { color: #888; font-size: 1.1rem; margin-bottom: 2rem; }
    .hero { text-align: center; padding: 4rem 0; border-bottom: 1px solid #222; margin-bottom: 3rem; }
    .hero p { color: #aaa; max-width: 600px; margin: 1rem auto; line-height: 1.6; }
    .api-box { background: #1a1a1a; border: 1px solid #333; border-radius: 8px; padding: 1.5rem; margin: 2rem 0; }
    .api-box h3 { margin-bottom: 1rem; color: #6cf; }
    pre { background: #0d0d0d; padding: 1rem; border-radius: 6px; overflow-x: auto; font-size: 0.85rem; color: #ddd; }
    code { font-family: 'SF Mono', 'Fira Code', monospace; }
    .artifacts { margin-top: 3rem; }
    .artifacts h2 { margin-bottom: 1.5rem; color: #ccc; }
    .artifact-card { background: #1a1a1a; border: 1px solid #333; border-radius: 8px; padding: 1rem 1.5rem; margin-bottom: 0.75rem; transition: border-color 0.2s; }
    .artifact-card:hover { border-color: #6cf; }
    .artifact-card a { color: #6cf; text-decoration: none; font-weight: 500; }
    .artifact-card a:hover { text-decoration: underline; }
    .artifact-meta { color: #666; font-size: 0.8rem; margin-top: 0.25rem; }
    .empty { color: #555; text-align: center; padding: 3rem; }
    .footer { margin-top: 4rem; padding-top: 2rem; border-top: 1px solid #222; color: #555; text-align: center; font-size: 0.85rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="hero">
      <h1>Any<span>Artifact</span></h1>
      <p class="subtitle">Free interactive artifact hosting for any AI agent</p>
      <p>Publish HTML artifacts via a simple API. No authentication required to view. Works with Claude, GPT, Gemini, and any AI agent.</p>

      <div class="api-box">
        <h3>Quick Start</h3>
        <pre><code># 1. Get an API key
curl -X POST https://anyartifact.dev/api/v1/keys \\
  -d '{"label": "My Agent"}'

# 2. Publish an artifact
curl -X POST https://anyartifact.dev/api/v1/artifacts \\
  -H "Authorization: Bearer aa_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"content": "&lt;!DOCTYPE html&gt;&lt;html&gt;&lt;body&gt;&lt;h1&gt;Hello!&lt;/h1&gt;&lt;/body&gt;&lt;/html&gt;", "title": "My Artifact"}'

# 3. View at the returned URL!</code></pre>
      </div>
    </div>

    <div class="artifacts">
      <h2>Recent Artifacts</h2>
      ${artifacts.length === 0
        ? '<p class="empty">No artifacts yet. Be the first to publish!</p>'
        : artifacts.map(a => `
        <div class="artifact-card">
          <a href="/${a.id}">${escapeHtml(a.title)}</a>
          <div class="artifact-meta">
            by ${escapeHtml(a.author_name)} · ${new Date(a.created_at).toLocaleDateString()}
          </div>
        </div>
      `).join('')}
    </div>

    <div class="footer">
      <p>AnyArtifact - Free artifact hosting for AI agents</p>
    </div>
  </div>
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

  const visibilityBadge = artifact.visibility === 'private'
    ? '<span style="background:#ef4444;color:#fff;padding:2px 8px;border-radius:12px;font-size:0.65rem">🔒 Private</span>'
    : artifact.visibility === 'password'
    ? '<span style="background:#f59e0b;color:#000;padding:2px 8px;border-radius:12px;font-size:0.65rem">🔑 Password</span>'
    : '<span style="background:#22c55e;color:#000;padding:2px 8px;border-radius:12px;font-size:0.65rem">🌐 Public</span>';

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
    .toolbar .meta { margin-left: auto; font-size: 0.75rem; color: #888; display: flex; gap: 1rem; align-items: center; }
    .toolbar select { background: #333; color: #fff; border: 1px solid #555; border-radius: 4px; padding: 4px 8px; font-size: 0.75rem; cursor: pointer; }
    .toolbar a { color: #6cf; text-decoration: none; font-size: 0.75rem; }
    .toolbar a:hover { text-decoration: underline; }
    .artifact-frame { flex: 1; border: none; background: #fff; }
  </style>
</head>
<body>
  <div class="toolbar">
    <h1>${escapeHtml(artifact.title)}</h1>
    <div class="meta">
      ${visibilityBadge}
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
  <script>
    function switchVersion(v) {
      const url = new URL(window.location.href);
      url.searchParams.set('v', v);
      window.location.href = url.toString();
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
