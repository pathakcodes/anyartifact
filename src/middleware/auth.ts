import { Context, Next } from 'hono';
import { verifyApiKey } from '../services/api-key.js';

/**
 * Authentication middleware - verifies API key from Authorization header
 */
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader) {
    return c.json({ error: 'Authorization header required' }, 401);
  }

  // Extract bearer token
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return c.json({ error: 'Invalid authorization format. Use: Bearer <api_key>' }, 401);
  }

  const apiKey = match[1];
  const record = await verifyApiKey(apiKey);

  if (!record) {
    return c.json({ error: 'Invalid or inactive API key' }, 401);
  }

  // Store API key hash using raw header approach
  // Hono's c.set() has type issues, so we use a workaround
  (c as any)._apiKeyHash = record.key_hash;

  await next();
}

/**
 * Get API key hash from context (set by authMiddleware)
 */
export function getApiKeyHash(c: Context): string {
  return (c as any)._apiKeyHash || '';
}
