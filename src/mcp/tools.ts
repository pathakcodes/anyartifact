/**
 * MCP Tool definitions for AnyArtifact
 */

export const publishArtifactTool = {
  name: "publish_artifact",
  description: "Publish an interactive HTML artifact to AnyArtifact and get a public URL. The artifact will be hosted for free and accessible via a sandboxed iframe viewer.",
  inputSchema: {
    type: "object",
    properties: {
      content: {
        type: "string",
        description: "Complete HTML document (must contain <!DOCTYPE> or <html> tag). Max 500KB.",
      },
      title: {
        type: "string",
        description: "Artifact title (max 200 characters)",
      },
      description: {
        type: "string",
        description: "Optional description of the artifact (max 1000 characters)",
      },
      author_name: {
        type: "string",
        description: "Optional author name (max 100 characters)",
      },
      slug: {
        type: "string",
        description: "Optional custom URL slug (3-100 characters, alphanumeric and hyphens only)",
      },
    },
    required: ["content", "title"],
  },
};

export const updateArtifactTool = {
  name: "update_artifact",
  description: "Update an existing artifact with new content. Creates a new version while keeping the same URL.",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "The artifact ID to update (e.g., 'aB3kL9mN2pQr')",
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
  description: "Get metadata and version history for an artifact.",
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
  description: "List recent artifacts published on AnyArtifact.",
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
