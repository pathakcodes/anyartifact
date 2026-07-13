import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';
import { corsMiddleware } from './middleware/cors.js';
import { artifacts } from './routes/artifacts.js';
import { health } from './routes/health.js';
import { viewRoutes } from './routes/view.js';
import { mcpRoutes } from './mcp/server.js';
import { getDatabase } from './db/index.js';
import './types.js';

// Load environment variables
import 'dotenv/config';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', corsMiddleware);

// Health check at root (before other routes)
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    version: '1.0.0',
    uptime: Math.floor(process.uptime()),
  });
});

// API routes
app.route('/api/v1', artifacts);
app.route('/api/v1', health);

// MCP server routes
app.route('/mcp', mcpRoutes);

// View routes (browser-facing)
app.route('/', viewRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

const port = parseInt(process.env.PORT || '3000');

// Initialize database and start server
async function start() {
  await getDatabase();

  serve({
    fetch: app.fetch,
    port,
  }, (info) => {
    console.log(`
╔══════════════════════════════════════════════════╗
║           AnyArtifact Server v1.0.0              ║
║                                                  ║
║  🚀 Running on http://localhost:${info.port}        ║
║  📖 API: http://localhost:${info.port}/api/v1       ║
║  🔧 MCP: http://localhost:${info.port}/mcp          ║
║  🏥 Health: http://localhost:${info.port}/health     ║
╚══════════════════════════════════════════════════╝
    `);
  });
}

start().catch(console.error);

export default app;
