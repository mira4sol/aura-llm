import * as SQLite from 'expo-sqlite';

import { runMigrations } from './migrations';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('aura-os.db');
      await runMigrations(db);
      return db;
    })();
  }
  return dbPromise;
}
