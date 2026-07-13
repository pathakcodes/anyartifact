import { Context, Next } from 'hono';
import { getDatabase } from '../db/index.js';

interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
}

/**
 * Token bucket rate limiter using SQLite
 * Rate limits by IP address for simplicity
 */
export function rateLimit(options: RateLimitOptions) {
  const { maxRequests, windowMs } = options;

  return async (c: Context, next: Next) => {
    // Rate limit by IP address
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || '127.0.0.1';

    try {
      const db = await getDatabase();
      const windowStart = Math.floor(Date.now() / windowMs) * windowMs;

      // Get current count
      const results = db.exec(`
        SELECT request_count FROM rate_limits WHERE api_key_hash = ? AND window_start = ?
      `, [ip, windowStart]);

      let currentCount = 0;
      if (results.length > 0 && results[0].values.length > 0) {
        currentCount = results[0].values[0][0] as number;
      }

      if (currentCount >= maxRequests) {
        const retryAfter = Math.ceil((windowStart + windowMs - Date.now()) / 1000);
        return c.json({ error: 'Rate limit exceeded' }, 429, {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil((windowStart + windowMs) / 1000)),
        });
      }

      // Increment count
      if (currentCount > 0) {
        db.run(`
          UPDATE rate_limits SET request_count = request_count + 1
          WHERE api_key_hash = ? AND window_start = ?
        `, [ip, windowStart]);
      } else {
        db.run(`
          INSERT INTO rate_limits (api_key_hash, window_start, request_count)
          VALUES (?, ?, 1)
        `, [ip, windowStart]);
      }

      // Set rate limit headers
      c.header('X-RateLimit-Limit', String(maxRequests));
      c.header('X-RateLimit-Remaining', String(maxRequests - currentCount - 1));
      c.header('X-RateLimit-Reset', String(Math.ceil((windowStart + windowMs) / 1000)));
    } catch (error) {
      // Don't block requests if rate limiting fails
      console.error('Rate limit error:', error);
    }

    await next();
  };
}

/**
 * Rate limit for publishing operations
 */
export function publishRateLimit() {
  return rateLimit({
    maxRequests: parseInt(process.env.RATE_LIMIT_PUBLISH || '60'),
    windowMs: 60 * 1000, // 1 minute
  });
}

/**
 * Rate limit for viewing operations
 */
export function viewRateLimit() {
  return rateLimit({
    maxRequests: parseInt(process.env.RATE_LIMIT_VIEW || '1000'),
    windowMs: 60 * 1000, // 1 minute
  });
}
