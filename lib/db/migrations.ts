import type { SQLiteDatabase } from 'expo-sqlite';

export const CURRENT_DB_VERSION = 1;

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const currentVersion = row?.user_version ?? 0;

  if (currentVersion < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        model_id TEXT,
        origin TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_conversations_updated
        ON conversations(updated_at DESC);

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY NOT NULL,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        blocks_json TEXT NOT NULL,
        raw_text TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        model_id TEXT,
        telemetry_json TEXT,
        parent_id TEXT,
        feedback TEXT,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_messages_conversation
        ON messages(conversation_id, created_at ASC);

      CREATE TABLE IF NOT EXISTS catalog_models (
        id TEXT PRIMARY KEY NOT NULL,
        runtime TEXT NOT NULL,
        capabilities_json TEXT NOT NULL,
        downloads INTEGER NOT NULL DEFAULT 0,
        data_json TEXT NOT NULL,
        fetched_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_catalog_downloads
        ON catalog_models(downloads DESC);

      CREATE TABLE IF NOT EXISTS installed_models (
        id TEXT PRIMARY KEY NOT NULL,
        repo_id TEXT NOT NULL,
        runtime TEXT NOT NULL,
        capabilities_json TEXT NOT NULL,
        data_json TEXT NOT NULL,
        installed_at INTEGER NOT NULL,
        last_used_at INTEGER
      );

      PRAGMA user_version = 1;
    `);
  }
}
