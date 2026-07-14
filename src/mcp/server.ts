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

// Store active SSE sessions
const sessions = new Map<string, ReadableStreamDefaultController>();

// Get all available tools
function getTools() {
  return [publishArtifactTool, updateArtifactTool, getArtifactTool, listArtifactsTool];
}

// Execute a tool
async function executeTool(name: string, args: any, apiKeyHash: string) {
  switch (name) {
    case 'publish_artifact': {
      const input = PublishSchema.parse(args);
      const result = await publishArtifact({ ...input, api_key_hash: apiKeyHash });
      return {
        content: [{
          type: 'text' as const,
          text: `Artifact published!\n\nID: ${result.id}\nURL: ${result.url}\nOwner URL: ${result.owner_url}\nShare URL: ${result.share_url}\nVisibility: ${result.visibility}\nVersion: ${result.version}\nSize: ${result.size_bytes} bytes`,
        }],
      };
    }
    case 'update_artifact': {
      const input = UpdateSchema.parse(args);
      const result = await updateArtifact(input.id, {
        content: input.content,
        title: input.title,
        description: input.description,
        api_key_hash: apiKeyHash,
      });
      return {
        content: [{
          type: 'text' as const,
          text: `Artifact updated!\n\nID: ${result.id}\nURL: ${result.url}\nVersion: ${result.version}`,
        }],
      };
    }
    case 'get_artifact': {
      const input = GetSchema.parse(args);
      const artifact = await getArtifact(input.id);
      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            id: artifact.id,
            title: artifact.title,
            description: artifact.description,
            author: artifact.author_name,
            visibility: artifact.visibility,
            url: `${baseUrl}/${artifact.id}`,
            owner_url: artifact.owner_token ? `${baseUrl}/${artifact.id}?owner=${artifact.owner_token}` : null,
            versions: artifact.versions.length,
            created: new Date(artifact.created_at).toISOString(),
          }, null, 2),
        }],
      };
    }
    case 'list_artifacts': {
      const input = ListSchema.parse(args || {});
      const result = await listArtifacts(input.page || 1, input.limit || 20);
      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      return {
        content: [{
          type: 'text' as const,
          text: result.artifacts.length === 0
            ? 'No public artifacts found.'
            : JSON.stringify(result.artifacts.map(a => ({
                id: a.id,
                title: a.title,
                author: a.author_name,
                url: `${baseUrl}/${a.id}`,
                created: new Date(a.created_at).toISOString(),
              })), null, 2),
        }],
      };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

/**
 * MCP SSE endpoint - establishes SSE connection
 * Client connects here to receive events
 */
mcpRoutes.get('/sse', async (c) => {
  const sessionId = Math.random().toString(36).substring(2, 15);

  const stream = new ReadableStream({
    start(controller) {
      sessions.set(sessionId, controller);

      // Send endpoint event telling client where to POST messages
      const endpointUrl = `${process.env.BASE_URL || `http://${c.req.header('host')}`}/mcp/message?sessionId=${sessionId}`;

      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(`event: endpoint\ndata: ${endpointUrl}\n\n`));

      // Send initialized notification
      controller.enqueue(encoder.encode(`event: message\ndata: ${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n\n`));
    },
    cancel() {
      sessions.delete(sessionId);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
});

/**
 * MCP message endpoint - receives JSON-RPC messages from client
 */
mcpRoutes.post('/message', async (c) => {
  try {
    const sessionId = c.req.query('sessionId');
    const body = await c.req.json();
    const { id, method, params } = body;

    let result: any = null;

    switch (method) {
      case 'initialize': {
        result = {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: 'anyartifact',
            version: '1.0.0',
          },
        };
        break;
      }

      case 'tools/list': {
        result = { tools: getTools() };
        break;
      }

      case 'tools/call': {
        const { name, arguments: args } = params;

        // Get API key from header (optional)
        let apiKeyHash = 'anonymous';
        const authHeader = c.req.header('Authorization');
        if (authHeader) {
          const match = authHeader.match(/^Bearer\s+(.+)$/i);
          if (match) {
            const record = await verifyApiKey(match[1]);
            if (record) apiKeyHash = record.key_hash;
          }
        }
        if (apiKeyHash === 'anonymous') {
          apiKeyHash = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'anonymous';
        }

        result = await executeTool(name, args || {}, apiKeyHash);
        break;
      }

      case 'ping': {
        result = {};
        break;
      }

      default:
        return c.json({
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Method not found: ${method}` },
        });
    }

    // Send response via SSE if session exists
    if (sessionId && sessions.has(sessionId)) {
      const controller = sessions.get(sessionId)!;
      const encoder = new TextEncoder();
      const response = { jsonrpc: '2.0', id, result };
      controller.enqueue(encoder.encode(`event: message\ndata: ${JSON.stringify(response)}\n\n`));
      return c.json({ ok: true });
    }

    // Otherwise return response directly (for stateless calls)
    return c.json({ jsonrpc: '2.0', id, result });
  } catch (error) {
    console.error('MCP message error:', error);
    const id = (await c.req.json().catch(() => ({})))?.id;
    return c.json({
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : 'Internal error',
      },
    });
  }
});

/**
 * MCP tools/list endpoint (REST fallback)
 */
mcpRoutes.get('/tools', async (c) => {
  return c.json({ tools: getTools() });
});

/**
 * MCP tools/call endpoint (REST fallback)
 */
mcpRoutes.post('/tools/call', async (c) => {
  try {
    const body = await c.req.json();
    const { name, arguments: args } = body;

    let apiKeyHash = 'anonymous';
    const authHeader = c.req.header('Authorization');
    if (authHeader) {
      const match = authHeader.match(/^Bearer\s+(.+)$/i);
      if (match) {
        const record = await verifyApiKey(match[1]);
        if (record) apiKeyHash = record.key_hash;
      }
    }
    if (apiKeyHash === 'anonymous') {
      apiKeyHash = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'anonymous';
    }

    const result = await executeTool(name, args || {}, apiKeyHash);
    return c.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: { message: 'Invalid arguments', details: error.errors } }, 400);
    }
    if (error instanceof ValidationError) {
      return c.json({ error: { message: error.message } }, 400);
    }
    if (error instanceof NotFoundError) {
      return c.json({ error: { message: error.message } }, 404);
    }
    console.error('MCP tool error:', error);
    return c.json({ error: { message: error instanceof Error ? error.message : 'Internal error' } }, 500);
  }
});

/**
 * MCP initialize endpoint (REST fallback)
 */
mcpRoutes.post('/initialize', async (c) => {
  return c.json({
    protocolVersion: '2024-11-05',
    capabilities: { tools: {} },
    serverInfo: { name: 'anyartifact', version: '1.0.0' },
  });
});

/**
 * Root MCP endpoint - returns server info
 */
mcpRoutes.get('/', async (c) => {
  return c.json({
    name: 'anyartifact',
    version: '1.0.0',
    protocol: 'mcp',
    transport: ['sse', 'http'],
    endpoints: {
      sse: '/mcp/sse',
      message: '/mcp/message',
      tools: '/mcp/tools',
      toolsCall: '/mcp/tools/call',
    },
    tools: getTools().map(t => t.name),
  });
});

export { mcpRoutes };
