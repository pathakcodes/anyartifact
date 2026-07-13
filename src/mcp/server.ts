import { Hono } from 'hono';
import { z } from 'zod';
import { verifyApiKey } from '../services/api-key.js';
import {
  publishArtifact,
  updateArtifact,
  getArtifact,
  listArtifacts,
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from '../services/artifact.js';
import {
  publishArtifactTool,
  updateArtifactTool,
  getArtifactTool,
  listArtifactsTool,
} from './tools.js';

const mcpRoutes = new Hono();

// MCP tool schemas
const PublishSchema = z.object({
  content: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  author_name: z.string().max(100).optional(),
  slug: z.string().regex(/^[a-zA-Z0-9-]{3,100}$/).optional(),
  visibility: z.enum(['public', 'private', 'password']).optional(),
  password: z.string().min(1).max(100).optional(),
});

const UpdateSchema = z.object({
  id: z.string().min(1),
  content: z.string().min(1),
  title: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
});

const GetSchema = z.object({
  id: z.string().min(1),
});

const ListSchema = z.object({
  page: z.number().optional(),
  limit: z.number().optional(),
});

/**
 * MCP SSE endpoint - returns tool list
 * This is the entry point for MCP clients
 */
mcpRoutes.get('/sse', async (c) => {
  // Return available tools as SSE stream
  const tools = [
    publishArtifactTool,
    updateArtifactTool,
    getArtifactTool,
    listArtifactsTool,
  ];

  return c.json({
    tools,
    protocol: 'mcp',
    version: '1.0',
  });
});

/**
 * MCP tools/list endpoint
 */
mcpRoutes.get('/tools', async (c) => {
  const tools = [
    publishArtifactTool,
    updateArtifactTool,
    getArtifactTool,
    listArtifactsTool,
  ];

  return c.json({ tools });
});

/**
 * MCP tools/call endpoint - execute a tool
 */
mcpRoutes.post('/tools/call', async (c) => {
  try {
    const body = await c.req.json();
    const { name, arguments: args } = body;

    // Get API key from header
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({
        error: { message: 'Authorization header required', code: 'UNAUTHORIZED' },
      }, 401);
    }

    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      return c.json({
        error: { message: 'Invalid authorization format', code: 'UNAUTHORIZED' },
      }, 401);
    }

    const apiKey = match[1];
    const record = await verifyApiKey(apiKey);
    if (!record) {
      return c.json({
        error: { message: 'Invalid API key', code: 'UNAUTHORIZED' },
      }, 401);
    }

    // Execute tool
    switch (name) {
      case 'publish_artifact': {
        const input = PublishSchema.parse(args);
        const result = await publishArtifact({
          ...input,
          api_key_hash: record.key_hash,
        });

        return c.json({
          content: [
            {
              type: 'text',
              text: `Artifact published successfully!\n\nID: ${result.id}\nURL: ${result.url}\nVersion: ${result.version}\nSize: ${result.size_bytes} bytes\nVisibility: ${result.visibility}${result.share_url ? `\nShare URL: ${result.share_url}` : ''}`,
            },
          ],
          metadata: result,
        });
      }

      case 'update_artifact': {
        const input = UpdateSchema.parse(args);
        const result = await updateArtifact(input.id, {
          content: input.content,
          title: input.title,
          description: input.description,
          api_key_hash: record.key_hash,
        });

        return c.json({
          content: [
            {
              type: 'text',
              text: `Artifact updated successfully!\n\nID: ${result.id}\nURL: ${result.url}\nVersion: ${result.version}\nSize: ${result.size_bytes} bytes`,
            },
          ],
          metadata: result,
        });
      }

      case 'get_artifact': {
        const input = GetSchema.parse(args);
        const artifact = await getArtifact(input.id);

        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

        return c.json({
          content: [
            {
              type: 'text',
              text: `Artifact: ${artifact.title}\n\nID: ${artifact.id}\nURL: ${baseUrl}/${artifact.id}\nAuthor: ${artifact.author_name}\nCreated: ${new Date(artifact.created_at).toISOString()}\nLatest Version: ${artifact.versions[0]?.version_number || 1}\nVersions: ${artifact.versions.length}`,
            },
          ],
          metadata: {
            id: artifact.id,
            title: artifact.title,
            description: artifact.description,
            author_name: artifact.author_name,
            url: `${baseUrl}/${artifact.id}`,
            versions: artifact.versions.map((v) => ({
              version: v.version_number,
              published_at: new Date(v.published_at).toISOString(),
              size_bytes: v.size_bytes,
            })),
          },
        });
      }

      case 'list_artifacts': {
        const input = ListSchema.parse(args || {});
        const result = await listArtifacts(input.page || 1, input.limit || 20);

        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

        const text = result.artifacts.length === 0
          ? 'No artifacts found.'
          : `Found ${result.total} artifacts:\n\n${result.artifacts.map((a) =>
              `- ${a.title} (${a.id}) by ${a.author_name} - ${baseUrl}/${a.id}`
            ).join('\n')}`;

        return c.json({
          content: [{ type: 'text', text }],
          metadata: result,
        });
      }

      default:
        return c.json({
          error: { message: `Unknown tool: ${name}`, code: 'UNKNOWN_TOOL' },
        }, 400);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({
        error: { message: 'Invalid arguments', code: 'VALIDATION_ERROR', details: error.errors },
      }, 400);
    }
    if (error instanceof ValidationError) {
      return c.json({
        error: { message: error.message, code: 'VALIDATION_ERROR' },
      }, 400);
    }
    if (error instanceof NotFoundError) {
      return c.json({
        error: { message: error.message, code: 'NOT_FOUND' },
      }, 404);
    }
    if (error instanceof ForbiddenError) {
      return c.json({
        error: { message: error.message, code: 'FORBIDDEN' },
      }, 403);
    }
    console.error('MCP tool error:', error);
    return c.json({
      error: { message: 'Internal server error', code: 'INTERNAL_ERROR' },
    }, 500);
  }
});

/**
 * MCP initialize endpoint
 */
mcpRoutes.post('/initialize', async (c) => {
  return c.json({
    protocol: 'mcp',
    version: '1.0',
    capabilities: {
      tools: {
        listChanged: false,
      },
    },
    serverInfo: {
      name: 'anyartifact',
      version: '1.0.0',
    },
  });
});

export { mcpRoutes };
