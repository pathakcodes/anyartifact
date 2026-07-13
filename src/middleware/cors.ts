import { cors } from 'hono/cors';

/**
 * CORS configuration for the API
 */
export const corsMiddleware = cors({
  origin: '*', // Allow all origins for public API
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400, // 24 hours
});
