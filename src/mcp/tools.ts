/**
 * MCP Tool definitions for AnyArtifact
 */

const BASE_URL = process.env.BASE_URL || 'https://anyartifact-production.up.railway.app';

export const publishArtifactTool = {
  name: "publish_artifact",
  description: `Publish an interactive HTML artifact to AnyArtifact. You get back a public URL, owner URL (for managing), and share URL. No API key needed.

The artifact is rendered in a sandboxed iframe for security. Supports any HTML/CSS/JavaScript.

Default visibility is "private" (owner only). Use visibility "public" to share with anyone.`,
  inputSchema: {
    type: "object",
    properties: {
      content: {
        type: "string",
        description: "Complete HTML document (must contain <!DOCTYPE> or <html> tag). Max 500KB. Can include inline CSS, JavaScript, SVG, images as data URIs.",
      },
      title: {
        type: "string",
        description: "Artifact title (max 200 characters). Shown in the viewer toolbar and gallery.",
      },
      description: {
        type: "string",
        description: "Optional description of the artifact (max 1000 characters)",
      },
      author_name: {
        type: "string",
        description: "Optional author name (max 100 characters). Shown in the viewer.",
      },
      slug: {
        type: "string",
        description: "Optional custom URL slug (3-100 characters, alphanumeric and hyphens only)",
      },
      visibility: {
        type: "string",
        enum: ["public", "private", "password"],
        description: "Visibility setting. 'public' = anyone can view, 'password' = requires password, 'private' = owner only (default). You can change this later from the owner URL.",
      },
      password: {
        type: "string",
        description: "Password for password-protected artifacts. Required when visibility is 'password'.",
      },
    },
    required: ["content", "title"],
  },
};

export const updateArtifactTool = {
  name: "update_artifact",
  description: `Update an existing artifact with new content. Creates a new version while keeping the same URL. The owner URL or API key is required for authorization.`,
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "The artifact ID to update (e.g., 'aB3kL9mN2pQr'). Found in the URL or publish response.",
      },
      content: {
        type: "string",
        description: "Updated HTML content",
      },
      title: {
        type: "string",
        description: "Optional new title",
      },
      description: {
        type: "string",
        description: "Optional new description",
      },
    },
    required: ["id", "content"],
  },
};

export const getArtifactTool = {
  name: "get_artifact",
  description: "Get metadata and version history for an artifact. Returns title, author, visibility, URL, owner URL, and version count.",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "The artifact ID",
      },
    },
    required: ["id"],
  },
};

export const listArtifactsTool = {
  name: "list_artifacts",
  description: "List recent public artifacts published on AnyArtifact. Returns artifact IDs, titles, authors, and URLs.",
  inputSchema: {
    type: "object",
    properties: {
      page: {
        type: "number",
        description: "Page number (default: 1)",
      },
      limit: {
        type: "number",
        description: "Items per page (default: 20, max: 100)",
      },
    },
  },
};
