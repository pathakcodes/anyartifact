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

// Active SSE sessions
const sessions = new Map<string, { controller: ReadableStreamDefaultController; encoder: TextEncoder }>();

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

// Send SSE event to a session
function sendSSE(sessionId: string, event: string, data: any) {
  const session = sessions.get(sessionId);
  if (session) {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    session.controller.enqueue(session.encoder.encode(message));
  }
}

// Shared SSE handler
function handleSSE(c: any) {
  const sessionId = crypto.randomUUID().slice(0, 12);
  const baseUrl = process.env.BASE_URL || `https://${c.req.header('host')}`;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      sessions.set(sessionId, { controller, encoder });

      // Send endpoint event with message URL
      const endpointUrl = `${baseUrl}/mcp/message?sessionId=${sessionId}`;
      controller.enqueue(encoder.encode(`event: endpoint\ndata: ${endpointUrl}\n\n`));

      console.log(`[MCP] SSE session ${sessionId} connected`);
    },
    cancel() {
      sessions.delete(sessionId);
      console.log(`[MCP] SSE session ${sessionId} disconnected`);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

// SSE endpoint at /sse (alternate path)
mcpRoutes.get('/sse', async (c) => handleSSE(c));

/**
 * Message endpoint - receives JSON-RPC requests from client
 * Sends responses back via SSE
 */
mcpRoutes.post('/message', async (c) => {
  const sessionId = c.req.query('sessionId');

  if (!sessionId || !sessions.has(sessionId)) {
    return c.json({ error: 'Invalid or missing sessionId' }, 400);
  }

  try {
    const body = await c.req.json();
    const { id, method, params } = body;

    console.log(`[MCP] Session ${sessionId}: ${method}`);

    let result: any = null;

    switch (method) {
      case 'initialize':
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

      case 'notifications/initialized':
        // Client acknowledges initialization, no response needed
        return c.json({ ok: true });

      case 'tools/list':
        result = { tools: getTools() };
        break;

      case 'tools/call': {
        const { name, arguments: args } = params || {};

        // Get API key from header
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

      case 'ping':
        result = {};
        break;

      default:
        // Send error response
        sendSSE(sessionId, 'message', {
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Method not found: ${method}` },
        });
        return c.json({ ok: true });
    }

    // Send success response via SSE
    sendSSE(sessionId, 'message', {
      jsonrpc: '2.0',
      id,
      result,
    });

    return c.json({ ok: true });
  } catch (error) {
    console.error(`[MCP] Session ${sessionId} error:`, error);

    const body = await c.req.json().catch(() => ({}));
    sendSSE(sessionId, 'message', {
      jsonrpc: '2.0',
      id: body.id,
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : 'Internal error',
      },
    });

    return c.json({ ok: true });
  }
});

/**
 * REST fallback: tools/list
 */
mcpRoutes.get('/tools', async (c) => {
  return c.json({ tools: getTools() });
});

/**
 * REST fallback: tools/call
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
 * Root MCP endpoint — SSE for MCP clients
 * Clients like Claude Code hit /mcp directly expecting SSE
 */
mcpRoutes.get('/', async (c) => {
  // If client accepts SSE, start SSE session
  const accept = c.req.header('Accept') || '';
  if (accept.includes('text/event-stream') || accept === '*/*') {
    return handleSSE(c);
  }
  // Otherwise return JSON info
  return c.json({
    name: 'anyartifact',
    version: '1.0.0',
    protocol: 'mcp',
    transport: ['sse'],
    endpoints: {
      sse: '/mcp',
      message: '/mcp/message',
    },
    tools: getTools().map(t => t.name),
  });
});

export { mcpRoutes };
