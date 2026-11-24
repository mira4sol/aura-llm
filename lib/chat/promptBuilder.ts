import type { ChatMessage } from '@/lib/types';
import { estimateTokenCount } from '@/lib/parsers/tokenBudget';

export type LlamaMessageContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export interface LlamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | LlamaMessageContentPart[];
}

export interface BuildPromptOptions {
  userName?: string;
  history: ChatMessage[];
  nCtx: number;
  reserveReplyTokens?: number;
  supportsVision: boolean;
}

export function buildSystemPrompt(userName?: string): string {
  const nameLine = userName?.trim() ? `The user's name is ${userName.trim()}.` : '';
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  return [
    'You are Aura, a private, 100% offline on-device AI assistant.',
    `Today's date is ${today}.`,
    nameLine,
    'Answer directly, clearly, and naturally without narrating internal reasoning or meta-commentary. Only use code fences, tables, JSON, or LaTeX ($...$ / $$...$$) when relevant to the request.',
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Converts persisted ChatMessages into llama.rn chat messages, injecting extracted
 * offline document text and vision image parts while trimming oldest history
 * to fit within the active context window.
 */
export function buildLlamaMessages(options: BuildPromptOptions): LlamaChatMessage[] {
  const { history, nCtx, supportsVision, userName } = options;
  const reserve = options.reserveReplyTokens ?? 1024;
  const systemPrompt = buildSystemPrompt(userName);
  const systemTokens = estimateTokenCount(systemPrompt);
  const budget = Math.max(512, nCtx - systemTokens - reserve);

  const formatted: { msg: LlamaChatMessage; tokens: number }[] = [];

  for (const m of history) {
    if (m.role === 'system') continue;
    if (m.status === 'error' && !m.rawText) continue;

    const docParts: string[] = [];
    const imageUris: string[] = [];
    const audioTranscripts: string[] = [];

    for (const block of m.blocks) {
      if (block.type === 'document' && block.extractedText) {
        const truncNote =
          block.status === 'truncated'
            ? ` (showing ${block.chunks ?? 1}/${block.totalChunks ?? 1} chunks)`
            : '';
        docParts.push(
          `[Attached document: ${block.name}${truncNote}]\n${block.extractedText}\n[/Attached document]`
        );
      } else if (block.type === 'image' && supportsVision) {
        for (const img of block.images) {
          imageUris.push(img.uri);
        }
      } else if (block.type === 'audio' && block.transcript) {
        audioTranscripts.push(`[Voice note transcript]: ${block.transcript}`);
      }
    }

    const rawForHistory =
      m.role === 'assistant'
        ? m.rawText
            .replace(/<think>[\s\S]*?<\/think>/gi, '')
            .replace(/^[\s\S]*?<\/think>/i, '')
            .trim()
        : m.rawText.trim();

    const combinedText = [...docParts, ...audioTranscripts, rawForHistory]
      .filter(Boolean)
      .join('\n\n');

    if (!combinedText && imageUris.length === 0) continue;

    let llamaMsg: LlamaChatMessage;
    let tokens = estimateTokenCount(combinedText);

    if (m.role === 'user' && imageUris.length > 0 && supportsVision) {
      const parts: LlamaMessageContentPart[] = imageUris.map((uri) => ({
        type: 'image_url',
        image_url: { url: uri },
      }));
      if (combinedText) {
        parts.push({ type: 'text', text: combinedText });
      }
      llamaMsg = { role: 'user', content: parts };
      tokens += imageUris.length * 320; // conservative vision token budget per image
    } else {
      llamaMsg = {
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: combinedText,
      };
    }

    formatted.push({ msg: llamaMsg, tokens });
  }

  // Keep newest turns within budget
  const kept: LlamaChatMessage[] = [];
  let used = 0;
  for (let i = formatted.length - 1; i >= 0; i--) {
    const item = formatted[i];
    if (used + item.tokens > budget && kept.length > 0) break;
    kept.unshift(item.msg);
    used += item.tokens;
  }

  return [{ role: 'system', content: systemPrompt }, ...kept];
}
