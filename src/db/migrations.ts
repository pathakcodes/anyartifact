import type { Database as SqlJsDatabase } from 'sql.js';

export function runMigrations(db: SqlJsDatabase): void {
  // Create tables if they don't exist
  db.run(`
    CREATE TABLE IF NOT EXISTS artifacts (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE,
      title TEXT DEFAULT 'Untitled',
      description TEXT DEFAULT '',
      author_name TEXT DEFAULT 'Anonymous',
      author_url TEXT,
      api_key_hash TEXT NOT NULL,
      visibility TEXT DEFAULT 'public' CHECK(visibility IN ('public', 'private', 'password')),
      password_hash TEXT,
      share_token TEXT UNIQUE,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      is_deleted INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS artifact_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      artifact_id TEXT NOT NULL REFERENCES artifacts(id),
      version_number INTEGER NOT NULL,
      content TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      published_at INTEGER NOT NULL,
      UNIQUE(artifact_id, version_number)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key_hash TEXT UNIQUE NOT NULL,
      key_prefix TEXT NOT NULL,
      label TEXT DEFAULT '',
      created_at INTEGER NOT NULL,
      last_used_at INTEGER,
      is_active INTEGER DEFAULT 1,
      rate_limit_per_minute INTEGER DEFAULT 60
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS rate_limits (
      api_key_hash TEXT NOT NULL,
      window_start INTEGER NOT NULL,
      request_count INTEGER DEFAULT 0,
      PRIMARY KEY (api_key_hash, window_start)
    )
  `);

  // Migration: Add visibility columns to existing artifacts table
  // These ALTER TABLE statements are safe to run even if columns already exist
  try { db.run(`ALTER TABLE artifacts ADD COLUMN visibility TEXT DEFAULT 'public'`); } catch {}
  try { db.run(`ALTER TABLE artifacts ADD COLUMN password_hash TEXT`); } catch {}
  try { db.run(`ALTER TABLE artifacts ADD COLUMN share_token TEXT`); } catch {}
  try { db.run(`ALTER TABLE artifacts ADD COLUMN owner_token TEXT`); } catch {}

  // Indexes for performance
  db.run(`CREATE INDEX IF NOT EXISTS idx_artifacts_slug ON artifacts(slug)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_artifacts_created ON artifacts(created_at DESC)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_artifacts_visibility ON artifacts(visibility)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_artifacts_share_token ON artifacts(share_token)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_versions_artifact ON artifact_versions(artifact_id, version_number DESC)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_versions_hash ON artifact_versions(content_hash)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash)`);

  // Generate share tokens for existing artifacts that don't have one
  const needsToken = db.exec(`SELECT id FROM artifacts WHERE share_token IS NULL AND is_deleted = 0`);
  if (needsToken.length > 0 && needsToken[0].values.length > 0) {
    for (const row of needsToken[0].values) {
      const id = row[0] as string;
      const token = generateToken();
      db.run(`UPDATE artifacts SET share_token = ? WHERE id = ?`, [token, id]);
    }
  }

  // Generate owner tokens for existing artifacts that don't have one
  const needsOwnerToken = db.exec(`SELECT id FROM artifacts WHERE owner_token IS NULL AND is_deleted = 0`);
  if (needsOwnerToken.length > 0 && needsOwnerToken[0].values.length > 0) {
    for (const row of needsOwnerToken[0].values) {
      const id = row[0] as string;
      const token = generateToken();
      db.run(`UPDATE artifacts SET owner_token = ? WHERE id = ?`, [token, id]);
    }
  }
}

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
