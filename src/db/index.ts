import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { runMigrations } from './migrations.js';

const DATABASE_PATH = process.env.DATABASE_PATH || './data/anyartifact.db';

let db: SqlJsDatabase | null = null;

export async function getDatabase(): Promise<SqlJsDatabase> {
  if (!db) {
    // Ensure directory exists
    const dir = dirname(DATABASE_PATH);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const SQL = await initSqlJs();

    // Load existing database or create new one
    if (existsSync(DATABASE_PATH)) {
      const buffer = readFileSync(DATABASE_PATH);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }

    // Run migrations
    runMigrations(db);

    // Save database on process exit
    process.on('exit', () => saveDatabase());
    process.on('SIGINT', () => {
      saveDatabase();
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      saveDatabase();
      process.exit(0);
    });
  }

  return db;
}

export function saveDatabase(): void {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    writeFileSync(DATABASE_PATH, buffer);
  }
}

export function closeDatabase(): void {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
}
