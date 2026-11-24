import { chatHistoryRepo, sortConversations } from '../chatHistoryStorage';
import { sanitizeGeneratedTitle } from '../conversationTitle';
import { chatHistoryStorage } from '@/lib/storage';
import type { ChatMessage, Conversation } from '@/lib/types';

function makeConv(id: string, overrides: Partial<Conversation> = {}): Conversation {
  return {
    id,
    title: `Chat ${id}`,
    isPinned: false,
    isCustomTitle: false,
    createdAt: 1000,
    updatedAt: 1000,
    modelId: null,
    origin: 'assistant',
    ...overrides,
  };
}

describe('chatHistoryStorage & auto-titling', () => {
  beforeEach(() => {
    chatHistoryStorage.clearAll();
  });

  it('sorts pinned conversations first, then most recently updated', () => {
    const sorted = sortConversations([
      makeConv('a', { updatedAt: 5000, isPinned: false }),
      makeConv('b', { updatedAt: 1000, isPinned: true }),
      makeConv('c', { updatedAt: 3000, isPinned: true }),
      makeConv('d', { updatedAt: 2000, isPinned: false }),
    ]);
    expect(sorted.map((c) => c.id)).toEqual(['c', 'b', 'a', 'd']);
  });

  it('isolates messages per conversation key and deletes cleanly', () => {
    chatHistoryRepo.upsertConversation(makeConv('c1', { updatedAt: 100 }));
    chatHistoryRepo.upsertConversation(makeConv('c2', { updatedAt: 200 }));

    const msg1: ChatMessage = {
      id: 'm1',
      conversationId: 'c1',
      role: 'user',
      blocks: [{ id: 'b1', type: 'markdown', text: 'Hello 1', closed: true }],
      rawText: 'Hello 1',
      status: 'complete',
      createdAt: 100,
    };
    const msg2: ChatMessage = { ...msg1, id: 'm2', conversationId: 'c2', rawText: 'Hello 2' };

    chatHistoryRepo.saveMessages('c1', [msg1]);
    chatHistoryRepo.saveMessages('c2', [msg2]);

    expect(chatHistoryRepo.getMessages('c1').map((m) => m.rawText)).toEqual(['Hello 1']);
    expect(chatHistoryRepo.getMessages('c2').map((m) => m.rawText)).toEqual(['Hello 2']);

    const afterDelete = chatHistoryRepo.deleteConversation('c1');
    expect(afterDelete.map((c) => c.id)).toEqual(['c2']);
    expect(chatHistoryRepo.getMessages('c1')).toEqual([]);
    expect(chatHistoryRepo.getMessages('c2').length).toBe(1);
  });

  it('sanitizes LLM-generated titles cleanly', () => {
    expect(sanitizeGeneratedTitle('<think>hmm</think>\n"React Native Offline Sync."', 'Fallback')).toBe(
      'React Native Offline Sync'
    );
    expect(sanitizeGeneratedTitle('Title: Building Local AI Apps!', 'Fallback')).toBe(
      'Building Local AI Apps'
    );
    expect(sanitizeGeneratedTitle('   ', 'Fallback Title')).toBe('Fallback Title');
  });
});
