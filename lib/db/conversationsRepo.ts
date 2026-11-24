import type { Conversation, ConversationOrigin } from '@/lib/types';
import { getDatabase } from './database';

interface ConversationRow {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
  model_id: string | null;
  origin: string;
}

function rowToConversation(row: ConversationRow): Conversation {
  return {
    id: row.id,
    title: row.title,
    isPinned: false,
    isCustomTitle: false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    modelId: row.model_id,
    origin: row.origin as ConversationOrigin,
  };
}

export const conversationsRepo = {
  async list(limit = 50): Promise<Conversation[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<ConversationRow>(
      'SELECT * FROM conversations ORDER BY updated_at DESC LIMIT ?',
      [limit]
    );
    return rows.map(rowToConversation);
  },

  async getById(id: string): Promise<Conversation | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<ConversationRow>(
      'SELECT * FROM conversations WHERE id = ?',
      [id]
    );
    return row ? rowToConversation(row) : null;
  },

  async create(conv: Conversation): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO conversations (id, title, created_at, updated_at, model_id, origin)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [conv.id, conv.title, conv.createdAt, conv.updatedAt, conv.modelId, conv.origin]
    );
  },

  async updateTitle(id: string, title: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?', [
      title,
      Date.now(),
      id,
    ]);
  },

  async touch(id: string, modelId?: string | null): Promise<void> {
    const db = await getDatabase();
    if (modelId !== undefined) {
      await db.runAsync('UPDATE conversations SET updated_at = ?, model_id = ? WHERE id = ?', [
        Date.now(),
        modelId,
        id,
      ]);
    } else {
      await db.runAsync('UPDATE conversations SET updated_at = ? WHERE id = ?', [Date.now(), id]);
    }
  },

  async remove(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM conversations WHERE id = ?', [id]);
  },
};
