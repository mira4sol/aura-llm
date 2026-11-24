import { Platform } from 'react-native';

import { chatHistoryRepo } from '@/lib/chat/chatHistoryStorage';
import { deriveConversationTitle, sanitizeGeneratedTitle } from '@/lib/chat/conversationTitle';
import { buildLlamaMessages } from '@/lib/chat/promptBuilder';
import { parseStreamingMessage } from '@/lib/chat/streamParser';
import type {
  ChatMessage,
  Conversation,
  ConversationOrigin,
  MessageBlock,
  PendingAttachment,
} from '@/lib/types';
import { inferenceService } from '@/services/inference/inferenceService';
import { modelLoadSentinel } from '@/services/inference/modelLoadSentinel';
import { voiceService } from '@/services/voice/voiceService';
import { useAppStore } from '@/store/app.store';
import { useChatStore } from '@/store/chat.store';
import { attachmentService } from './attachmentService';

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function attachmentsToBlocks(messageId: string, attachments: PendingAttachment[]): MessageBlock[] {
  const blocks: MessageBlock[] = [];
  const images = attachments.filter((a) => a.kind === 'image');
  if (images.length > 0) {
    blocks.push({
      id: `${messageId}-imgs`,
      type: 'image',
      images: images.map((img) => ({
        uri: img.uri,
        width: img.width ?? 800,
        height: img.height ?? 600,
      })),
    });
  }

  for (const att of attachments) {
    if (att.kind === 'document') {
      blocks.push({
        id: `${messageId}-doc-${att.id}`,
        type: 'document',
        name: att.name,
        mime: att.mime,
        sizeBytes: att.sizeBytes,
        status:
          att.status === 'ready'
            ? 'parsed'
            : att.status === 'parsing'
              ? 'parsing'
              : att.status,
        tokenCount: att.tokenCount,
        chunks: att.chunks,
        totalChunks: att.totalChunks,
        extractedText: att.extractedText,
        errorMessage: att.errorMessage,
      });
    } else if (att.kind === 'audio') {
      blocks.push({
        id: `${messageId}-aud-${att.id}`,
        type: 'audio',
        uri: att.uri,
        durationMs: att.durationMs ?? 0,
        waveform: att.waveform ?? [],
        transcript: att.transcript,
      });
    }
  }
  return blocks;
}

let activeTurnSessionToken = 0;

/**
 * Triggers non-blocking local AI title generation after the first user/assistant exchange.
 * Respects manual user renames (isCustomTitle) and deleted chats.
 */
function maybeAutoGenerateTitle(
  conversationId: string,
  userPrompt: string,
  assistantReply: string
): void {
  if (!userPrompt.trim() || !assistantReply.trim()) return;
  const fallback = deriveConversationTitle(userPrompt);

  setTimeout(() => {
    void (async () => {
      const current = useChatStore
        .getState()
        .conversations.find((c) => c.id === conversationId);
      if (!current || current.isCustomTitle) return;

      const raw = await inferenceService.generateQuickTitle(userPrompt, assistantReply);
      if (!raw.trim()) return;

      // Re-verify conversation still exists and was not manually renamed while generating
      const latest = chatHistoryRepo
        .listConversations()
        .find((c) => c.id === conversationId);
      if (!latest || latest.isCustomTitle) return;

      const nextTitle = sanitizeGeneratedTitle(raw, fallback);
      if (!nextTitle || nextTitle === latest.title) return;

      const updatedList = chatHistoryRepo.updateConversationMeta(conversationId, {
        title: nextTitle,
      });
      useChatStore.getState().setConversations(updatedList);
    })().catch(() => {
      // Non-fatal: fallback title remains cleanly in place
    });
  }, 150);
}

export const chatService = {
  /** Hydrates ONLY lightweight conversation metadata from MMKV for the drawer. */
  async hydrateConversations(): Promise<Conversation[]> {
    const list = chatHistoryRepo.listConversations();
    useChatStore.getState().setConversations(list);
    return list;
  },

  /**
   * Switches to a saved conversation with strict memory & KV-cache offloading:
   * 1. Stops any active stream & TTS
   * 2. Immediately offloads the previous conversation's messages from Zustand RAM
   * 3. Clears native llama.rn KV cache so zero context leaks across chats
   * 4. Lazy-loads ONLY the target conversation's messages from MMKV
   */
  async loadConversation(conversationId: string): Promise<ChatMessage[]> {
    const store = useChatStore.getState();
    if (store.activeConversationId === conversationId && store.activeMessages.length > 0) {
      return store.activeMessages;
    }

    activeTurnSessionToken += 1;
    if (store.isGenerating) {
      await inferenceService.stop('user');
      store.setIsGenerating(false);
    }
    void voiceService.stopSpeaking();

    // Offload previous chat from React/Zustand memory immediately
    store.offloadActiveConversation();
    // Clear native KV cache so context never leaks into the next chat
    await inferenceService.clearContextCache();

    // Lazy-load target conversation messages from MMKV
    const msgs = chatHistoryRepo.getMessages(conversationId);
    useChatStore.getState().setActiveConversation(conversationId, msgs);
    return msgs;
  },

  /**
   * Resets to a fresh empty chat without polluting MMKV history until the user sends a message.
   * Immediately offloads previous messages and clears native KV cache.
   */
  async startNewChat(): Promise<void> {
    const store = useChatStore.getState();
    activeTurnSessionToken += 1;
    if (store.isGenerating) {
      await inferenceService.stop('user');
      store.setIsGenerating(false);
    }
    void voiceService.stopSpeaking();
    store.offloadActiveConversation();
    await inferenceService.clearContextCache();
  },

  async createConversation(options: {
    origin: ConversationOrigin;
    initialText?: string;
    attachments?: PendingAttachment[];
  }): Promise<{ conversation: Conversation; initialUserMessage?: ChatMessage }> {
    const store = useChatStore.getState();
    activeTurnSessionToken += 1;
    if (store.isGenerating) {
      await inferenceService.stop('user');
      store.setIsGenerating(false);
    }
    store.offloadActiveConversation();
    await inferenceService.clearContextCache();

    const now = Date.now();
    const id = makeId('conv');
    const title = deriveConversationTitle(
      options.initialText ?? options.attachments?.[0]?.name ?? ''
    );
    const activeModelId = useAppStore.getState().activeModelId;

    const conversation: Conversation = {
      id,
      title,
      isPinned: false,
      isCustomTitle: false,
      createdAt: now,
      updatedAt: now,
      modelId: activeModelId,
      origin: options.origin,
    };

    const updatedIndex = chatHistoryRepo.upsertConversation(conversation);
    useChatStore.getState().setConversations(updatedIndex);
    useChatStore.getState().setActiveConversation(id, []);

    let initialUserMessage: ChatMessage | undefined;
    if (options.initialText?.trim() || (options.attachments && options.attachments.length > 0)) {
      initialUserMessage = await this.appendUserMessage(
        id,
        options.initialText?.trim() ?? '',
        options.attachments ?? []
      );
    }

    return { conversation, initialUserMessage };
  },

  async appendUserMessage(
    conversationId: string,
    text: string,
    attachments: PendingAttachment[]
  ): Promise<ChatMessage> {
    const msgId = makeId('u');
    const blocks: MessageBlock[] = [...attachmentsToBlocks(msgId, attachments)];
    if (text) {
      blocks.push({ id: `${msgId}-md`, type: 'markdown', text, closed: true });
    }

    const userMsg: ChatMessage = {
      id: msgId,
      conversationId,
      role: 'user',
      blocks,
      rawText: text,
      status: 'complete',
      createdAt: Date.now(),
    };

    const existing = chatHistoryRepo.getMessages(conversationId);
    const nextMsgs = [...existing, userMsg];
    chatHistoryRepo.saveMessages(conversationId, nextMsgs);

    const updatedIndex = chatHistoryRepo.updateConversationMeta(conversationId, {
      updatedAt: Date.now(),
      modelId: useAppStore.getState().activeModelId,
    });
    useChatStore.getState().setConversations(updatedIndex);

    if (useChatStore.getState().activeConversationId === conversationId) {
      useChatStore.getState().setActiveMessages(nextMsgs);
    }
    return userMsg;
  },

  async sendMessage(
    conversationId: string | null,
    text: string,
    attachments: PendingAttachment[] = []
  ): Promise<string | null> {
    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return conversationId;

    let cid = conversationId;
    if (!cid) {
      const { conversation } = await this.createConversation({
        origin: 'assistant',
        initialText: trimmed,
        attachments,
      });
      cid = conversation.id;
      useChatStore.getState().clearPendingAttachments();
      await this.runAssistantTurn(cid);
      return cid;
    }

    // Update fallback title if this is the first message in the conversation
    const existing = chatHistoryRepo.getMessages(cid);
    if (existing.length === 0) {
      const conv = chatHistoryRepo.listConversations().find((c) => c.id === cid);
      if (conv && !conv.isCustomTitle) {
        const title = deriveConversationTitle(trimmed || attachments[0]?.name || '');
        const updatedIndex = chatHistoryRepo.updateConversationMeta(cid, {
          title,
          updatedAt: Date.now(),
        });
        useChatStore.getState().setConversations(updatedIndex);
      }
    }

    await this.appendUserMessage(cid, trimmed, attachments);
    useChatStore.getState().clearPendingAttachments();
    await this.runAssistantTurn(cid);
    return cid;
  },

  /**
   * ChatGPT/Gemini-style prompt editing:
   * Updates the target user message in place (preserving its attachments),
   * truncates all subsequent turns so stale messages don't pollute the thread,
   * clears the native KV cache, persists to MMKV, and streams a fresh reply.
   */
  async editUserMessage(
    conversationId: string,
    messageId: string,
    newText: string
  ): Promise<void> {
    const trimmed = newText.trim();
    if (!trimmed) return;

    const store = useChatStore.getState();
    activeTurnSessionToken += 1;
    if (store.isGenerating) {
      await inferenceService.stop('user');
      store.setIsGenerating(false);
    }
    void voiceService.stopSpeaking();

    const msgs = chatHistoryRepo.getMessages(conversationId);
    const idx = msgs.findIndex((m) => m.id === messageId && m.role === 'user');
    if (idx < 0) return;

    const target = msgs[idx];
    const nonMarkdownBlocks = target.blocks.filter((b) => b.type !== 'markdown');
    const updatedUserMsg: ChatMessage = {
      ...target,
      rawText: trimmed,
      blocks: [
        ...nonMarkdownBlocks,
        { id: `${target.id}-md`, type: 'markdown', text: trimmed, closed: true },
      ],
    };

    const truncated = [...msgs.slice(0, idx), updatedUserMsg];
    chatHistoryRepo.saveMessages(conversationId, truncated);

    // If editing the very first user message and not manually renamed, update fallback title
    const conv = chatHistoryRepo.listConversations().find((c) => c.id === conversationId);
    const metaPatch: Partial<Conversation> = { updatedAt: Date.now() };
    if (idx === 0 && conv && !conv.isCustomTitle) {
      metaPatch.title = deriveConversationTitle(trimmed);
    }
    const updatedIndex = chatHistoryRepo.updateConversationMeta(conversationId, metaPatch);
    useChatStore.getState().setConversations(updatedIndex);

    if (useChatStore.getState().activeConversationId === conversationId) {
      useChatStore.getState().setActiveMessages(truncated);
    }

    await inferenceService.clearContextCache();
    await this.runAssistantTurn(conversationId);
  },

  async runAssistantTurn(conversationId: string): Promise<void> {
    const chatStore = useChatStore.getState();
    if (chatStore.isGenerating) return;

    const mySession = activeTurnSessionToken;
    const history = chatHistoryRepo.getMessages(conversationId);
    const lastUser = [...history].reverse().find((m) => m.role === 'user');
    const hasImages = lastUser?.blocks.some((b) => b.type === 'image') ?? false;
    const isFirstExchange = history.filter((m) => m.role === 'assistant').length === 0;

    const activeModelId = useAppStore.getState().activeModelId;
    const assistantId = makeId('a');

    // Guard 1: No local model installed/selected
    if (!activeModelId) {
      const noticeMsg: ChatMessage = {
        id: assistantId,
        conversationId,
        role: 'assistant',
        blocks: [
          {
            id: `${assistantId}-cap`,
            type: 'capability_notice',
            required: hasImages ? 'vision' : 'text',
            suggestion: 'download',
          },
        ],
        rawText: '',
        status: 'complete',
        createdAt: Date.now(),
      };
      const nextMsgs = [...history, noticeMsg];
      chatHistoryRepo.saveMessages(conversationId, nextMsgs);
      if (useChatStore.getState().activeConversationId === conversationId) {
        useChatStore.getState().setActiveMessages(nextMsgs);
      }
      return;
    }

    // Guard 2: Capability gate for image attachments
    if (hasImages) {
      const gate = attachmentService.checkVisionCapability();
      if (!gate.allowed) {
        const noticeMsg: ChatMessage = {
          id: assistantId,
          conversationId,
          role: 'assistant',
          blocks: [
            {
              id: `${assistantId}-cap`,
              type: 'capability_notice',
              required: 'vision',
              suggestion: gate.suggestion ?? 'download',
              candidateModelId: gate.candidateModel?.id,
              candidateModelName: gate.candidateModel?.displayName,
            },
          ],
          rawText: '',
          status: 'complete',
          createdAt: Date.now(),
          modelId: activeModelId,
        };
        const nextMsgs = [...history, noticeMsg];
        chatHistoryRepo.saveMessages(conversationId, nextMsgs);
        if (useChatStore.getState().activeConversationId === conversationId) {
          useChatStore.getState().setActiveMessages(nextMsgs);
        }
        return;
      }
    }

    const startedAt = Date.now();
    const pendingAssistant: ChatMessage = {
      id: assistantId,
      conversationId,
      role: 'assistant',
      blocks: [],
      rawText: '',
      status: 'streaming',
      createdAt: startedAt,
      modelId: activeModelId,
    };

    chatStore.setIsGenerating(true);
    chatStore.upsertActiveMessage(pendingAssistant);
    chatStore.setStreaming({
      messageId: assistantId,
      rawText: '',
      blocks: [],
      version: 0,
      tokensPerSec: 0,
    });

    let latestRaw = '';
    let version = 0;
    let lastFlush = 0;
    let lastPersist = 0;
    let flushTimer: ReturnType<typeof setTimeout> | null = null;

    const persistAssistant = (msg: ChatMessage) => {
      const currentSaved = chatHistoryRepo.getMessages(conversationId);
      const existsIdx = currentSaved.findIndex((m) => m.id === msg.id);
      const merged =
        existsIdx < 0
          ? [...currentSaved, msg]
          : currentSaved.map((m, i) => (i === existsIdx ? msg : m));
      chatHistoryRepo.saveMessages(conversationId, merged);
    };

    const flushToStore = (final = false) => {
      if (activeTurnSessionToken !== mySession) return;
      const now = Date.now();
      const blocks = parseStreamingMessage(latestRaw, {
        messageId: assistantId,
        isComplete: final,
        startedAt,
        now,
      });
      version += 1;
      const elapsedSec = Math.max(0.1, (now - startedAt) / 1000);
      const estTps = latestRaw.length / 3.6 / elapsedSec;

      useChatStore.getState().setStreaming({
        messageId: assistantId,
        rawText: latestRaw,
        blocks,
        version,
        tokensPerSec: Number(estTps.toFixed(1)),
      });

      if (final || now - lastPersist >= 2500) {
        lastPersist = now;
        persistAssistant({
          ...pendingAssistant,
          rawText: latestRaw,
          blocks,
          status: final ? 'complete' : 'streaming',
        });
      }
    };

    try {
      const handle = await inferenceService.ensureLoaded(activeModelId);
      if (activeTurnSessionToken !== mySession) return;

      const prefs = useAppStore.getState().preferences;
      const userName = useAppStore.getState().userName;

      const llamaMessages = buildLlamaMessages({
        userName,
        history,
        nCtx: handle.nCtx,
        supportsVision: handle.capabilities.includes('vision'),
      });

      const telemetry = await inferenceService.generate(
        {
          messages: llamaMessages,
          temperature: prefs.temperature,
          topP: prefs.topP,
          maxTokens: prefs.maxTokens,
          enableThinking: Boolean(prefs.enableThinking),
        },
        (ev) => {
          if (activeTurnSessionToken !== mySession) return;
          latestRaw = ev.accumulated;
          const now = Date.now();
          const flushIntervalMs = Platform.OS === 'android' ? 100 : 60;
          if (now - lastFlush >= flushIntervalMs) {
            lastFlush = now;
            flushToStore(false);
          } else if (!flushTimer) {
            flushTimer = setTimeout(() => {
              flushTimer = null;
              lastFlush = Date.now();
              flushToStore(false);
            }, flushIntervalMs);
          }
        }
      );

      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }

      const finalBlocks = parseStreamingMessage(latestRaw, {
        messageId: assistantId,
        isComplete: true,
        startedAt,
        now: Date.now(),
      });

      const finalMsg: ChatMessage = {
        ...pendingAssistant,
        rawText: latestRaw,
        blocks: finalBlocks,
        status:
          telemetry.stoppedBy === 'user' || telemetry.stoppedBy === 'background'
            ? 'stopped'
            : 'complete',
        telemetry,
      };

      persistAssistant(finalMsg);
      const updatedIndex = chatHistoryRepo.updateConversationMeta(conversationId, {
        updatedAt: Date.now(),
        modelId: handle.modelId,
      });
      useChatStore.getState().setConversations(updatedIndex);

      if (
        activeTurnSessionToken === mySession &&
        useChatStore.getState().activeConversationId === conversationId
      ) {
        useChatStore.getState().upsertActiveMessage(finalMsg);
      }

      if (
        activeTurnSessionToken === mySession &&
        useAppStore.getState().preferences.autoReadAloud &&
        latestRaw.trim()
      ) {
        void voiceService.speak(latestRaw);
      }

      // Trigger non-blocking local AI auto-titling on first completed exchange
      if (isFirstExchange && lastUser?.rawText && latestRaw.trim()) {
        maybeAutoGenerateTitle(conversationId, lastUser.rawText, latestRaw);
      }
    } catch (err) {
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      if (activeTurnSessionToken !== mySession) return;
      const message = err instanceof Error ? err.message : String(err);
      const errorMsg: ChatMessage = {
        ...pendingAssistant,
        rawText: latestRaw,
        blocks: [
          ...parseStreamingMessage(latestRaw, {
            messageId: assistantId,
            isComplete: true,
            startedAt,
          }),
          {
            id: `${assistantId}-err`,
            type: 'error',
            code: 'INFERENCE_ERROR',
            message,
            retriable: true,
          },
        ],
        status: 'error',
      };
      persistAssistant(errorMsg);
      if (useChatStore.getState().activeConversationId === conversationId) {
        useChatStore.getState().upsertActiveMessage(errorMsg);
      }
    } finally {
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      useChatStore.getState().setStreaming(null);
      useChatStore.getState().setIsGenerating(false);
    }
  },

  async stopGeneration(): Promise<void> {
    await inferenceService.stop('user');
  },

  async regenerateLast(conversationId: string): Promise<void> {
    const activeModelId = useAppStore.getState().activeModelId;
    if (activeModelId) {
      modelLoadSentinel.clearRecord(activeModelId);
    }
    const msgs = chatHistoryRepo.getMessages(conversationId);
    const last = msgs[msgs.length - 1];
    if (last?.role === 'assistant') {
      const trimmed = msgs.slice(0, msgs.length - 1);
      chatHistoryRepo.saveMessages(conversationId, trimmed);
      if (useChatStore.getState().activeConversationId === conversationId) {
        useChatStore.getState().setActiveMessages(trimmed);
      }
    }
    await inferenceService.clearContextCache();
    await this.runAssistantTurn(conversationId);
  },

  async setFeedback(
    conversationId: string,
    messageId: string,
    feedback: 'up' | 'down' | null
  ): Promise<void> {
    const msgs = chatHistoryRepo.getMessages(conversationId);
    const next = msgs.map((m) => (m.id === messageId ? { ...m, feedback } : m));
    chatHistoryRepo.saveMessages(conversationId, next);
    if (useChatStore.getState().activeConversationId === conversationId) {
      useChatStore.getState().setActiveMessages(next);
    }
  },

  async togglePin(conversationId: string): Promise<void> {
    const target = chatHistoryRepo.listConversations().find((c) => c.id === conversationId);
    if (!target) return;
    const updatedIndex = chatHistoryRepo.updateConversationMeta(conversationId, {
      isPinned: !target.isPinned,
    });
    useChatStore.getState().setConversations(updatedIndex);
  },

  async renameConversation(conversationId: string, newTitle: string): Promise<void> {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    const updatedIndex = chatHistoryRepo.updateConversationMeta(conversationId, {
      title: trimmed.slice(0, 60),
      isCustomTitle: true,
    });
    useChatStore.getState().setConversations(updatedIndex);
  },

  async deleteConversation(conversationId: string): Promise<void> {
    const wasActive = useChatStore.getState().activeConversationId === conversationId;
    if (wasActive) {
      await this.startNewChat();
    }
    const remaining = chatHistoryRepo.deleteConversation(conversationId);
    useChatStore.getState().setConversations(remaining);
  },
};
