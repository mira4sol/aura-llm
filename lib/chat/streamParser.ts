import type { MessageBlock } from '@/lib/types';

function tryParseJson(raw: string): { valid: boolean; parsed?: unknown } {
  const trimmed = raw.trim();
  if (!trimmed || (trimmed[0] !== '{' && trimmed[0] !== '[')) {
    return { valid: false };
  }
  try {
    const parsed = JSON.parse(trimmed);
    return { valid: true, parsed };
  } catch {
    return { valid: false };
  }
}

function normalizeReasoningDelimiters(input: string): string {
  // Normalize cross-model reasoning tags into canonical <think>...</think>
  let text = input
    .replace(/<(?:thought|reasoning|\|thought\|)>/gi, '<think>')
    .replace(/<\/(?:thought|reasoning|\|thought\|)>/gi, '</think>')
    .replace(/\[THINK\]/g, '<think>')
    .replace(/\[\/THINK\]/g, '</think>');

  // Handle prompt-prefilled <think> (e.g. Qwen3/3.5, DeepSeek-R1) where only </think> appears in output
  const firstOpen = text.indexOf('<think>');
  const firstClose = text.indexOf('</think>');
  if (firstClose !== -1 && (firstOpen === -1 || firstClose < firstOpen)) {
    text = `<think>${text}`;
  } else if (firstOpen === -1 && /^\s*Thinking Process:\s*\n/i.test(text)) {
    // Unclosed prompt-prefilled Qwen3.5 chain-of-thought mid-stream
    text = `<think>\n${text}`;
  }

  return text;
}

/**
 * Deterministically parses streaming or complete assistant text into typed MessageBlocks:
 * - <think>...</think> reasoning traces (plus orphan </think>, <thought>, [THINK], <reasoning>)
 * - Fenced code blocks ```lang ... ``` (tolerates unclosed fences mid-stream)
 * - Structured JSON blocks (```json fences or standalone valid JSON payloads)
 * - Display math blocks ($$...$$ and \[...\])
 * - Rich markdown blocks for remaining prose
 *
 * Pure function designed to never throw regardless of arbitrary mid-token truncation.
 */
export function parseStreamingMessage(
  rawInput: string,
  options: { messageId: string; isComplete: boolean; startedAt?: number; now?: number }
): MessageBlock[] {
  const { messageId, isComplete } = options;
  const startedAt = options.startedAt ?? Date.now();
  const now = options.now ?? Date.now();

  if (!rawInput) return [];
  const rawText = normalizeReasoningDelimiters(rawInput);

  const blocks: MessageBlock[] = [];
  let blockIndex = 0;
  const nextId = (prefix: string) => `${messageId}-${prefix}-${blockIndex++}`;

  const pushMarkdownOrJson = (segment: string, closed: boolean) => {
    const trimmed = segment.trim();
    if (!trimmed) return;

    // Standalone JSON payload detection when the entire segment is valid JSON
    if (
      closed &&
      ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']')))
    ) {
      const check = tryParseJson(trimmed);
      if (check.valid) {
        blocks.push({
          id: nextId('json'),
          type: 'json',
          raw: trimmed,
          parsed: check.parsed,
          valid: true,
          closed: true,
        });
        return;
      }
    }

    blocks.push({
      id: nextId('md'),
      type: 'markdown',
      text: segment,
      closed,
    });
  };

  let cursor = 0;
  const len = rawText.length;
  let mdBuffer = '';

  const flushMarkdown = (closed: boolean) => {
    if (mdBuffer.length > 0) {
      pushMarkdownOrJson(mdBuffer, closed);
      mdBuffer = '';
    }
  };

  while (cursor < len) {
    // 1. Check for <think> tag
    if (rawText.startsWith('<think>', cursor)) {
      flushMarkdown(true);
      const bodyStart = cursor + 7;
      const closeIdx = rawText.indexOf('</think>', bodyStart);
      if (closeIdx === -1) {
        const thought = rawText.slice(bodyStart);
        blocks.push({
          id: nextId('think'),
          type: 'thinking',
          text: thought.trim(),
          startedAt,
          endedAt: isComplete ? now : undefined,
          closed: isComplete,
        });
        cursor = len;
        break;
      } else {
        const thought = rawText.slice(bodyStart, closeIdx);
        blocks.push({
          id: nextId('think'),
          type: 'thinking',
          text: thought.trim(),
          startedAt,
          endedAt: now,
          closed: true,
        });
        cursor = closeIdx + 8;
        continue;
      }
    }

    // 2. Check for fenced code block at start of line (or cursor === 0)
    const atLineStart = cursor === 0 || rawText[cursor - 1] === '\n';
    if (atLineStart && rawText.startsWith('```', cursor)) {
      flushMarkdown(true);
      const lineEnd = rawText.indexOf('\n', cursor + 3);
      if (lineEnd === -1) {
        // Still typing the opening fence language tag
        const lang = rawText.slice(cursor + 3).trim() || null;
        blocks.push({
          id: nextId('code'),
          type: 'code',
          language: lang,
          code: '',
          closed: isComplete,
        });
        cursor = len;
        break;
      }

      const langRaw = rawText.slice(cursor + 3, lineEnd).trim().toLowerCase();
      const lang = langRaw || null;
      const codeStart = lineEnd + 1;

      // Find closing ``` on its own line
      let searchPos = codeStart;
      let closePos = -1;
      while (searchPos < len) {
        const idx = rawText.indexOf('```', searchPos);
        if (idx === -1) break;
        const beforeOk = idx === codeStart || rawText[idx - 1] === '\n';
        const afterIdx = idx + 3;
        const afterOk =
          afterIdx >= len || rawText[afterIdx] === '\n' || rawText[afterIdx] === '\r';
        if (beforeOk && afterOk) {
          closePos = idx;
          break;
        }
        searchPos = idx + 3;
      }

      const closed = closePos !== -1 || isComplete;
      const codeBody = (closePos === -1 ? rawText.slice(codeStart) : rawText.slice(codeStart, closePos)).replace(
        /\n$/,
        ''
      );

      if (lang === 'json' || lang === 'jsonc') {
        const check = closed ? tryParseJson(codeBody) : { valid: false };
        blocks.push({
          id: nextId('json'),
          type: 'json',
          raw: codeBody,
          parsed: check.parsed,
          valid: check.valid,
          closed,
        });
      } else {
        blocks.push({
          id: nextId('code'),
          type: 'code',
          language: lang,
          code: codeBody,
          closed,
        });
      }

      if (closePos === -1) {
        cursor = len;
      } else {
        cursor = closePos + 3;
        if (rawText[cursor] === '\r') cursor++;
        if (rawText[cursor] === '\n') cursor++;
      }
      continue;
    }

    // 3. Check for display math block: $$...$$ or \[...\]
    const escapedPrev = cursor > 0 && rawText[cursor - 1] === '\\';
    if (!escapedPrev && (rawText.startsWith('$$', cursor) || rawText.startsWith('\\[', cursor))) {
      const isDollar = rawText.startsWith('$$', cursor);
      const closeDelim = isDollar ? '$$' : '\\]';
      const bodyStart = cursor + 2;
      const closeIdx = rawText.indexOf(closeDelim, bodyStart);

      flushMarkdown(true);
      if (closeIdx === -1) {
        const latexBody = rawText.slice(bodyStart).trim();
        if (latexBody || !isComplete) {
          blocks.push({
            id: nextId('math'),
            type: 'math',
            latex: latexBody,
            closed: isComplete,
          });
        }
        cursor = len;
        break;
      } else {
        const latexBody = rawText.slice(bodyStart, closeIdx).trim();
        if (latexBody) {
          blocks.push({
            id: nextId('math'),
            type: 'math',
            latex: latexBody,
            closed: true,
          });
        }
        cursor = closeIdx + 2;
        if (rawText[cursor] === '\r') cursor++;
        if (rawText[cursor] === '\n') cursor++;
        continue;
      }
    }

    // Advance to next potential delimiter (<think>, $$, \[, or newline)
    const nextNewline = rawText.indexOf('\n', cursor);
    const nextThink = rawText.indexOf('<think>', cursor + 1);
    const nextDollarMath = rawText.indexOf('$$', cursor + 1);
    const nextBracketMath = rawText.indexOf('\\[', cursor + 1);

    let nextStop = len;
    if (nextNewline !== -1 && nextNewline + 1 < nextStop) nextStop = nextNewline + 1;
    if (nextThink !== -1 && nextThink < nextStop) nextStop = nextThink;
    if (nextDollarMath !== -1 && nextDollarMath < nextStop) nextStop = nextDollarMath;
    if (nextBracketMath !== -1 && nextBracketMath < nextStop) nextStop = nextBracketMath;

    mdBuffer += rawText.slice(cursor, nextStop);
    cursor = nextStop;
  }

  flushMarkdown(isComplete);
  return blocks;
}
