import { chatHistoryStorage as mmkv } from '@/lib/storage';
import type { ChatMessage, Conversation } from '@/lib/types';

const INDEX_KEY = 'chat:index:v1';
const MSGS_PREFIX = 'chat:msgs:';

export function sortConversations(list: Conversation[]): Conversation[] {
  return [...list].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  });
}

function normalizeConversation(raw: Partial<Conversation> & { id: string }): Conversation {
  return {
    id: raw.id,
    title: typeof raw.title === 'string' && raw.title.trim() ? raw.title : 'New Conversation',
    isPinned: Boolean(raw.isPinned),
    isCustomTitle: Boolean(raw.isCustomTitle),
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
    modelId: raw.modelId ?? null,
    origin: raw.origin ?? 'assistant',
  };
}

/**
 * Offline MMKV-backed chat persistence with strict per-conversation message key isolation.
 * - `'chat:index:v1'` stores ONLY lightweight conversation metadata for the drawer.
 * - `'chat:msgs:<id>'` stores full ChatMessage[] per conversation and is lazy-loaded on open.
 */
export const chatHistoryRepo = {
  listConversations(): Conversation[] {
    const raw = mmkv.getJSON<Conversation[]>(INDEX_KEY);
    if (!Array.isArray(raw)) return [];
    return sortConversations(raw.filter((c) => c && typeof c.id === 'string').map(normalizeConversation));
  },

  saveConversations(list: Conversation[]): Conversation[] {
    const sorted = sortConversations(list.map(normalizeConversation));
    mmkv.setJSON(INDEX_KEY, sorted);
    return sorted;
  },

  upsertConversation(conv: Conversation): Conversation[] {
    const existing = this.listConversations().filter((c) => c.id !== conv.id);
    return this.saveConversations([normalizeConversation(conv), ...existing]);
  },

  updateConversationMeta(
    id: string,
    patch: Partial<Pick<Conversation, 'title' | 'isPinned' | 'isCustomTitle' | 'updatedAt' | 'modelId'>>
  ): Conversation[] {
    const list = this.listConversations();
    const updated = list.map((c) => (c.id === id ? { ...c, ...patch } : c));
    return this.saveConversations(updated);
  },

  getMessages(conversationId: string): ChatMessage[] {
    const msgs = mmkv.getJSON<ChatMessage[]>(`${MSGS_PREFIX}${conversationId}`);
    return Array.isArray(msgs) ? msgs : [];
  },

  saveMessages(conversationId: string, messages: ChatMessage[]): void {
    mmkv.setJSON(`${MSGS_PREFIX}${conversationId}`, messages);
  },

  deleteConversation(conversationId: string): Conversation[] {
    mmkv.remove(`${MSGS_PREFIX}${conversationId}`);
    const remaining = this.listConversations().filter((c) => c.id !== conversationId);
    return this.saveConversations(remaining);
  },
};
