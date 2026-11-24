import type { ChatMessage, GenerationTelemetry, MessageBlock, MessageRole } from '@/lib/types';
import { getDatabase } from './database';

interface MessageRow {
  id: string;
  conversation_id: string;
  role: string;
  blocks_json: string;
  raw_text: string;
  status: string;
  created_at: number;
  model_id: string | null;
  telemetry_json: string | null;
  parent_id: string | null;
  feedback: string | null;
}

function rowToMessage(row: MessageRow): ChatMessage {
  let blocks: MessageBlock[] = [];
  try {
    blocks = JSON.parse(row.blocks_json) as MessageBlock[];
  } catch {
    blocks = [{ id: `${row.id}-md`, type: 'markdown', text: row.raw_text, closed: true }];
  }
  let telemetry: GenerationTelemetry | undefined;
  if (row.telemetry_json) {
    try {
      telemetry = JSON.parse(row.telemetry_json) as GenerationTelemetry;
    } catch {
      telemetry = undefined;
    }
  }
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role as MessageRole,
    blocks,
    rawText: row.raw_text,
    status: row.status as ChatMessage['status'],
    createdAt: row.created_at,
    modelId: row.model_id ?? undefined,
    telemetry,
    parentId: row.parent_id ?? undefined,
    feedback: (row.feedback as 'up' | 'down' | null) ?? null,
  };
}

export const messagesRepo = {
  async listByConversation(conversationId: string): Promise<ChatMessage[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<MessageRow>(
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
      [conversationId]
    );
    return rows.map(rowToMessage);
  },

  async upsert(msg: ChatMessage): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO messages (
        id, conversation_id, role, blocks_json, raw_text, status,
        created_at, model_id, telemetry_json, parent_id, feedback
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        blocks_json = excluded.blocks_json,
        raw_text = excluded.raw_text,
        status = excluded.status,
        model_id = excluded.model_id,
        telemetry_json = excluded.telemetry_json,
        feedback = excluded.feedback`,
      [
        msg.id,
        msg.conversationId,
        msg.role,
        JSON.stringify(msg.blocks),
        msg.rawText,
        msg.status,
        msg.createdAt,
        msg.modelId ?? null,
        msg.telemetry ? JSON.stringify(msg.telemetry) : null,
        msg.parentId ?? null,
        msg.feedback ?? null,
      ]
    );
  },

  async setFeedback(id: string, feedback: 'up' | 'down' | null): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('UPDATE messages SET feedback = ? WHERE id = ?', [feedback, id]);
  },

  async remove(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM messages WHERE id = ?', [id]);
  },
};
