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
          day: 'numeric'
        });
        const title = escapeHtml(art.title || 'Untitled');
        const author = escapeHtml(art.author_name || 'Anonymous');
        const desc = escapeHtml(art.description || 'Interactive HTML artifact');
        const initials = author ? author.charAt(0).toUpperCase() : 'A';
        
        return `
          <div class="gallery-card" onclick="window.location.href='/${art.id}'">
            <div class="card-meta">
              <span class="card-badge">HTML</span>
              <span class="card-date">${dateStr}</span>
            </div>
            <h3 class="card-title">${title}</h3>
            <p class="card-desc">${desc}</p>
            <div class="card-footer">
              <div class="author-info">
                <div class="author-avatar">${initials}</div>
                <span class="author-name">${author}</span>
              </div>
              <span class="card-action-text">Inspect →</span>
            </div>
          </div>
        `;
      }).join('')
    : `
      <div class="empty-state">
        <h3>No public artifacts yet</h3>
        <p>Be the first to publish one by setting up your MCP server.</p>
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
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    :root {
      --bg-dark: #08080a;
      --border-color: rgba(255, 255, 255, 0.06);
      --text-main: #f3f4f6;
      --text-muted: #888896;
      --primary: #5c5cff;
      --primary-dim: rgba(92, 92, 255, 0.1);
    }

    body {
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      background: var(--bg-dark);
      color: var(--text-main);
      -webkit-font-smoothing: antialiased;
      overflow-x: hidden;
      min-height: 100vh;
      background-image: 
        radial-gradient(circle at 50% -20%, rgba(92, 92, 255, 0.08) 0%, transparent 50%),
        linear-gradient(rgba(255, 255, 255, 0.003) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.003) 1px, transparent 1px);
      background-size: 100% 100%, 32px 32px, 32px 32px;
    }

    a { color: inherit; text-decoration: none; }

    /* SCROLLBAR */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: var(--bg-dark); }
    ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.12); }
    ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }

    /* NAV */
    nav {
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(8, 8, 10, 0.7);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border-color);
    }
    .nav-inner {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 2rem;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .nav-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 700;
      font-size: 1.15rem;
      letter-spacing: -0.02em;
    }
    .nav-brand .logo {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .logo-svg {
      width: 20px;
      height: 20px;
      color: var(--primary);
      transition: transform 0.3s ease;
    }
    .nav-brand:hover .logo-svg {
      transform: translateY(-1px) rotate(5deg);
    }
    .nav-links {
      display: flex;
      gap: 2.25rem;
      font-size: 0.88rem;
      color: var(--text-muted);
      font-weight: 500;
    }
    .nav-links a {
      transition: color 0.15s;
    }
    .nav-links a:hover {
      color: #fff;
    }
    .nav-cta {
      background: #fff;
      color: #000;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: opacity 0.2s;
    }
    .nav-cta:hover {
      opacity: 0.9;
    }

    /* HERO */
    .hero {
      max-width: 1200px;
      margin: 0 auto;
      padding: 6rem 2rem 4rem;
      text-align: center;
    }
    .hero h1 {
      font-size: 3.5rem;
      font-weight: 800;
      line-height: 1.15;
      letter-spacing: -0.03em;
      margin-bottom: 1.25rem;
      color: #fff;
    }
    .hero p {
      color: var(--text-muted);
      font-size: 1.15rem;
      max-width: 580px;
      margin: 0 auto 2.5rem;
      line-height: 1.55;
    }
    .hero-btns {
      display: flex;
      gap: 12px;
      justify-content: center;
    }
    .btn-primary {
      background: var(--primary);
      color: #fff;
      padding: 12px 28px;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-primary:hover {
      background: #4747e6;
    }
    .btn-secondary {
      background: transparent;
      color: var(--text-main);
      padding: 12px 28px;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 500;
      border: 1px solid var(--border-color);
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.02);
      border-color: rgba(255, 255, 255, 0.12);
    }

    /* SAMPLE PROMPT MARQUEE RIBBON */
    .prompt-ribbon-container {
      display: flex;
      align-items: center;
      background: rgba(255, 255, 255, 0.01);
      border-top: 1px solid var(--border-color);
      border-bottom: 1px solid var(--border-color);
      padding: 0.65rem 0;
      width: 100vw;
      position: relative;
      left: 50%;
      right: 50%;
      margin-left: -50vw;
      margin-right: -50vw;
      overflow: hidden;
      margin-bottom: 4rem;
    }
    .prompt-ribbon-inner {
      display: flex;
      align-items: center;
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 2rem;
      width: 100%;
    }
    .prompt-ribbon-label {
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--primary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: var(--primary-dim);
      padding: 3px 8px;
      border-radius: 4px;
      border: 1px solid rgba(92, 92, 255, 0.2);
      margin-right: 2rem;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .prompt-ribbon {
      display: flex;
      overflow: hidden;
      width: 100%;
    }
    .prompt-track {
      display: flex;
      gap: 3.5rem;
      white-space: nowrap;
      animation: marquee 35s linear infinite;
    }
    .prompt-track span {
      color: var(--text-muted);
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      transition: color 0.15s;
    }
    .prompt-track span:hover {
      color: #fff;
    }
    @keyframes marquee {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }

    /* SETUP TERMINAL MOCKUP */
    .setup-section {
      max-width: 1000px;
      margin: 0 auto 6rem;
      padding: 0 2rem;
    }
    .console-window {
      background: #0d0d11;
      border: 1px solid var(--border-color);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0,0,0,0.4);
    }
    .console-header {
      background: rgba(255,255,255,0.02);
      border-bottom: 1px solid var(--border-color);
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1rem;
    }
    .console-dots {
      display: flex;
      gap: 6px;
    }
    .console-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: rgba(255,255,255,0.1);
    }
    .console-title {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .console-tabs {
      display: flex;
      background: rgba(0,0,0,0.2);
      border-bottom: 1px solid var(--border-color);
      overflow-x: auto;
    }
    .console-tab {
      background: transparent;
      border: none;
      border-right: 1px solid var(--border-color);
      color: var(--text-muted);
      padding: 10px 18px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.78rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
    }
    .console-tab:hover {
      color: #fff;
      background: rgba(255,255,255,0.02);
    }
    .console-tab.active {
      color: #fff;
      background: #0d0d11;
      border-bottom: 1px solid #0d0d11;
      margin-bottom: -1px;
    }
    .console-body {
      padding: 1.5rem;
    }
    .tab-content {
      display: none;
      animation: tabFade 0.3s ease;
    }
    .tab-content.active {
      display: block;
    }
    @keyframes tabFade {
      from { opacity: 0; transform: translateY(2px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .setup-desc {
      font-size: 0.88rem;
      color: var(--text-muted);
      margin-bottom: 1rem;
    }
    .code-container {
      position: relative;
    }
    .code-container pre {
      background: #060608;
      border: 1px solid rgba(255,255,255,0.04);
      border-radius: 8px;
      padding: 1.25rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8rem;
      color: #e2e8f0;
      line-height: 1.6;
      overflow-x: auto;
    }
    .btn-copy {
      position: absolute;
      top: 12px;
      right: 12px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.08);
      color: var(--text-muted);
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 0.72rem;
      font-family: inherit;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-copy:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }
    .btn-copy.copied {
      background: #10b981;
      border-color: #10b981;
      color: #000;
    }

    /* GRID / DIRECTORY SECTIONS */
    .section-title-wrapper {
      margin-bottom: 2.5rem;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 1rem;
    }
    .section-label-minimal {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.72rem;
      color: var(--primary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
      display: block;
    }
    .section-title-minimal {
      font-size: 1.6rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    /* GALLERY CARDS */
    .gallery-section {
      max-width: 1200px;
      margin: 0 auto 6rem;
      padding: 0 2rem;
    }
    .gallery-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
    }
    .gallery-card {
      background: rgba(255, 255, 255, 0.015);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      padding: 1.5rem;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      height: 200px;
      transition: border-color 0.2s, background-color 0.2s;
    }
    .gallery-card:hover {
      border-color: rgba(255, 255, 255, 0.15);
      background: rgba(255, 255, 255, 0.025);
    }
    .card-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .card-badge {
      font-size: 0.68rem;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 600;
      color: var(--text-muted);
      border: 1px solid var(--border-color);
      padding: 2px 8px;
      border-radius: 4px;
    }
    .card-date {
      font-size: 0.72rem;
      color: var(--text-muted);
    }
    .card-title {
      font-size: 1.05rem;
      font-weight: 600;
      margin-bottom: 0.4rem;
      color: #fff;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .card-desc {
      font-size: 0.85rem;
      color: var(--text-muted);
      line-height: 1.45;
      margin-bottom: 1.25rem;
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
    }
    .author-avatar {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: rgba(255,255,255,0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.62rem;
      font-weight: 700;
      color: #fff;
    }
    .author-name {
      font-size: 0.78rem;
      color: var(--text-muted);
      font-weight: 500;
    }
    .card-action-text {
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--primary);
    }
    .gallery-card:hover .card-action-text {
      color: #8585ff;
    }
    
    .empty-state {
      grid-column: 1 / -1;
      text-align: center;
      padding: 4rem 2rem;
      border: 1px dashed var(--border-color);
      border-radius: 10px;
    }
    .empty-state h3 { font-size: 1rem; font-weight: 600; margin-bottom: 0.25rem; }
    .empty-state p { color: var(--text-muted); font-size: 0.82rem; }

    /* CORE FEATURES LIST */
    .features-section {
      max-width: 1200px;
      margin: 0 auto 6rem;
      padding: 0 2rem;
    }
    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1px;
      background: var(--border-color);
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid var(--border-color);
    }
    .feature-card {
      background: #08080a;
      padding: 2.25rem 2rem;
    }
    .feature-num {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.72rem;
      color: var(--primary);
      margin-bottom: 1.25rem;
      display: block;
    }
    .feature-card h3 {
      font-size: 1.1rem;
      font-weight: 600;
      margin-bottom: 0.65rem;
      color: #fff;
    }
    .feature-card p {
      color: var(--text-muted);
      font-size: 0.88rem;
      line-height: 1.55;
    }

    /* API PATHS Minimalist list */
    .api-section {
      max-width: 1000px;
      margin: 0 auto 6rem;
      padding: 0 2rem;
    }
    .api-list {
      border: 1px solid var(--border-color);
      border-radius: 12px;
      overflow: hidden;
      background: rgba(255,255,255,0.005);
    }
    .api-row {
      display: flex;
      align-items: center;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--border-color);
    }
    .api-row:last-child { border: none; }
    .method-badge {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
      width: 60px;
      text-align: center;
    }
    .method-badge.post { background: rgba(16, 185, 129, 0.08); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.15); }
    .method-badge.put { background: rgba(245, 158, 11, 0.08); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.15); }
    .method-badge.get { background: rgba(59, 130, 246, 0.08); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.15); }
    .method-badge.del { background: rgba(239, 68, 68, 0.08); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.15); }
    .api-path {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.82rem;
      color: #e2e8f0;
      margin-left: 1.5rem;
      flex: 1;
    }
    .api-desc {
      font-size: 0.85rem;
      color: var(--text-muted);
    }

    /* FOOTER */
    footer {
      border-top: 1px solid var(--border-color);
      padding: 4rem 2rem;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.85rem;
    }
    footer a {
      color: var(--text-muted);
      transition: color 0.15s;
    }
    footer a:hover { color: #fff; }
    .footer-links {
      display: flex;
      justify-content: center;
      gap: 1.5rem;
      margin: 1rem 0;
    }

    /* TOAST STYLE ON LANDING PAGE */
    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #fff;
      color: #000;
      padding: 10px 20px;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 600;
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 200;
      box-shadow: 0 8px 30px rgba(0,0,0,0.5);
    }
    .toast.show {
      opacity: 1;
      transform: translateY(0);
    }

    body::before {
      content: '';
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      background: radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255, 255, 255, 0.015), transparent 45%);
      z-index: 1;
    }



    /* FAQ SECTION */
    .faq-section {
      max-width: 1000px;
      margin: 0 auto 6rem;
      padding: 0 2rem;
    }
    .faq-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 2.25rem 3.5rem;
    }
    .faq-item h3 {
      font-size: 0.95rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: #fff;
    }
    .faq-item p {
      color: var(--text-muted);
      font-size: 0.85rem;
      line-height: 1.55;
    }

    @media (max-width: 768px) {
      .hero h1 { font-size: 2.25rem; }
      .nav-links { display: none; }
      .api-row { flex-direction: column; align-items: flex-start; gap: 6px; }
      .api-path { margin-left: 0; }
      .faq-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <nav>
    <div class="nav-inner">
      <div class="nav-brand" onclick="window.location.href='/'" style="cursor: pointer;">
        <div class="logo">
          <svg class="logo-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        AnyArtifact
      </div>
      <div class="nav-links">
        <a href="#setup">Setup</a>
        <a href="#gallery">Gallery</a>
        <a href="#faq">FAQ</a>
        <a href="#api">API</a>
        <a href="https://github.com/pathakcodes/anyartifact" target="_blank">GitHub</a>
      </div>
      <button class="nav-cta" onclick="document.getElementById('setup').scrollIntoView({behavior:'smooth'})">Get Started</button>
    </div>
  </nav>

  <section class="hero">
    <h1>Publish AI-Generated<br>Web Pages Instantly</h1>
    <p>Deploy dashboards, prototypes, and data visualizations directly from your AI agent workflow. No manual files, zero config hosting.</p>
    <div class="hero-btns">
      <button class="btn-primary" onclick="document.getElementById('setup').scrollIntoView({behavior:'smooth'})">Integrate MCP</button>
      <a href="https://github.com/pathakcodes/anyartifact" target="_blank" class="btn-secondary">View Repository</a>
    </div>
  </section>

  <!-- PROMPT RIBBON -->
  <div class="prompt-ribbon-container">
    <div class="prompt-ribbon-inner">
      <div class="prompt-ribbon-label">Interactive Prompts</div>
      <div class="prompt-ribbon">
        <div class="prompt-track" id="promptTrack">
          <!-- Duplicated list for marquee -->
          <span onclick="copyPromptText(this)">"publish to anyartifact about mars telemetry dashboard"</span>
          <span onclick="copyPromptText(this)">"create an interactive 3D mars colony planner in html"</span>
          <span onclick="copyPromptText(this)">"build a solar system gravity physics simulator"</span>
          <span onclick="copyPromptText(this)">"design a responsive mars rover data sensor board"</span>
          <span onclick="copyPromptText(this)">"generate an Earth vs Mars gravity orbit calculator"</span>
          
          <span onclick="copyPromptText(this)">"publish to anyartifact about mars telemetry dashboard"</span>
          <span onclick="copyPromptText(this)">"create an interactive 3D mars colony planner in html"</span>
          <span onclick="copyPromptText(this)">"build a solar system gravity physics simulator"</span>
          <span onclick="copyPromptText(this)">"design a responsive mars rover data sensor board"</span>
          <span onclick="copyPromptText(this)">"generate an Earth vs Mars gravity orbit calculator"</span>
        </div>
      </div>
    </div>
  </div>

  <section class="setup-section" id="setup">
    <div class="section-title-wrapper">
      <span class="section-label-minimal">01 / Connection</span>
      <h2 class="section-title-minimal">Integrate your agent</h2>
    </div>
    
    <div class="console-window">
      <div class="console-header">
        <div class="console-dots">
          <div class="console-dot"></div>
          <div class="console-dot"></div>
          <div class="console-dot"></div>
        </div>
        <div class="console-title">anyartifact-mcp-config</div>
        <div></div>
      </div>
      
      <div class="console-tabs">
        <button class="console-tab active" onclick="switchTab(event, 'tab-opencode')">OpenCode</button>
        <button class="console-tab" onclick="switchTab(event, 'tab-claude')">Claude Code</button>
        <button class="console-tab" onclick="switchTab(event, 'tab-cursor')">Cursor / Windsurf</button>
        <button class="console-tab" onclick="switchTab(event, 'tab-cline')">Cline</button>
        <button class="console-tab" onclick="switchTab(event, 'tab-claude-desk')">Claude Desktop</button>
      </div>

      <div class="console-body">
        <!-- Tab: OpenCode -->
        <div id="tab-opencode" class="tab-content active">
          <p class="setup-desc">Execute this command in your terminal workspace.</p>
          <div class="code-container">
            <pre><code>opencode mcp add anyartifact ${origin}/mcp</code></pre>
            <button class="btn-copy" onclick="copyCode(this)">copy</button>
          </div>
        </div>

        <!-- Tab: Claude Code -->
        <div id="tab-claude" class="tab-content">
          <p class="setup-desc">Execute this command in your project workspace terminal.</p>
          <div class="code-container">
            <pre><code>claude mcp add --transport sse anyartifact ${origin}/mcp</code></pre>
            <button class="btn-copy" onclick="copyCode(this)">copy</button>
          </div>
        </div>

        <!-- Tab: Cursor -->
        <div id="tab-cursor" class="tab-content">
          <p class="setup-desc">Add as an SSE MCP Server in Cursor/Windsurf settings.</p>
          <div class="code-container">
            <pre><code>${origin}/mcp</code></pre>
            <button class="btn-copy" onclick="copyCode(this)">copy URL</button>
          </div>
        </div>

        <!-- Tab: Cline -->
        <div id="tab-cline" class="tab-content">
          <p class="setup-desc">Register this endpoint as a remote SSE MCP provider in Cline.</p>
          <div class="code-container">
            <pre><code>${origin}/mcp</code></pre>
            <button class="btn-copy" onclick="copyCode(this)">copy URL</button>
          </div>
        </div>

        <!-- Tab: Claude Desktop -->
        <div id="tab-claude-desk" class="tab-content">
          <p class="setup-desc">Append this server configuration block inside <code>claude_desktop_config.json</code>.</p>
          <div class="code-container">
            <pre><code>{
  "mcpServers": {
    "anyartifact": {
      "url": "${origin}/mcp"
    }
  }
}</code></pre>
            <button class="btn-copy" onclick="copyCode(this)">copy JSON</button>
          </div>
        </div>
      </div>
    </div>

    <div class="console-window" style="margin-top: 2rem">
      <div class="console-header">
        <div class="console-dots">
          <div class="console-dot"></div>
          <div class="console-dot"></div>
          <div class="console-dot"></div>
        </div>
        <div class="console-title">.cursorrules / .clinerules</div>
        <div></div>
      </div>
      <div class="console-body">
        <p class="setup-desc">Save this project instruction rule so the agent publishes pages autonomously.</p>
        <div class="code-container">
          <pre><code>## AnyArtifact Integration

When creating interactive HTML artifacts (charts, dashboards, visualizations, reports, or web pages), use the AnyArtifact MCP tools to publish them.

MCP Server: ${origin}/mcp
Tools: publish_artifact, update_artifact, get_artifact, list_artifacts

Workflow:
1. Generate the HTML content.
2. Call publish_artifact with the code content and title.
3. Use visibility "public" so the user can inspect it.
4. Provide the returned URL link back to the user.</code></pre>
          <button class="btn-copy" onclick="copyCode(this)">📋 Copy Rule</button>
        </div>
      </div>
    </div>
  </section>

  <section class="gallery-section" id="gallery">
    <div class="section-title-wrapper">
      <span class="section-label-minimal">02 / Showcase</span>
      <h2 class="section-title-minimal">Recent Artifacts</h2>
    </div>
    <div class="gallery-grid">
      ${cardsHtml}
    </div>
  </section>

  <section class="features-section" id="features">
    <div class="section-title-wrapper">
      <span class="section-label-minimal">03 / Platform</span>
      <h2 class="section-title-minimal">Core features</h2>
    </div>
    <div class="features-grid">
      <div class="feature-card">
        <span class="feature-num">// 01</span>
        <h3>Public & Private Visibility</h3>
        <p>Keep your pages private, password-protect them, or open them for public sharing with the community from a single toggle.</p>
      </div>
      <div class="feature-card">
        <span class="feature-num">// 02</span>
        <h3>Instant MCP Discovery</h3>
        <p>Integrates natively with the Model Context Protocol (MCP) tool chain, giving agents direct API capabilities to push and update layouts.</p>
      </div>
      <div class="feature-card">
        <span class="feature-num">// 03</span>
        <h3>Automatic Versions</h3>
        <p>Agents can overwrite existing pages, building a history of iterations. View older page states easily with the top version selector.</p>
      </div>
    </div>
  </section>

  <section class="faq-section" id="faq">
    <div class="section-title-wrapper">
      <span class="section-label-minimal">03 / FAQ</span>
      <h2 class="section-title-minimal">Frequently Asked Questions</h2>
    </div>
    <div class="faq-grid">
      <div class="faq-item">
        <h3>How does AnyArtifact work?</h3>
        <p>AnyArtifact is an open-source hosting platform for interactive HTML files. By integrating the Model Context Protocol (MCP) server, your AI assistant (like Claude Code, Cursor, or Cline) can publish your generated pages directly from your workspace without requiring manual setup or copy-pasting.</p>
      </div>
      <div class="faq-item">
        <h3>Do I need an API key to publish?</h3>
        <p>No, you do not need an API key to publish public artifacts. However, for authorized management and to deploy private or password-protected pages programmatically, you can generate a free API key directly from the console.</p>
      </div>
      <div class="faq-item">
        <h3>How do I update an existing page?</h3>
        <p>When your AI agent modifies the code content of a page, it calls the <code>update_artifact</code> tool. This pushes a new version under the exact same sharing link. Visitors can view the latest release or inspect older states via the version history dropdown.</p>
      </div>
      <div class="faq-item">
        <h3>Can I password protect my files?</h3>
        <p>Yes. You can restrict access to your page by setting a password or changing its visibility to Private from the viewer toolbar. Private artifacts are visible only to the owner via their unique owner token.</p>
      </div>
    </div>
  </section>

  <section class="api-section" id="api">
    <div class="section-title-wrapper">
      <span class="section-label-minimal">04 / Specifications</span>
      <h2 class="section-title-minimal">API Reference</h2>
    </div>
    <div class="api-list">
      <div class="api-row">
        <span class="method-badge post">POST</span>
        <span class="api-path">/api/v1/artifacts</span>
        <span class="api-desc">Create a new HTML page</span>
      </div>
      <div class="api-row">
        <span class="method-badge put">PUT</span>
        <span class="api-path">/api/v1/artifacts/:id</span>
        <span class="api-desc">Add a new version to the page</span>
      </div>
      <div class="api-row">
        <span class="method-badge get">GET</span>
        <span class="api-path">/api/v1/artifacts</span>
        <span class="api-desc">Retrieve recent public pages</span>
      </div>
      <div class="api-row">
        <span class="method-badge get">GET</span>
        <span class="api-path">/api/v1/artifacts/:id</span>
        <span class="api-desc">Get page details & metadata</span>
      </div>
      <div class="api-row">
        <span class="method-badge del">DELETE</span>
        <span class="api-path">/api/v1/artifacts/:id</span>
        <span class="api-desc">Delete a page permanently</span>
      </div>
    </div>
  </section>

  <footer>
    <div class="footer-links">
      <a href="https://github.com/pathakcodes/anyartifact" target="_blank">GitHub</a> · 
      <a href="/health">Health Status</a> · 
      <a href="/mcp/tools">MCP Tools</a>
    </div>
    <p>© 2026 AnyArtifact · Built with ❤️ by <a href="https://github.com/pathakcodes" target="_blank" style="text-decoration: underline;">pathakcodes</a> for world</p>
  </footer>



  <div class="toast" id="toast">Copied to clipboard!</div>

  <script>
    function switchTab(e, tabId) {
      document.querySelectorAll('.console-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      e.target.classList.add('active');
      document.getElementById(tabId).classList.add('active');
    }

    function copyCode(btn) {
      const code = btn.parentElement.querySelector('code').textContent;
      navigator.clipboard.writeText(code).then(() => {
        const origText = btn.textContent;
        btn.textContent = 'copied!';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = origText;
          btn.classList.remove('copied');
        }, 2000);
      });
    }

    function copyPromptText(span) {
      const text = span.textContent.replace(/"/g, '');
      navigator.clipboard.writeText(text).then(() => {
        showToast('Copied prompt: ' + text);
      });
    }

    function showToast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2500);
    }

    document.addEventListener('mousemove', (e) => {
      document.documentElement.style.setProperty('--mouse-x', e.clientX + 'px');
      document.documentElement.style.setProperty('--mouse-y', e.clientY + 'px');
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
  const visColor = vis === 'private' ? '#ef4444' : vis === 'password' ? '#f59e0b' : '#3b82f6';
  const visLabel = vis === 'private' ? 'Private' : vis === 'password' ? 'Password Protected' : 'Public Link';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(artifact.title)} - AnyArtifact</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      background: #09090b;
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
      height: 56px;
      padding: 0 1.25rem;
      background: #0d0d11;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      z-index: 100;
    }
    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 12px;
      max-width: 30%;
    }
    .btn-back {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #888896;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-back:hover {
      background: rgba(255, 255, 255, 0.03);
      color: #fff;
      border-color: rgba(255,255,255,0.15);
    }
    .toolbar h1 {
      font-size: 0.9rem;
      font-weight: 600;
      color: #fff;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* VIEWPORT SIMULATOR */
    .viewport-controls {
      display: flex;
      background: rgba(255,255,255,0.02);
      padding: 2px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }
    .viewport-btn {
      background: transparent;
      border: none;
      color: #888896;
      padding: 5px 12px;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.78rem;
      font-weight: 500;
      font-family: inherit;
      transition: all 0.15s;
    }
    .viewport-btn svg {
      width: 12px;
      height: 12px;
      fill: currentColor;
    }
    .viewport-btn:hover {
      color: #fff;
    }
    .viewport-btn.active {
      background: rgba(255, 255, 255, 0.06);
      color: #fff;
    }

    .toolbar-right {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 0.8rem;
      color: #888896;
    }
    
    .meta-item b {
      color: #fff;
    }

    /* SELECT DROPDOWN */
    .toolbar select {
      background: rgba(255, 255, 255, 0.02);
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 6px;
      padding: 4px 8px;
      font-size: 0.78rem;
      font-weight: 500;
      cursor: pointer;
      font-family: inherit;
      outline: none;
    }
    .toolbar select:hover {
      border-color: rgba(255,255,255,0.15);
    }

    /* VISIBILITY DROPDOWN */
    .vis-container {
      position: relative;
    }
    .vis-btn {
      background: rgba(255, 255, 255, 0.02);
      color: #fff;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 0.78rem;
      font-weight: 500;
      cursor: pointer;
      border: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      gap: 6px;
      font-family: inherit;
    }
    .vis-btn:hover {
      border-color: rgba(255,255,255,0.15);
    }
    .vis-status-dot {
      width: 6px;
      height: 6px;
      background: ${visColor};
      border-radius: 50%;
    }
    .vis-dropdown {
      display: none;
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 8px;
      background: #0d0d11;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 4px;
      min-width: 220px;
      z-index: 100;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    }
    .vis-dropdown.show { display: block; }
    .vis-option {
      padding: 8px 12px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      border-radius: 6px;
      font-size: 0.8rem;
      transition: background 0.15s;
    }
    .vis-option:hover {
      background: rgba(255, 255, 255, 0.02);
    }
    .vis-option.active {
      color: var(--primary);
    }
    .vis-option .title { font-weight: 600; }
    .vis-option .desc { font-size: 0.7rem; color: #52525b; margin-top: 1px; }
    
    .pwd-section {
      padding: 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.04);
      display: none;
    }
    .pwd-section.show { display: block; }
    .pwd-section input {
      width: 100%;
      padding: 6px 10px;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 4px;
      color: #fff;
      font-size: 0.78rem;
      margin-bottom: 6px;
      outline: none;
    }
    .pwd-section button {
      width: 100%;
      padding: 6px;
      background: #fff;
      color: #000;
      border: none;
      border-radius: 4px;
      font-weight: 600;
      cursor: pointer;
      font-size: 0.78rem;
      font-family: inherit;
    }

    /* ACTION BUTTONS */
    .btn-action {
      background: rgba(255, 255, 255, 0.02);
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 0.78rem;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      font-family: inherit;
    }
    .btn-action:hover {
      border-color: rgba(255,255,255,0.15);
    }
    .btn-action.copied {
      background: #10b981;
      color: #000;
      border-color: #10b981;
    }

    .link-raw {
      color: var(--primary);
      text-decoration: none;
      font-weight: 500;
      transition: color 0.15s;
    }
    .link-raw:hover { color: #8585ff; }

    /* IFRAME FRAME CONTAINER */
    .frame-wrapper {
      flex: 1;
      width: 100%;
      background: #050507;
      display: flex;
      justify-content: center;
      align-items: stretch;
      padding: 1rem;
      position: relative;
    }
    .artifact-frame {
      width: 100%;
      height: 100%;
      border: 1px solid rgba(255,255,255,0.03);
      background: #fff;
      border-radius: 6px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* TOAST NOTIFICATION */
    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #fff;
      color: #000;
      padding: 10px 20px;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 600;
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 200;
      box-shadow: 0 8px 30px rgba(0,0,0,0.5);
    }
    .toast.show {
      opacity: 1;
      transform: translateY(0);
    }
    .toast.error {
      background: #ef4444;
      color: #fff;
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
        <svg style="width:14px;height:14px" viewBox="0 0 24 24"><path fill="currentColor" d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z"/></svg>
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
          ${visLabel}
        </button>
        <div class="vis-dropdown" id="visDropdown">
          <div class="vis-option ${vis === 'public' ? 'active' : ''}" onclick="changeVis('public')">
            <span class="title">Public</span>
            <span class="desc">Anyone with link can inspect</span>
          </div>
          <div class="vis-option ${vis === 'password' ? 'active' : ''}" onclick="changeVis('password')">
            <span class="title">Password Protected</span>
            <span class="desc">Requires verification key</span>
          </div>
          <div class="vis-option ${vis === 'private' ? 'active' : ''}" onclick="changeVis('private')">
            <span class="title">Private</span>
            <span class="desc">Only visible to owner</span>
          </div>
          <div class="pwd-section" id="pwdSection">
            <input type="password" id="newPwd" placeholder="Set password..." />
            <button onclick="savePassword()">Lock</button>
          </div>
        </div>
      </div>

      <button class="btn-action" onclick="copyUrl(this)">
        Copy URL
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
        btn.innerHTML = 'Copied!';
        btn.classList.add('copied');
        showToast('Link copied!');
        setTimeout(() => {
          btn.innerHTML = 'Copy URL';
          btn.classList.remove('copied');
        }, 2000);
      }).catch(() => {
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        btn.innerHTML = 'Copied!';
        btn.classList.add('copied');
        showToast('Link copied!');
        setTimeout(() => {
          btn.innerHTML = 'Copy URL';
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
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      background: #08080a;
      color: #fff;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .card {
      background: #0d0d11;
      border-radius: 12px;
      padding: 3rem;
      max-width: 420px;
      width: 90%;
      text-align: center;
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 15px 30px rgba(0, 0, 0, 0.4);
    }
    h1 { font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; }
    p { color: #888896; font-size: 0.9rem; margin-bottom: 2rem; line-height: 1.5; }
    .form-group { margin-bottom: 1.5rem; text-align: left; }
    .form-group label { display: block; font-size: 0.72rem; font-weight: 600; color: #888896; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
    .form-group input {
      width: 100%;
      padding: 10px 14px;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 6px;
      color: #fff;
      font-size: 0.95rem;
      outline: none;
    }
    .form-group input:focus { border-color: rgba(255,255,255,0.15); }
    button {
      width: 100%;
      padding: 12px;
      background: #fff;
      color: #000;
      border: none;
      border-radius: 6px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
    }
    .error { color: #ef4444; font-size: 0.82rem; margin-top: 1rem; display: none; font-weight: 600; }
    .back { margin-top: 2rem; }
    .back a { color: var(--primary); text-decoration: none; font-size: 0.85rem; font-weight: 600; }
    .back a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${isPrivate ? 'This page is private' : 'Password Protected'}</h1>
    <p>${isPrivate ? 'Only the owner can view this page. If you are the owner, include the owner token in your link.' : 'Enter the secure password to unlock and inspect this artifact.'}</p>
    ${isPrivate ? '' : `
    <form id="pwdForm">
      <div class="form-group">
        <label>Password</label>
        <input type="password" id="password" placeholder="••••••••" autofocus />
      </div>
      <button type="submit">Unlock Page</button>
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
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      background: #08080a;
      color: #fff;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
    }
    .card {
      text-align: center;
      max-width: 400px;
      padding: 2rem;
    }
    h1 { font-size: 4rem; font-weight: 800; color: #fff; line-height: 1; margin-bottom: 1rem; }
    h2 { font-size: 1.15rem; font-weight: 600; margin-bottom: 0.5rem; }
    p { color: #888896; font-size: 0.88rem; margin-bottom: 2rem; line-height: 1.5; }
    a { color: var(--primary); text-decoration: none; font-weight: 600; font-size: 0.88rem; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <h1>404</h1>
    <h2>Page not found</h2>
    <p>The page you are looking for does not exist, has been deleted, or is set to private.</p>
    <a href="/">← Return to Gallery</a>
  </div>
</body>
</html>`;
}

export { viewRoutes };
