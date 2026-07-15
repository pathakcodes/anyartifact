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
  const { artifacts } = await listArtifacts(1, 12);
  const host = c.req.header('host') || 'localhost:3000';
  const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
  const origin = `${protocol}://${host}`;

  const cardsHtml = artifacts.length > 0
    ? artifacts.map((art: any) => {
        const dateStr = new Date(art.created_at).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        const title = escapeHtml(art.title || 'Untitled');
        const author = escapeHtml(art.author_name || 'Anonymous');
        const desc = escapeHtml(art.description || 'Interactive HTML artifact');
        const initials = author ? author.charAt(0).toUpperCase() : 'A';
        
        return `
          <div class="gallery-card" onclick="window.location.href='/${art.id}'">
            <div class="card-glow"></div>
            <div class="card-header">
              <span class="card-icon">⚡</span>
              <span class="card-badge">HTML</span>
            </div>
            <h3 class="card-title">${title}</h3>
            <p class="card-desc">${desc}</p>
            <div class="card-footer">
              <div class="author-info">
                <div class="author-avatar">${initials}</div>
                <span class="author-name">${author}</span>
              </div>
              <span class="card-date">${dateStr}</span>
            </div>
          </div>
        `;
      }).join('')
    : `
      <div class="empty-state">
        <div class="empty-icon">📂</div>
        <h3>No public artifacts yet</h3>
        <p>Be the first to publish one by setting up your MCP server!</p>
      </div>
    `;

  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AnyArtifact — Free AI Artifact Hosting</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    :root {
      --bg-dark: #050508;
      --bg-card: rgba(255, 255, 255, 0.02);
      --border-color: rgba(255, 255, 255, 0.06);
      --text-main: #f3f4f6;
      --text-muted: #9ca3af;
      --primary: #6366f1;
      --primary-glow: rgba(99, 102, 241, 0.15);
      --accent: #a855f7;
      --accent-cyan: #06b6d4;
    }

    body {
      font-family: 'Outfit', system-ui, sans-serif;
      background: var(--bg-dark);
      color: var(--text-main);
      -webkit-font-smoothing: antialiased;
      overflow-x: hidden;
      min-height: 100vh;
      background-image: 
        radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.08) 0%, transparent 40%),
        radial-gradient(circle at 90% 80%, rgba(168, 85, 247, 0.08) 0%, transparent 40%);
    }

    a { color: inherit; text-decoration: none; }

    /* SCROLLBAR */
    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-track { background: var(--bg-dark); }
    ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }

    /* GLOW BACKGROUND EFFECT */
    .glow-container {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: -1;
      overflow: hidden;
    }
    .glow-light {
      position: absolute;
      width: 500px;
      height: 500px;
      border-radius: 50%;
      filter: blur(130px);
      opacity: 0.15;
    }
    .glow-light-1 { top: -10%; left: 20%; background: var(--primary); }
    .glow-light-2 { top: 40%; right: 10%; background: var(--accent); }

    /* NAV */
    nav {
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(5, 5, 8, 0.75);
      backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--border-color);
      transition: all 0.3s;
    }
    .nav-inner {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 2rem;
      height: 70px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .nav-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 800;
      font-size: 1.3rem;
      letter-spacing: -0.5px;
      background: linear-gradient(135deg, #fff 40%, var(--text-muted) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .nav-brand .logo {
      width: 34px;
      height: 34px;
      background: linear-gradient(135deg, var(--primary), var(--accent));
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 1.1rem;
      font-weight: bold;
      -webkit-text-fill-color: initial;
      box-shadow: 0 0 20px rgba(99, 102, 241, 0.4);
    }
    .nav-links {
      display: flex;
      gap: 2.5rem;
      font-size: 0.95rem;
      font-weight: 500;
      color: var(--text-muted);
    }
    .nav-links a {
      transition: color 0.2s, transform 0.2s;
    }
    .nav-links a:hover {
      color: #fff;
    }
    .nav-cta {
      background: linear-gradient(135deg, var(--primary), var(--accent));
      color: #fff;
      padding: 10px 22px;
      border-radius: 10px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      box-shadow: 0 4px 15px rgba(99, 102, 241, 0.2);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .nav-cta:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(99, 102, 241, 0.4);
    }

    /* HERO */
    .hero {
      max-width: 1200px;
      margin: 0 auto;
      padding: 6.5rem 2rem 4rem;
      text-align: center;
      position: relative;
    }
    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(99, 102, 241, 0.1);
      border: 1px solid rgba(99, 102, 241, 0.2);
      color: #818cf8;
      padding: 6px 16px;
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 600;
      margin-bottom: 2rem;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      box-shadow: inset 0 0 12px rgba(99, 102, 241, 0.1);
    }
    .hero-badge .dot {
      width: 6px;
      height: 6px;
      background: #818cf8;
      border-radius: 50%;
      animation: pulse-dot 1.5s infinite;
    }
    @keyframes pulse-dot {
      0% { opacity: 0.3; transform: scale(0.9); }
      50% { opacity: 1; transform: scale(1.2); }
      100% { opacity: 0.3; transform: scale(0.9); }
    }
    .hero h1 {
      font-size: 4rem;
      font-weight: 800;
      line-height: 1.15;
      letter-spacing: -1.5px;
      margin-bottom: 1.5rem;
    }
    .hero h1 span {
      background: linear-gradient(135deg, #a855f7, #6366f1, #06b6d4);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .hero p {
      color: var(--text-muted);
      font-size: 1.25rem;
      max-width: 650px;
      margin: 0 auto 3rem;
      line-height: 1.6;
    }
    .hero-btns {
      display: flex;
      gap: 16px;
      justify-content: center;
    }
    .btn-primary {
      background: linear-gradient(135deg, var(--primary), var(--accent));
      color: #fff;
      padding: 14px 32px;
      border-radius: 12px;
      font-size: 0.95rem;
      font-weight: 600;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(99, 102, 241, 0.3);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 30px rgba(99, 102, 241, 0.5);
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.03);
      color: var(--text-main);
      padding: 14px 32px;
      border-radius: 12px;
      font-size: 0.95rem;
      font-weight: 500;
      border: 1px solid var(--border-color);
      cursor: pointer;
      transition: all 0.3s;
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.15);
      transform: translateY(-1px);
    }

    /* TABS SETUP SECTION */
    .setup-section {
      max-width: 900px;
      margin: 2rem auto 6rem;
      padding: 0 2rem;
    }
    .setup-card {
      background: rgba(10, 10, 15, 0.6);
      backdrop-filter: blur(16px);
      border: 1px solid var(--border-color);
      border-radius: 24px;
      padding: 2.5rem;
      position: relative;
      box-shadow: 0 20px 50px rgba(0,0,0,0.3);
    }
    .setup-card .card-label {
      position: absolute;
      top: -12px;
      left: 30px;
      background: linear-gradient(135deg, var(--primary), var(--accent));
      color: #fff;
      padding: 4px 16px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.5px;
      box-shadow: 0 4px 10px rgba(99, 102, 241, 0.3);
    }
    .setup-tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 2rem;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 1rem;
      overflow-x: auto;
    }
    .setup-tab {
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 8px 18px;
      font-size: 0.9rem;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }
    .setup-tab:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.03);
    }
    .setup-tab.active {
      color: #fff;
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.25);
    }
    .tab-content {
      display: none;
      animation: fadeIn 0.4s ease;
    }
    .tab-content.active {
      display: block;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(5px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .setup-item-desc {
      color: var(--text-muted);
      font-size: 0.9rem;
      margin-bottom: 1rem;
    }
    .setup-cmd-container {
      position: relative;
      margin-bottom: 1.5rem;
    }
    .setup-cmd-container pre {
      background: #060608;
      border: 1px solid var(--border-color);
      border-radius: 14px;
      padding: 1.25rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.82rem;
      color: #e2e8f0;
      line-height: 1.7;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .setup-cmd-container .btn-copy {
      position: absolute;
      top: 12px;
      right: 12px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: var(--text-muted);
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    .setup-cmd-container .btn-copy:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }
    .setup-cmd-container .btn-copy.copied {
      background: #10b981;
      border-color: #10b981;
      color: #000;
    }
    
    .hint {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* GALLERY / PUBLIC ARTIFACTS */
    .gallery-section {
      max-width: 1200px;
      margin: 0 auto 6rem;
      padding: 0 2rem;
    }
    .section-header {
      text-align: center;
      margin-bottom: 3.5rem;
    }
    .section-label {
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: var(--primary);
      margin-bottom: 0.5rem;
      display: block;
    }
    .section-title {
      font-size: 2.2rem;
      font-weight: 800;
      letter-spacing: -0.75px;
      margin-bottom: 0.75rem;
    }
    .section-desc {
      color: var(--text-muted);
      font-size: 1rem;
      max-width: 600px;
      margin: 0 auto;
    }
    
    .gallery-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
    }
    .gallery-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 18px;
      padding: 1.75rem;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      height: 220px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .gallery-card:hover {
      transform: translateY(-4px);
      border-color: rgba(99, 102, 241, 0.3);
      box-shadow: 0 12px 30px rgba(99, 102, 241, 0.1);
    }
    .gallery-card:hover .card-glow {
      opacity: 0.15;
    }
    .card-glow {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: radial-gradient(circle at 50% 0%, var(--primary), transparent 60%);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
    }
    .card-icon {
      font-size: 1.25rem;
      background: rgba(255, 255, 255, 0.05);
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card-badge {
      font-size: 0.7rem;
      font-weight: 700;
      color: var(--primary);
      background: rgba(99, 102, 241, 0.12);
      border: 1px solid rgba(99, 102, 241, 0.2);
      padding: 3px 10px;
      border-radius: 8px;
    }
    .card-title {
      font-size: 1.15rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      color: #fff;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .card-desc {
      font-size: 0.88rem;
      color: var(--text-muted);
      line-height: 1.5;
      margin-bottom: 1.5rem;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    .card-footer {
      margin-top: auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid rgba(255, 255, 255, 0.04);
      padding-top: 0.8rem;
    }
    .author-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .author-avatar {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary), var(--accent));
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.65rem;
      font-weight: bold;
      color: #fff;
    }
    .author-name {
      font-size: 0.8rem;
      color: var(--text-muted);
      font-weight: 500;
    }
    .card-date {
      font-size: 0.78rem;
      color: var(--text-muted);
    }
    
    .empty-state {
      grid-column: 1 / -1;
      text-align: center;
      padding: 4rem 2rem;
      background: var(--bg-card);
      border: 1px dashed var(--border-color);
      border-radius: 20px;
    }
    .empty-icon {
      font-size: 2.5rem;
      margin-bottom: 1rem;
    }
    .empty-state h3 {
      font-size: 1.15rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }
    .empty-state p {
      color: var(--text-muted);
      font-size: 0.9rem;
    }

    /* FEATURES SECTION */
    .features-section {
      max-width: 1200px;
      margin: 0 auto 6rem;
      padding: 0 2rem;
    }
    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
    }
    .feature-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 20px;
      padding: 2rem;
      transition: all 0.3s;
    }
    .feature-card:hover {
      border-color: rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.03);
    }
    .feature-icon {
      width: 48px;
      height: 48px;
      background: rgba(99, 102, 241, 0.1);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      color: var(--primary);
      margin-bottom: 1.25rem;
    }
    .feature-card h3 {
      font-size: 1.2rem;
      font-weight: 700;
      margin-bottom: 0.75rem;
    }
    .feature-card p {
      color: var(--text-muted);
      font-size: 0.92rem;
      line-height: 1.6;
    }

    /* API TABLE SECTION */
    .api-section {
      max-width: 1000px;
      margin: 0 auto 6rem;
      padding: 0 2rem;
    }
    .api-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 24px;
      overflow: hidden;
    }
    .api-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    .api-table th {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border-color);
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--text-muted);
      font-weight: 600;
    }
    .api-table td {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid rgba(255,255,255,0.03);
      font-size: 0.9rem;
    }
    .api-table tr:last-child td { border: none; }
    .method-badge {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 6px;
      display: inline-block;
    }
    .method-badge.post { background: rgba(16, 185, 129, 0.12); color: #10b981; }
    .method-badge.put { background: rgba(245, 158, 11, 0.12); color: #f59e0b; }
    .method-badge.get { background: rgba(59, 130, 246, 0.12); color: #3b82f6; }
    .method-badge.del { background: rgba(239, 68, 68, 0.12); color: #ef4444; }
    .api-path {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85rem;
      color: var(--accent-cyan);
    }

    /* FOOTER */
    footer {
      border-top: 1px solid var(--border-color);
      padding: 3.5rem 2rem;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.9rem;
    }
    footer a {
      color: #fff;
      transition: opacity 0.2s;
    }
    footer a:hover { opacity: 0.8; }
    .footer-divider {
      margin: 1.5rem 0;
      opacity: 0.1;
      border-color: #fff;
    }

    @media (max-width: 768px) {
      .hero h1 { font-size: 2.5rem; }
      .nav-links { display: none; }
      .setup-card { padding: 1.5rem; }
    }
  </style>
</head>
<body>
  <div class="glow-container">
    <div class="glow-light glow-light-1"></div>
    <div class="glow-light glow-light-2"></div>
  </div>

  <nav>
    <div class="nav-inner">
      <div class="nav-brand"><div class="logo">⚡</div>AnyArtifact</div>
      <div class="nav-links">
        <a href="#setup">Integrate</a>
        <a href="#gallery">Recent Artifacts</a>
        <a href="#features">Features</a>
        <a href="#api">API</a>
        <a href="https://github.com/pathakcodes/anyartifact" target="_blank">GitHub</a>
      </div>
      <button class="nav-cta" onclick="document.getElementById('setup').scrollIntoView({behavior:'smooth'})">Get Started</button>
    </div>
  </nav>

  <section class="hero">
    <div class="hero-badge">
      <span class="dot"></span>
      ⚡ Open Source & Free Forever
    </div>
    <h1>Deploy AI-Generated<br><span>Interactive Artifacts</span></h1>
    <p>Host dashboards, charts, visualizations, and static pages directly from Claude Code, Cursor, Cline, or any agent. No signup, zero fees.</p>
    <div class="hero-btns">
      <button class="btn-primary" onclick="document.getElementById('setup').scrollIntoView({behavior:'smooth'})">Add to Agent</button>
      <a href="https://github.com/pathakcodes/anyartifact" target="_blank" class="btn-secondary">View on GitHub</a>
    </div>
  </section>

  <section class="setup-section" id="setup">
    <div class="setup-card">
      <div class="card-label">STEP 1 — CHOOSE YOUR CODESPACE</div>
      
      <div class="setup-tabs">
        <button class="setup-tab active" onclick="switchTab(event, 'tab-claude')">Claude Code</button>
        <button class="setup-tab" onclick="switchTab(event, 'tab-cursor')">Cursor / Windsurf</button>
        <button class="setup-tab" onclick="switchTab(event, 'tab-cline')">Cline</button>
        <button class="setup-tab" onclick="switchTab(event, 'tab-claude-desk')">Claude Desktop</button>
        <button class="setup-tab" onclick="switchTab(event, 'tab-opencode')">OpenCode</button>
      </div>

      <!-- Tab: Claude Code -->
      <div id="tab-claude" class="tab-content active">
        <p class="setup-item-desc">Run this command in your project terminal to automatically connect AnyArtifact to Claude Code.</p>
        <div class="setup-cmd-container">
          <pre><code>claude mcp add --transport sse anyartifact ${origin}/mcp</code></pre>
          <button class="btn-copy" onclick="copyCode(this)">copy</button>
        </div>
      </div>

      <!-- Tab: Cursor -->
      <div id="tab-cursor" class="tab-content">
        <p class="setup-item-desc">Add AnyArtifact as a new MCP server in Cursor/Windsurf settings.</p>
        <div class="setup-cmd-container">
          <pre><code>${origin}/mcp</code></pre>
          <button class="btn-copy" onclick="copyCode(this)">copy URL</button>
        </div>
        <div class="hint">ℹ️ Go to Settings > Features > MCP, select SSE transport, and paste the URL.</div>
      </div>

      <!-- Tab: Cline -->
      <div id="tab-cline" class="tab-content">
        <p class="setup-item-desc">Enable Cline to use the AnyArtifact publish tools by registering this MCP server URL.</p>
        <div class="setup-cmd-container">
          <pre><code>${origin}/mcp</code></pre>
          <button class="btn-copy" onclick="copyCode(this)">copy URL</button>
        </div>
        <div class="hint">ℹ️ Set as an SSE provider in your Cline settings page.</div>
      </div>

      <!-- Tab: Claude Desktop -->
      <div id="tab-claude-desk" class="tab-content">
        <p class="setup-item-desc">Add this snippet to your Claude Desktop config JSON file.</p>
        <div class="setup-cmd-container">
          <pre><code>{
  "mcpServers": {
    "anyartifact": {
      "url": "${origin}/mcp"
    }
  }
}</code></pre>
          <button class="btn-copy" onclick="copyCode(this)">copy JSON</button>
        </div>
        <p class="hint">📁 Located at: <code>~/Library/Application Support/Claude/claude_desktop_config.json</code> on macOS</p>
      </div>

      <!-- Tab: OpenCode -->
      <div id="tab-opencode" class="tab-content">
        <p class="setup-item-desc">Paste this inside your local opencode JSON configuration file.</p>
        <div class="setup-cmd-container">
          <pre><code>{
  "mcp": {
    "anyartifact": {
      "type": "remote",
      "url": "${origin}/mcp",
      "enabled": true
    }
  }
}</code></pre>
          <button class="btn-copy" onclick="copyCode(this)">copy JSON</button>
        </div>
        <p class="hint">📁 Config path: <code>~/.config/opencode/opencode.json</code></p>
      </div>
    </div>

    <div class="setup-card" style="margin-top: 2rem">
      <div class="card-label">STEP 2 — ADD AN AGENT RULE</div>
      <p class="setup-item-desc" style="margin-bottom: 1.5rem">Provide this instruction to your AI agent in your prompt or <code>.cursorrules</code> / <code>.clinerules</code> file so it knows how to upload pages automatically.</p>
      <div class="setup-cmd-container">
        <pre><code>## AnyArtifact Integration

When creating interactive HTML artifacts (charts, dashboards, visualizations, reports, or web apps), use the AnyArtifact MCP tools to publish them.

MCP Server: ${origin}/mcp
Tools: publish_artifact, update_artifact, get_artifact, list_artifacts

Workflow:
1. Generate the HTML content.
2. Call publish_artifact with the code and title.
3. Use visibility "public" so the user can inspect it.
4. Provide the returned URL link to the user.</code></pre>
        <button class="btn-copy" onclick="copyCode(this)">📋 Copy Rule</button>
      </div>
    </div>
  </section>

  <section class="gallery-section" id="gallery">
    <div class="section-header">
      <span class="section-label">Gallery</span>
      <h2 class="section-title">Recent Public Artifacts</h2>
      <p class="section-desc">Browse community creations generated by AI agents around the world.</p>
    </div>
    <div class="gallery-grid">
      ${cardsHtml}
    </div>
  </section>

  <section class="features-section" id="features">
    <div class="section-header">
      <span class="section-label">Capabilities</span>
      <h2 class="section-title">Everything you need</h2>
      <p class="section-desc">Host pages seamlessly with zero complex cloud setups.</p>
    </div>
    <div class="features-grid">
      <div class="feature-card">
        <div class="feature-icon">🌐</div>
        <h3>Public Sharing</h3>
        <p>Generate a unique URL instantly. Anyone with the URL can inspect the visual pages, dashboards, or prototypes.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🔑</div>
        <h3>Password Protection</h3>
        <p>Limit access by securing your pages with custom passwords. Keep sensitive charts or layouts hidden.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🔒</div>
        <h3>Private by Default</h3>
        <p>Only you can view and modify details via your unique Owner URL. Easily manage visibility settings from the toolbar.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">📦</div>
        <h3>Version History</h3>
        <p>Keep your sharing link consistent. Agent updates generate new versions you can switch between dynamically.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🔌</div>
        <h3>Native MCP Support</h3>
        <p>Compliant with the Model Context Protocol. Works instantly out of the box with any compatible IDE extension.</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🆓</div>
        <h3>Free & Zero API Key</h3>
        <p>Host web files without signing up or dealing with secret keys. The ideal companion for developers and AI pairings.</p>
      </div>
    </div>
  </section>

  <section class="api-section" id="api">
    <div class="section-header">
      <span class="section-label">REST API</span>
      <h2 class="section-title">Developer Reference</h2>
      <p class="section-desc">Connect programmatically via REST API integrations.</p>
    </div>
    <div class="api-card">
      <table class="api-table">
        <thead>
          <tr>
            <th>Method</th>
            <th>Endpoint</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span class="method-badge post">POST</span></td>
            <td><span class="api-path">/api/v1/artifacts</span></td>
            <td>Publish a new HTML artifact</td>
          </tr>
          <tr>
            <td><span class="method-badge put">PUT</span></td>
            <td><span class="api-path">/api/v1/artifacts/:id</span></td>
            <td>Upload a new version for an artifact</td>
          </tr>
          <tr>
            <td><span class="method-badge get">GET</span></td>
            <td><span class="api-path">/api/v1/artifacts</span></td>
            <td>List recent public artifacts</td>
          </tr>
          <tr>
            <td><span class="method-badge get">GET</span></td>
            <td><span class="api-path">/api/v1/artifacts/:id</span></td>
            <td>Fetch artifact metadata and version details</td>
          </tr>
          <tr>
            <td><span class="method-badge del">DELETE</span></td>
            <td><span class="api-path">/api/v1/artifacts/:id</span></td>
            <td>Permanently delete an artifact</td>
          </tr>
          <tr>
            <td><span class="method-badge put">PUT</span></td>
            <td><span class="api-path">/api/v1/artifacts/:id/visibility</span></td>
            <td>Update visibility type (public, private, password)</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <footer>
    <p>Built with ❤️ for AI developers · Powered by Hono & sql.js</p>
    <hr class="footer-divider">
    <div>
      <a href="https://github.com/pathakcodes/anyartifact" target="_blank">GitHub</a> · 
      <a href="/health">System Health</a> · 
      <a href="/mcp/tools">MCP Tools</a>
    </div>
    <p style="margin-top: 1rem; color: #52525b; font-size: 0.8rem;">© 2026 AnyArtifact · Free Forever</p>
  </footer>

  <script>
    function switchTab(e, tabId) {
      document.querySelectorAll('.setup-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      e.target.classList.add('active');
      document.getElementById(tabId).classList.add('active');
    }

    function copyCode(btn) {
      const code = btn.parentElement.querySelector('code').textContent;
      navigator.clipboard.writeText(code).then(() => {
        btn.textContent = 'copied!';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = btn.dataset.label || 'copy';
          btn.classList.remove('copied');
        }, 2000);
      });
    }

    // Keep initial copy button labels
    document.querySelectorAll('.btn-copy').forEach(btn => {
      btn.dataset.label = btn.textContent;
    });
  </script>
</body>
</html>
  `);
});

// GET /share/:token - View artifact via share token
viewRoutes.get('/share/:token', viewRateLimit(), async (c) => {
  try {
    const token = c.req.param('token');
    if (!token) {
      return c.html(renderNotFound(), 404);
    }
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
    if (!id) {
      return c.html(renderNotFound(), 404);
    }

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
  const visColor = vis === 'private' ? '#ef4444' : vis === 'password' ? '#f59e0b' : '#10b981';
  const visIcon = vis === 'private' ? '🔒' : vis === 'password' ? '🔑' : '🌐';
  const visLabel = vis === 'private' ? 'Private' : vis === 'password' ? 'Password' : 'Public';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(artifact.title)} - AnyArtifact</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Outfit', system-ui, sans-serif;
      background: #0d0d12;
      color: #fff;
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* TOOLBAR */
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 64px;
      padding: 0 1.25rem;
      background: rgba(18, 18, 24, 0.8);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      z-index: 100;
    }
    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .btn-back {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #9ca3af;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-back:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }
    .toolbar h1 {
      font-size: 1.05rem;
      font-weight: 700;
      color: #fff;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 250px;
    }

    /* VIEWPORT SIMULATOR */
    .viewport-controls {
      display: flex;
      background: rgba(0, 0, 0, 0.3);
      padding: 3px;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.04);
    }
    .viewport-btn {
      background: transparent;
      border: none;
      color: #6b7280;
      padding: 6px 14px;
      border-radius: 7px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.82rem;
      font-weight: 600;
      font-family: inherit;
      transition: all 0.2s;
    }
    .viewport-btn svg {
      width: 14px;
      height: 14px;
      fill: currentColor;
    }
    .viewport-btn:hover {
      color: #fff;
    }
    .viewport-btn.active {
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    }

    .toolbar-right {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 0.85rem;
      color: #9ca3af;
    }
    
    .meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* SELECT DROPDOWN */
    .toolbar select {
      background: rgba(255, 255, 255, 0.05);
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 6px 12px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      outline: none;
      transition: all 0.2s;
    }
    .toolbar select:hover {
      background: rgba(255, 255, 255, 0.08);
    }

    /* VISIBILITY DROPDOWN */
    .vis-container {
      position: relative;
    }
    .vis-btn {
      background: rgba(255, 255, 255, 0.05);
      color: #fff;
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      gap: 6px;
      font-family: inherit;
      transition: all 0.2s;
    }
    .vis-btn:hover {
      background: rgba(255, 255, 255, 0.08);
    }
    .vis-status-dot {
      width: 8px;
      height: 8px;
      background: ${visColor};
      border-radius: 50%;
      box-shadow: 0 0 10px ${visColor};
    }
    .vis-dropdown {
      display: none;
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 10px;
      background: #181822;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 6px;
      min-width: 240px;
      z-index: 100;
      box-shadow: 0 12px 30px rgba(0,0,0,0.5);
      animation: dropdown-fade 0.2s ease;
    }
    @keyframes dropdown-fade {
      from { opacity: 0; transform: translateY(-5px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .vis-dropdown.show { display: block; }
    .vis-option {
      padding: 10px 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 10px;
      border-radius: 8px;
      font-size: 0.85rem;
      transition: background 0.15s;
    }
    .vis-option:hover {
      background: rgba(255, 255, 255, 0.04);
    }
    .vis-option.active {
      background: rgba(99, 102, 241, 0.1);
      color: #818cf8;
    }
    .vis-option .icon { font-size: 1.1rem; }
    .vis-option .title { font-weight: 600; }
    .vis-option .desc { font-size: 0.72rem; color: #6b7280; margin-top: 2px; }
    
    .pwd-section {
      padding: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      display: none;
    }
    .pwd-section.show { display: block; }
    .pwd-section input {
      width: 100%;
      padding: 8px 12px;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 6px;
      color: #fff;
      font-size: 0.82rem;
      margin-bottom: 8px;
      outline: none;
    }
    .pwd-section input:focus {
      border-color: rgba(99, 102, 241, 0.4);
    }
    .pwd-section button {
      width: 100%;
      padding: 8px;
      background: linear-gradient(135deg, var(--primary), var(--accent));
      color: #fff;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      font-size: 0.82rem;
      font-family: inherit;
    }

    /* ACTION BUTTONS */
    .btn-action {
      background: rgba(255, 255, 255, 0.05);
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      font-family: inherit;
      transition: all 0.2s;
    }
    .btn-action:hover {
      background: rgba(255, 255, 255, 0.08);
    }
    .btn-action.copied {
      background: #10b981;
      color: #000;
      border-color: #10b981;
    }

    .link-raw {
      color: #3b82f6;
      text-decoration: none;
      font-weight: 600;
      transition: color 0.2s;
    }
    .link-raw:hover { color: #60a5fa; }

    /* IFRAME FRAME CONTAINER */
    .frame-wrapper {
      flex: 1;
      width: 100%;
      background: #0b0b0e;
      display: flex;
      justify-content: center;
      align-items: stretch;
      padding: 1rem;
      position: relative;
    }
    .artifact-frame {
      width: 100%;
      height: 100%;
      border: none;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 15px 40px rgba(0, 0, 0, 0.5);
      transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* TOAST NOTIFICATION */
    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #10b981;
      color: #000;
      padding: 12px 24px;
      border-radius: 10px;
      font-size: 0.88rem;
      font-weight: 700;
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 200;
      box-shadow: 0 8px 30px rgba(16, 185, 129, 0.2);
    }
    .toast.show {
      opacity: 1;
      transform: translateY(0);
    }
    .toast.error {
      background: #ef4444;
      color: #fff;
      box-shadow: 0 8px 30px rgba(239, 68, 68, 0.2);
    }

    @media (max-width: 768px) {
      .viewport-controls { display: none; }
      .meta-item.author { display: none; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <div class="toolbar-left">
      <button class="btn-back" onclick="window.location.href='/'" title="Back to Gallery">
        <svg style="width:16px;height:16px" viewBox="0 0 24 24"><path fill="currentColor" d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z"/></svg>
      </button>
      <h1>${escapeHtml(artifact.title)}</h1>
    </div>

    <div class="viewport-controls">
      <button class="viewport-btn active" id="btn-desktop" onclick="setViewport('desktop')">
        <svg viewBox="0 0 24 24"><path d="M21,16H3V4H21M21,2H3C1.89,2 1,2.89 1,4V16A2,2 0 0,0 3,18H10V20H8V22H16V20H14V18H21A2,2 0 0,0 23,16V4C23,2.89 22.1,2 21,2Z"/></svg>
        Desktop
      </button>
      <button class="viewport-btn" id="btn-tablet" onclick="setViewport('tablet')">
        <svg viewBox="0 0 24 24"><path d="M19,18H5V6H19M21,2H3A2,2 0 0,0 1,4V20A2,2 0 0,0 3,22H21A2,2 0 0,0 23,20V4C23,2.89 22.1,2 21,2Z"/></svg>
        Tablet
      </button>
      <button class="viewport-btn" id="btn-mobile" onclick="setViewport('mobile')">
        <svg viewBox="0 0 24 24"><path d="M17,19H7V5H17M17,1H7A2,2 0 0,0 5,3V21A2,2 0 0,0 7,23H17A2,2 0 0,0 19,21V3A2,2 0 0,0 17,1Z"/></svg>
        Mobile
      </button>
    </div>

    <div class="toolbar-right">
      <span class="meta-item author">by <b>${escapeHtml(artifact.author_name || 'Anonymous')}</b></span>
      
      <div class="vis-container">
        <button class="vis-btn" onclick="toggleVisDropdown()">
          <span class="vis-status-dot"></span>
          ${visIcon} ${visLabel}
        </button>
        <div class="vis-dropdown" id="visDropdown">
          <div class="vis-option ${vis === 'public' ? 'active' : ''}" onclick="changeVis('public')">
            <span class="icon">🌐</span>
            <div><div class="title">Public</div><div class="desc">Anyone with link can inspect</div></div>
          </div>
          <div class="vis-option ${vis === 'password' ? 'active' : ''}" onclick="changeVis('password')">
            <span class="icon">🔑</span>
            <div><div class="title">Password Protected</div><div class="desc">Requires key entry</div></div>
          </div>
          <div class="vis-option ${vis === 'private' ? 'active' : ''}" onclick="changeVis('private')">
            <span class="icon">🔒</span>
            <div><div class="title">Private</div><div class="desc">Only visible to owner</div></div>
          </div>
          <div class="pwd-section" id="pwdSection">
            <input type="password" id="newPwd" placeholder="Enter custom password..." />
            <button onclick="savePassword()">Lock with Password</button>
          </div>
        </div>
      </div>

      <button class="btn-action" onclick="copyUrl(this)">
        📋 Copy URL
      </button>

      <select onchange="switchVersion(this.value)" title="Choose Version">
        ${versionOptions}
      </select>

      <a class="link-raw" href="/api/v1/artifacts/${artifact.id}/raw?version=${version}" target="_blank">Raw</a>
    </div>
  </div>

  <div class="frame-wrapper">
    <iframe class="artifact-frame" id="artifactFrame" srcdoc="${escapeHtml(content).replace(/"/g, '&quot;')}" sandbox="allow-scripts allow-modals allow-forms allow-popups"></iframe>
  </div>

  <div class="toast" id="toast"></div>

  <script>
    const ARTIFACT_ID = '${artifact.id}';
    const OWNER_TOKEN = new URLSearchParams(window.location.search).get('owner') || '';

    function setViewport(device) {
      const frame = document.getElementById('artifactFrame');
      document.querySelectorAll('.viewport-btn').forEach(btn => btn.classList.remove('active'));
      
      if (device === 'desktop') {
        frame.style.width = '100%';
        document.getElementById('btn-desktop').classList.add('active');
      } else if (device === 'tablet') {
        frame.style.width = '768px';
        document.getElementById('btn-tablet').classList.add('active');
      } else if (device === 'mobile') {
        frame.style.width = '375px';
        document.getElementById('btn-mobile').classList.add('active');
      }
    }

    function switchVersion(v) {
      const url = new URL(window.location.href);
      url.searchParams.set('version', v);
      window.location.href = url.toString();
    }

    function copyUrl(btn) {
      const url = window.location.href;
      navigator.clipboard.writeText(url).then(() => {
        btn.innerHTML = '✅ Copied!';
        btn.classList.add('copied');
        showToast('Link copied to clipboard!');
        setTimeout(() => {
          btn.innerHTML = '📋 Copy URL';
          btn.classList.remove('copied');
        }, 2000);
      }).catch(() => {
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        btn.innerHTML = '✅ Copied!';
        btn.classList.add('copied');
        showToast('Link copied!');
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
          showToast('Visibility updated to ' + vis);
          setTimeout(() => location.reload(), 800);
        } else {
          showToast(data.error || 'Failed to update visibility', true);
        }
      } catch (e) {
        showToast('Network error', true);
      }
    }

    async function savePassword() {
      const pwd = document.getElementById('newPwd').value;
      if (!pwd) { showToast('Password cannot be empty', true); return; }
      try {
        const res = await fetch('/api/v1/artifacts/' + ARTIFACT_ID + '/visibility?owner=' + OWNER_TOKEN, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visibility: 'password', password: pwd })
        });
        const data = await res.json();
        if (res.ok) {
          showToast('Password protected successfully!');
          setTimeout(() => location.reload(), 800);
        } else {
          showToast(data.error || 'Failed to set password', true);
        }
      } catch (e) {
        showToast('Network error', true);
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
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Outfit', system-ui, sans-serif;
      background: #060608;
      color: #fff;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background-image: radial-gradient(circle at center, rgba(99, 102, 241, 0.08) 0%, transparent 60%);
    }
    .card {
      background: rgba(18, 18, 24, 0.6);
      backdrop-filter: blur(16px);
      border-radius: 24px;
      padding: 3rem;
      max-width: 440px;
      width: 90%;
      text-align: center;
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
    }
    .icon {
      font-size: 3rem;
      background: rgba(255, 255, 255, 0.03);
      width: 80px;
      height: 80px;
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; }
    p { color: #9ca3af; font-size: 0.95rem; margin-bottom: 2rem; line-height: 1.5; }
    .form-group { margin-bottom: 1.5rem; text-align: left; }
    .form-group label { display: block; font-size: 0.8rem; font-weight: 600; color: #9ca3af; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
    .form-group input {
      width: 100%;
      padding: 12px 16px;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      color: #fff;
      font-size: 1rem;
      outline: none;
      transition: all 0.2s;
    }
    .form-group input:focus { border-color: rgba(99, 102, 241, 0.4); }
    button {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #6366f1, #a855f7);
      color: #fff;
      border: none;
      border-radius: 10px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      transition: transform 0.2s;
    }
    button:hover { transform: translateY(-1px); }
    .error { color: #ef4444; font-size: 0.85rem; margin-top: 1rem; display: none; font-weight: 600; }
    .back { margin-top: 2rem; }
    .back a { color: #818cf8; text-decoration: none; font-size: 0.88rem; font-weight: 500; }
    .back a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${isPrivate ? '🔒' : '🔑'}</div>
    <h1>${isPrivate ? 'This page is private' : 'Password Protected'}</h1>
    <p>${isPrivate ? 'Only the owner can view this page. If you are the owner, include the owner token in your link.' : 'Enter the secure password to unlock and inspect this artifact.'}</p>
    ${isPrivate ? '' : `
    <form id="pwdForm">
      <div class="form-group">
        <label>Enter Password</label>
        <input type="password" id="password" placeholder="••••••••" autofocus />
      </div>
      <button type="submit">Unlock Artifact</button>
      <div class="error" id="error">Incorrect password. Please try again.</div>
    </form>
    `}
    <div class="back"><a href="/">← Return to Gallery</a></div>
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
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Outfit', system-ui, sans-serif;
      background: #060608;
      color: #fff;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background-image: radial-gradient(circle at center, rgba(239, 68, 68, 0.05) 0%, transparent 60%);
    }
    .card {
      text-align: center;
      max-width: 400px;
      padding: 2rem;
    }
    h1 { font-size: 5rem; font-weight: 800; background: linear-gradient(135deg, #ef4444, #f87171); -webkit-background-clip: text; -webkit-text-fill-color: transparent; line-height: 1; margin-bottom: 1rem; }
    h2 { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; }
    p { color: #9ca3af; font-size: 0.95rem; margin-bottom: 2rem; line-height: 1.5; }
    a { color: #818cf8; text-decoration: none; font-weight: 600; font-size: 0.9rem; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <h1>404</h1>
    <h2>Artifact not found</h2>
    <p>The page you are looking for does not exist, has been deleted, or is set to private.</p>
    <a href="/">← Return to Gallery</a>
  </div>
</body>
</html>`;
}

export { viewRoutes };
