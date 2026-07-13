import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware, getApiKeyHash } from '../middleware/auth.js';
import { publishRateLimit } from '../middleware/rate-limit.js';
import {
  publishArtifact,
  updateArtifact,
  getArtifact,
  getArtifactContent,
  listArtifacts,
  deleteArtifact,
  verifyArtifactPassword,
  updateArtifactVisibility,
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from '../services/artifact.js';
import { generateApiKey } from '../services/api-key.js';

const artifacts = new Hono();

// Validation schemas
const PublishSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  title: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  slug: z.string().regex(/^[a-zA-Z0-9-]{3,100}$/, 'Slug must be 3-100 characters, alphanumeric and hyphens only').optional(),
  author_name: z.string().max(100).optional(),
  author_url: z.string().url().optional(),
  visibility: z.enum(['public', 'private', 'password']).optional(),
  password: z.string().min(1).max(100).optional(),
});

const VisibilitySchema = z.object({
  visibility: z.enum(['public', 'private', 'password']),
  password: z.string().min(1).max(100).optional(),
});

const VerifyPasswordSchema = z.object({
  password: z.string().min(1),
});

const CreateKeySchema = z.object({
  label: z.string().max(100).optional(),
});

// POST /api/v1/artifacts - Publish new artifact
artifacts.post('/artifacts', authMiddleware, publishRateLimit(), async (c) => {
  try {
    const body = await c.req.json();
    const input = PublishSchema.parse(body);

    const result = await publishArtifact({
      ...input,
      api_key_hash: getApiKeyHash(c),
    });

    return c.json(result, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    if (error instanceof ValidationError) {
      return c.json({ error: error.message }, 400);
    }
    throw error;
  }
});

// PUT /api/v1/artifacts/:id - Update artifact
artifacts.put('/artifacts/:id', authMiddleware, publishRateLimit(), async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const input = PublishSchema.parse(body);

    const result = await updateArtifact(id, {
      ...input,
      api_key_hash: getApiKeyHash(c),
    });

    return c.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    if (error instanceof NotFoundError) {
      return c.json({ error: error.message }, 404);
    }
    if (error instanceof ForbiddenError) {
      return c.json({ error: error.message }, 403);
    }
    if (error instanceof ValidationError) {
      return c.json({ error: error.message }, 400);
    }
    throw error;
  }
});

// GET /api/v1/artifacts/:id - Get artifact metadata
artifacts.get('/artifacts/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const artifact = await getArtifact(id);

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

    return c.json({
      id: artifact.id,
      title: artifact.title,
      description: artifact.description,
      slug: artifact.slug,
      author_name: artifact.author_name,
      author_url: artifact.author_url,
      visibility: artifact.visibility,
      share_url: artifact.share_token ? `${baseUrl}/share/${artifact.share_token}` : null,
      owner_url: artifact.owner_token ? `${baseUrl}/${artifact.id}?owner=${artifact.owner_token}` : null,
      version: artifact.versions[0]?.version_number || 1,
      versions: artifact.versions.map((v) => ({
        version: v.version_number,
        published_at: new Date(v.published_at).toISOString(),
        size_bytes: v.size_bytes,
      })),
      url: `${baseUrl}/${artifact.id}`,
      created_at: new Date(artifact.created_at).toISOString(),
      updated_at: new Date(artifact.updated_at).toISOString(),
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return c.json({ error: error.message }, 404);
    }
    throw error;
  }
});

// GET /api/v1/artifacts/:id/raw - Get raw HTML content
artifacts.get('/artifacts/:id/raw', async (c) => {
  try {
    const id = c.req.param('id');
    const versionParam = c.req.query('version');
    const version = versionParam ? parseInt(versionParam) : undefined;

    const { content } = await getArtifactContent(id, version);

    return c.html(content);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return c.json({ error: error.message }, 404);
    }
    throw error;
  }
});

// DELETE /api/v1/artifacts/:id - Delete artifact
artifacts.delete('/artifacts/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    await deleteArtifact(id, getApiKeyHash(c));

    return c.json({ success: true });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return c.json({ error: error.message }, 404);
    }
    if (error instanceof ForbiddenError) {
      return c.json({ error: error.message }, 403);
    }
    throw error;
  }
});

// GET /api/v1/artifacts - List recent artifacts
artifacts.get('/artifacts', async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');

  const result = await listArtifacts(page, Math.min(limit, 100));

  return c.json(result);
});

// POST /api/v1/keys - Create new API key
artifacts.post('/keys', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { label } = CreateKeySchema.parse(body);

    const { key, prefix } = await generateApiKey(label || 'API Key');

    return c.json({
      key,
      prefix,
      message: 'Save this API key - it will not be shown again',
    }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    throw error;
  }
});

// PUT /api/v1/artifacts/:id/visibility - Update artifact visibility (supports owner token)
artifacts.put('/artifacts/:id/visibility', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const input = VisibilitySchema.parse(body);

    // Support both API key and owner token authentication
    const apiKeyHash = getApiKeyHash(c);
    const ownerToken = c.req.query('owner');

    if (!apiKeyHash && !ownerToken) {
      return c.json({ error: 'Authorization required (API key or owner token)' }, 401);
    }

    // If using owner token, verify it matches
    if (ownerToken) {
      const { getArtifact } = await import('../services/artifact.js');
      const artifact = await getArtifact(id);
      if (artifact.owner_token !== ownerToken) {
        return c.json({ error: 'Invalid owner token' }, 403);
      }
      // Use the API key hash from the artifact for the update
      await updateArtifactVisibility(id, artifact.api_key_hash, input.visibility, input.password);
    } else {
      await updateArtifactVisibility(id, apiKeyHash, input.visibility, input.password);
    }

    return c.json({ success: true, visibility: input.visibility });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    if (error instanceof NotFoundError) {
      return c.json({ error: error.message }, 404);
    }
    if (error instanceof ForbiddenError) {
      return c.json({ error: error.message }, 403);
    }
    throw error;
  }
});

// POST /api/v1/artifacts/:id/verify - Verify password for artifact
artifacts.post('/artifacts/:id/verify', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const input = VerifyPasswordSchema.parse(body);

    const valid = await verifyArtifactPassword(id, input.password);

    return c.json({ valid });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    if (error instanceof NotFoundError) {
      return c.json({ error: error.message }, 404);
    }
    throw error;
  }
});

export { artifacts };
