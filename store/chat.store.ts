import { create } from 'zustand';

import type { ChatMessage, Conversation, MessageBlock, PendingAttachment } from '@/lib/types';

interface StreamingBuffer {
  messageId: string;
  rawText: string;
  blocks: MessageBlock[];
  version: number;
  tokensPerSec: number;
}

interface ChatState {
  /** Lightweight metadata ONLY (id, title, isPinned, timestamps) for rendering the drawer. */
  conversations: Conversation[];
  activeConversationId: string | null;
  /** ONLY the currently open conversation's messages; offloaded to [] on chat switch. */
  activeMessages: ChatMessage[];
  streaming: StreamingBuffer | null;
  pendingAttachments: PendingAttachment[];
  isGenerating: boolean;

  setConversations: (list: Conversation[]) => void;
  setActiveConversation: (id: string | null, messages: ChatMessage[]) => void;
  offloadActiveConversation: () => void;
  setActiveMessages: (messages: ChatMessage[]) => void;
  upsertActiveMessage: (message: ChatMessage) => void;
  setStreaming: (buf: StreamingBuffer | null) => void;
  setIsGenerating: (val: boolean) => void;
  addPendingAttachment: (att: PendingAttachment) => void;
  updatePendingAttachment: (id: string, patch: Partial<PendingAttachment>) => void;
  removePendingAttachment: (id: string) => void;
  clearPendingAttachments: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  activeConversationId: null,
  activeMessages: [],
  streaming: null,
  pendingAttachments: [],
  isGenerating: false,

  setConversations: (conversations) => set({ conversations }),

  setActiveConversation: (activeConversationId, activeMessages) =>
    set({
      activeConversationId,
      activeMessages,
      streaming: null,
    }),

  offloadActiveConversation: () =>
    set({
      activeConversationId: null,
      activeMessages: [],
      streaming: null,
      pendingAttachments: [],
    }),

  setActiveMessages: (activeMessages) => set({ activeMessages }),

  upsertActiveMessage: (message) =>
    set((state) => {
      if (state.activeConversationId && message.conversationId !== state.activeConversationId) {
        return state;
      }
      const idx = state.activeMessages.findIndex((m) => m.id === message.id);
      const next =
        idx < 0
          ? [...state.activeMessages, message]
          : state.activeMessages.map((m, i) => (i === idx ? message : m));
      return { activeMessages: next };
    }),

  setStreaming: (streaming) => set({ streaming }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  addPendingAttachment: (att) =>
    set((state) => ({ pendingAttachments: [...state.pendingAttachments, att] })),
  updatePendingAttachment: (id, patch) =>
    set((state) => ({
      pendingAttachments: state.pendingAttachments.map((a) =>
        a.id === id ? { ...a, ...patch } : a
      ),
    })),
  removePendingAttachment: (id) =>
    set((state) => ({
      pendingAttachments: state.pendingAttachments.filter((a) => a.id !== id),
    })),
  clearPendingAttachments: () => set({ pendingAttachments: [] }),
}));
