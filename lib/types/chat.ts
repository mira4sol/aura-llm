import type { AcceleratorBackend } from './hardware';
import type { ModelCapability } from './models';

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ImageAttachmentItem {
  uri: string;
  width: number;
  height: number;
  caption?: string;
}

export type MessageBlock =
  | { id: string; type: 'markdown'; text: string; closed: boolean }
  | { id: string; type: 'math'; latex: string; closed: boolean }
  | { id: string; type: 'code'; language: string | null; code: string; closed: boolean }
  | { id: string; type: 'json'; raw: string; parsed?: unknown; valid: boolean; closed: boolean }
  | {
      id: string;
      type: 'thinking';
      text: string;
      startedAt: number;
      endedAt?: number;
      closed: boolean;
    }
  | { id: string; type: 'image'; images: ImageAttachmentItem[] }
  | {
      id: string;
      type: 'audio';
      uri: string;
      durationMs: number;
      waveform: number[];
      transcript?: string;
    }
  | {
      id: string;
      type: 'document';
      name: string;
      mime: string;
      sizeBytes: number;
      status: 'parsing' | 'parsed' | 'truncated' | 'unsupported' | 'error';
      tokenCount?: number;
      chunks?: number;
      totalChunks?: number;
      extractedText?: string;
      errorMessage?: string;
    }
  | {
      id: string;
      type: 'capability_notice';
      required: ModelCapability;
      suggestion: 'switch' | 'download';
      candidateModelId?: string;
      candidateModelName?: string;
    }
  | { id: string; type: 'error'; code: string; message: string; retriable: boolean };

export interface GenerationTelemetry {
  modelId: string;
  backend: AcceleratorBackend;
  promptTokens: number;
  completionTokens: number;
  ttftMs: number;
  tokensPerSec: number;
  totalMs: number;
  stoppedBy: 'eos' | 'user' | 'limit' | 'background' | 'error';
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  blocks: MessageBlock[];
  rawText: string;
  status: 'pending' | 'streaming' | 'complete' | 'stopped' | 'error';
  createdAt: number;
  modelId?: string;
  telemetry?: GenerationTelemetry;
  parentId?: string;
  feedback?: 'up' | 'down' | null;
}

export type ConversationOrigin =
  | 'home_text'
  | 'home_voice'
  | 'home_attachment'
  | 'assistant'
  | 'dispatch';

export interface Conversation {
  id: string;
  title: string;
  isPinned: boolean;
  isCustomTitle: boolean;
  createdAt: number;
  updatedAt: number;
  modelId: string | null;
  origin: ConversationOrigin;
}

export interface PendingAttachment {
  id: string;
  kind: 'image' | 'document' | 'audio';
  uri: string;
  name: string;
  mime: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  durationMs?: number;
  waveform?: number[];
  transcript?: string;
  extractedText?: string;
  tokenCount?: number;
  chunks?: number;
  totalChunks?: number;
  status: 'ready' | 'parsing' | 'truncated' | 'unsupported' | 'error';
  errorMessage?: string;
}
