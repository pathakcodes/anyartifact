import { Hono } from 'hono';

const health = new Hono();

const startTime = Date.now();

health.get('/health', (c) => {
  return c.json({
    status: 'ok',
    version: '1.0.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
  });
});

export { health };
