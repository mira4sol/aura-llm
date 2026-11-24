export interface ChunkBudgetResult {
  includedText: string;
  tokenCount: number;
  includedChunks: number;
  totalChunks: number;
  truncated: boolean;
}

export type TokenCounter = (text: string) => Promise<number> | number;

/** Fast local fallback (~3.6 chars per token for English/code mix) */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 3.6);
}

/**
 * Splits extracted document text into paragraph-aligned chunks (~targetChunkTokens each)
 * and packs as many chunks as fit within maxTokenBudget.
 */
export async function fitDocumentToTokenBudget(
  text: string,
  maxTokenBudget: number,
  options: { targetChunkTokens?: number; countTokens?: TokenCounter } = {}
): Promise<ChunkBudgetResult> {
  const countFn = options.countTokens ?? estimateTokenCount;
  const targetChunkTokens = options.targetChunkTokens ?? 800;
  const safeBudget = Math.max(128, maxTokenBudget);

  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return {
      includedText: '',
      tokenCount: 0,
      includedChunks: 0,
      totalChunks: 0,
      truncated: false,
    };
  }

  // Split by paragraph boundaries, falling back to hard char splits for giant single lines
  const maxChunkChars = Math.floor(targetChunkTokens * 3.6);
  const rawParagraphs = normalized.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = '';

  for (const para of rawParagraphs) {
    if (para.length > maxChunkChars) {
      if (current) {
        chunks.push(current.trim());
        current = '';
      }
      for (let i = 0; i < para.length; i += maxChunkChars) {
        chunks.push(para.slice(i, i + maxChunkChars).trim());
      }
      continue;
    }

    if (current.length + para.length + 2 > maxChunkChars && current.length > 0) {
      chunks.push(current.trim());
      current = para;
    } else {
      current = current ? `${current}\n\n${para}` : para;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  const included: string[] = [];
  let usedTokens = 0;

  for (const chunk of chunks) {
    const chunkTokens = await countFn(chunk);
    if (usedTokens + chunkTokens > safeBudget) {
      if (included.length === 0) {
        // Fit at least a prefix of the first chunk
        const charBudget = Math.max(256, Math.floor(safeBudget * 3.4));
        const clipped = chunk.slice(0, charBudget);
        included.push(clipped);
        usedTokens = await countFn(clipped);
      }
      break;
    }
    included.push(chunk);
    usedTokens += chunkTokens;
  }

  return {
    includedText: included.join('\n\n'),
    tokenCount: usedTokens,
    includedChunks: included.length,
    totalChunks: chunks.length,
    truncated: included.length < chunks.length,
  };
}
