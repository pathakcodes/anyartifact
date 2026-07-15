import { getDatabase } from '../db/index.js';
import { generateId } from '../utils/ids.js';
import { sha256 } from '../utils/hash.js';
import { now } from '../utils/time.js';
import { validateContent, sanitizeContent } from './content.js';

export interface Artifact {
  id: string;
  slug: string | null;
  title: string;
  description: string;
  author_name: string;
  author_url: string | null;
  api_key_hash: string;
  visibility: 'public' | 'private' | 'password';
  password_hash: string | null;
  share_token: string | null;
  owner_token: string | null;
  created_at: number;
  updated_at: number;
  is_deleted: number;
}

export interface ArtifactVersion {
  id: number;
  artifact_id: string;
  version_number: number;
  content: string;
  content_hash: string;
  size_bytes: number;
  published_at: number;
}

export interface PublishInput {
  content: string;
  title?: string;
  description?: string;
  slug?: string;
  author_name?: string;
  author_url?: string;
  visibility?: 'public' | 'private' | 'password';
  password?: string;
  api_key_hash: string;
}

export interface PublishResult {
  id: string;
  url: string;
  version: number;
  created_at: string;
  size_bytes: number;
  visibility: string;
  share_url?: string;
  owner_url?: string;
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

function mapArtifactResult(columns: string[], values: any[]): Artifact {
  return {
    id: values[columns.indexOf('id')] as string,
    slug: values[columns.indexOf('slug')] as string | null,
    title: values[columns.indexOf('title')] as string,
    description: values[columns.indexOf('description')] as string,
    author_name: values[columns.indexOf('author_name')] as string,
    author_url: values[columns.indexOf('author_url')] as string | null,
    api_key_hash: values[columns.indexOf('api_key_hash')] as string,
    visibility: (values[columns.indexOf('visibility')] as string || 'public') as 'public' | 'private' | 'password',
    password_hash: values[columns.indexOf('password_hash')] as string | null,
    share_token: values[columns.indexOf('share_token')] as string | null,
    owner_token: values[columns.indexOf('owner_token')] as string | null,
    created_at: values[columns.indexOf('created_at')] as number,
    updated_at: values[columns.indexOf('updated_at')] as number,
    is_deleted: values[columns.indexOf('is_deleted')] as number,
  };
}

function mapVersionResult(columns: string[], values: any[]): ArtifactVersion {
  return {
    id: values[columns.indexOf('id')] as number,
    artifact_id: values[columns.indexOf('artifact_id')] as string,
    version_number: values[columns.indexOf('version_number')] as number,
    content: values[columns.indexOf('content')] as string,
    content_hash: values[columns.indexOf('content_hash')] as string,
    size_bytes: values[columns.indexOf('size_bytes')] as number,
    published_at: values[columns.indexOf('published_at')] as number,
  };
}

/**
 * Publish a new artifact
 */
export async function publishArtifact(input: PublishInput): Promise<PublishResult> {
  const db = await getDatabase();

  // Validate content
  const validation = validateContent(input.content);
  if (!validation.valid) {
    throw new ValidationError(validation.error!);
  }

  // Sanitize content
  const { warnings } = sanitizeContent(input.content);
  if (warnings.length > 0) {
    console.warn('Content warnings:', warnings);
  }

  const id = generateId(12);
  const timestamp = now();
  const contentHash = sha256(input.content);
  const sizeBytes = Buffer.byteLength(input.content, 'utf-8');

  // Handle visibility - default to private (owner only)
  const visibility = input.visibility || 'private';
  const passwordHash = input.password ? sha256(input.password) : null;
  const shareToken = generateId(32); // Always generate a share token
  const ownerToken = generateId(32); // Owner access token for private artifacts

  db.run(`
    INSERT INTO artifacts (id, title, description, slug, author_name, author_url, api_key_hash, visibility, password_hash, share_token, owner_token, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    input.title || 'Untitled',
    input.description || '',
    input.slug || null,
    input.author_name || 'Anonymous',
    input.author_url || null,
    input.api_key_hash,
    visibility,
    passwordHash,
    shareToken,
    ownerToken,
    timestamp,
    timestamp,
  ]);

  db.run(`
    INSERT INTO artifact_versions (artifact_id, version_number, content, content_hash, size_bytes, published_at)
    VALUES (?, 1, ?, ?, ?, ?)
  `, [id, input.content, contentHash, sizeBytes, timestamp]);

  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

  return {
    id,
    url: `${baseUrl}/${id}`,
    version: 1,
    created_at: new Date(timestamp).toISOString(),
    size_bytes: sizeBytes,
    visibility,
    share_url: `${baseUrl}/share/${shareToken}`,
    owner_url: `${baseUrl}/${id}?owner=${ownerToken}`,
  };
}

/**
 * Update an existing artifact (creates new version)
 */
export async function updateArtifact(id: string, input: PublishInput): Promise<PublishResult> {
  const db = await getDatabase();

  // Find the artifact
  const artifactResults = db.exec(`
    SELECT * FROM artifacts WHERE id = ? AND is_deleted = 0
  `, [id]);

  if (artifactResults.length === 0 || artifactResults[0].values.length === 0) {
    throw new NotFoundError('Artifact not found');
  }

  const artifact = mapArtifactResult(artifactResults[0].columns, artifactResults[0].values[0]);

  if (artifact.api_key_hash !== input.api_key_hash) {
    throw new ForbiddenError('Not authorized to update this artifact');
  }

  // Validate content
  const validation = validateContent(input.content);
  if (!validation.valid) {
    throw new ValidationError(validation.error!);
  }

  // Get next version number
  const versionResults = db.exec(`
    SELECT MAX(version_number) as max_v FROM artifact_versions WHERE artifact_id = ?
  `, [id]);

  const maxV = versionResults[0]?.values[0]?.[0] as number || 0;
  const newVersion = maxV + 1;
  const timestamp = now();
  const contentHash = sha256(input.content);
  const sizeBytes = Buffer.byteLength(input.content, 'utf-8');

  // Update artifact metadata
  db.run(`
    UPDATE artifacts
    SET updated_at = ?, title = COALESCE(?, title), description = COALESCE(?, description)
    WHERE id = ?
  `, [timestamp, input.title || null, input.description || null, id]);

  // Create new version
  db.run(`
    INSERT INTO artifact_versions (artifact_id, version_number, content, content_hash, size_bytes, published_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [id, newVersion, input.content, contentHash, sizeBytes, timestamp]);

  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

  return {
    id,
    url: `${baseUrl}/${id}`,
    version: newVersion,
    created_at: new Date(artifact.created_at).toISOString(),
    size_bytes: sizeBytes,
    visibility: artifact.visibility,
    share_url: `${baseUrl}/share/${artifact.share_token}`,
    owner_url: `${baseUrl}/${id}?owner=${artifact.owner_token}`,
  };
}

/**
 * Get artifact metadata
 */
export async function getArtifact(id: string): Promise<Artifact & { versions: ArtifactVersion[] }> {
  const db = await getDatabase();

  const artifactResults = db.exec(`
    SELECT * FROM artifacts WHERE id = ? AND is_deleted = 0
  `, [id]);

  if (artifactResults.length === 0 || artifactResults[0].values.length === 0) {
    throw new NotFoundError('Artifact not found');
  }

  const artifact = mapArtifactResult(artifactResults[0].columns, artifactResults[0].values[0]);

  const versionsResults = db.exec(`
    SELECT * FROM artifact_versions WHERE artifact_id = ? ORDER BY version_number DESC
  `, [id]);

  let versions: ArtifactVersion[] = [];
  if (versionsResults.length > 0) {
    versions = versionsResults[0].values.map((v: any) =>
      mapVersionResult(versionsResults[0].columns, v)
    );
  }

  return { ...artifact, versions };
}

/**
 * Get artifact content by version
 */
export async function getArtifactContent(id: string, version?: number): Promise<{ artifact: Artifact; content: string }> {
  const db = await getDatabase();

  const artifactResults = db.exec(`
    SELECT * FROM artifacts WHERE id = ? AND is_deleted = 0
  `, [id]);

  if (artifactResults.length === 0 || artifactResults[0].values.length === 0) {
    throw new NotFoundError('Artifact not found');
  }

  const artifact = mapArtifactResult(artifactResults[0].columns, artifactResults[0].values[0]);

  let versionResults;
  if (version) {
    versionResults = db.exec(`
      SELECT * FROM artifact_versions WHERE artifact_id = ? AND version_number = ?
    `, [id, version]);
  } else {
    versionResults = db.exec(`
      SELECT * FROM artifact_versions WHERE artifact_id = ? ORDER BY version_number DESC LIMIT 1
    `, [id]);
  }

  if (versionResults.length === 0 || versionResults[0].values.length === 0) {
    throw new NotFoundError('Version not found');
  }

  const versionRecord = mapVersionResult(versionResults[0].columns, versionResults[0].values[0]);

  return { artifact, content: versionRecord.content };
}

/**
 * List recent artifacts
 */
export async function listArtifacts(page: number = 1, limit: number = 20): Promise<{
  artifacts: Omit<Artifact, 'api_key_hash' | 'is_deleted' | 'password_hash' | 'share_token' | 'owner_token'>[];
  total: number;
  page: number;
  limit: number;
}> {
  const db = await getDatabase();

  const offset = (page - 1) * limit;

  const artifactsResults = db.exec(`
    SELECT id, slug, title, description, author_name, author_url, visibility, created_at, updated_at
    FROM artifacts
    WHERE is_deleted = 0 AND visibility = 'public'
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `, [limit, offset]);

  const countResults = db.exec(`
    SELECT COUNT(*) as total FROM artifacts WHERE is_deleted = 0 AND visibility = 'public'
  `);

  const total = countResults[0]?.values[0]?.[0] as number || 0;

  let artifacts: Omit<Artifact, 'api_key_hash' | 'is_deleted' | 'password_hash' | 'share_token' | 'owner_token'>[] = [];
  if (artifactsResults.length > 0) {
    artifacts = artifactsResults[0].values.map((values: any) => {
      const columns = artifactsResults[0].columns;
      return {
        id: values[columns.indexOf('id')] as string,
        slug: values[columns.indexOf('slug')] as string | null,
        title: values[columns.indexOf('title')] as string,
        description: values[columns.indexOf('description')] as string,
        author_name: values[columns.indexOf('author_name')] as string,
        author_url: values[columns.indexOf('author_url')] as string | null,
        visibility: 'public' as const,
        created_at: values[columns.indexOf('created_at')] as number,
        updated_at: values[columns.indexOf('updated_at')] as number,
      };
    });
  }

  return {
    artifacts,
    total,
    page,
    limit,
  };
}

/**
 * Soft delete an artifact
 */
export async function deleteArtifact(id: string, apiKeyHash: string): Promise<void> {
  const db = await getDatabase();

  const artifactResults = db.exec(`
    SELECT * FROM artifacts WHERE id = ? AND is_deleted = 0
  `, [id]);

  if (artifactResults.length === 0 || artifactResults[0].values.length === 0) {
    throw new NotFoundError('Artifact not found');
  }

  const artifact = mapArtifactResult(artifactResults[0].columns, artifactResults[0].values[0]);

  if (artifact.api_key_hash !== apiKeyHash) {
    throw new ForbiddenError('Not authorized to delete this artifact');
  }

  db.run(`
    UPDATE artifacts SET is_deleted = 1, updated_at = ? WHERE id = ?
  `, [now(), id]);
}

/**
 * Verify password for a password-protected artifact
 */
export async function verifyArtifactPassword(id: string, password: string): Promise<boolean> {
  const db = await getDatabase();

  const results = db.exec(`
    SELECT password_hash FROM artifacts WHERE id = ? AND is_deleted = 0
  `, [id]);

  if (results.length === 0 || results[0].values.length === 0) {
    throw new NotFoundError('Artifact not found');
  }

  const passwordHash = results[0].values[0][0] as string | null;
  if (!passwordHash) return true; // No password set

  return sha256(password) === passwordHash;
}

/**
 * Get artifact by share token
 */
export async function getArtifactByShareToken(shareToken: string): Promise<Artifact> {
  const db = await getDatabase();

  const results = db.exec(`
    SELECT * FROM artifacts WHERE share_token = ? AND is_deleted = 0
  `, [shareToken]);

  if (results.length === 0 || results[0].values.length === 0) {
    throw new NotFoundError('Artifact not found');
  }

  return mapArtifactResult(results[0].columns, results[0].values[0]);
}

/**
 * Update artifact visibility
 */
export async function updateArtifactVisibility(
  id: string,
  apiKeyHash: string,
  visibility: 'public' | 'private' | 'password',
  password?: string
): Promise<void> {
  const db = await getDatabase();

  const artifactResults = db.exec(`
    SELECT * FROM artifacts WHERE id = ? AND is_deleted = 0
  `, [id]);

  if (artifactResults.length === 0 || artifactResults[0].values.length === 0) {
    throw new NotFoundError('Artifact not found');
  }

  const artifact = mapArtifactResult(artifactResults[0].columns, artifactResults[0].values[0]);

  if (artifact.api_key_hash !== apiKeyHash) {
    throw new ForbiddenError('Not authorized to update this artifact');
  }

  const passwordHash = visibility === 'password' && password ? sha256(password) : null;

  db.run(`
    UPDATE artifacts SET visibility = ?, password_hash = ?, updated_at = ? WHERE id = ?
  `, [visibility, passwordHash, now(), id]);
}
