import { getDatabase } from '../db/index.js';
import { sha256, generateRandomKey } from '../utils/hash.js';

export interface ApiKeyRecord {
  id: number;
  key_hash: string;
  key_prefix: string;
  label: string;
  created_at: number;
  last_used_at: number | null;
  is_active: number;
  rate_limit_per_minute: number;
}

export interface GeneratedApiKey {
  key: string;
  prefix: string;
  hash: string;
}

/**
 * Generate a new API key and store it in the database
 */
export async function generateApiKey(label: string = ''): Promise<GeneratedApiKey> {
  const db = await getDatabase();

  // Key format: "aa_" + 32 random hex chars
  const raw = generateRandomKey(32);
  const key = `aa_${raw}`;
  const prefix = key.substring(0, 11); // "aa_1a2b3c4d"
  const hash = sha256(key);

  db.run(`
    INSERT INTO api_keys (key_hash, key_prefix, label, created_at)
    VALUES (?, ?, ?, ?)
  `, [hash, prefix, label, Date.now()]);

  return { key, prefix, hash };
}

/**
 * Verify an API key and return its record
 */
export async function verifyApiKey(key: string): Promise<ApiKeyRecord | null> {
  const db = await getDatabase();
  const hash = sha256(key);

  const results = db.exec(`
    SELECT * FROM api_keys WHERE key_hash = ? AND is_active = 1
  `, [hash]);

  if (results.length === 0 || results[0].values.length === 0) {
    return null;
  }

  const columns = results[0].columns;
  const values = results[0].values[0];

  const record: ApiKeyRecord = {
    id: values[columns.indexOf('id')] as number,
    key_hash: values[columns.indexOf('key_hash')] as string,
    key_prefix: values[columns.indexOf('key_prefix')] as string,
    label: values[columns.indexOf('label')] as string,
    created_at: values[columns.indexOf('created_at')] as number,
    last_used_at: values[columns.indexOf('last_used_at')] as number | null,
    is_active: values[columns.indexOf('is_active')] as number,
    rate_limit_per_minute: values[columns.indexOf('rate_limit_per_minute')] as number,
  };

  // Update last used timestamp
  db.run(`
    UPDATE api_keys SET last_used_at = ? WHERE key_hash = ?
  `, [Date.now(), hash]);

  return record;
}

/**
 * Get all active API keys (admin only)
 */
export async function listApiKeys(): Promise<ApiKeyRecord[]> {
  const db = await getDatabase();

  const results = db.exec(`
    SELECT * FROM api_keys WHERE is_active = 1 ORDER BY created_at DESC
  `);

  if (results.length === 0) {
    return [];
  }

  const columns = results[0].columns;
  return results[0].values.map((values: any) => ({
    id: values[columns.indexOf('id')] as number,
    key_hash: values[columns.indexOf('key_hash')] as string,
    key_prefix: values[columns.indexOf('key_prefix')] as string,
    label: values[columns.indexOf('label')] as string,
    created_at: values[columns.indexOf('created_at')] as number,
    last_used_at: values[columns.indexOf('last_used_at')] as number | null,
    is_active: values[columns.indexOf('is_active')] as number,
    rate_limit_per_minute: values[columns.indexOf('rate_limit_per_minute')] as number,
  }));
}
