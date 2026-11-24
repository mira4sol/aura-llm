import { humanizeLatexInPlainText } from './latexMath';

export function deriveConversationTitle(prompt: string, fallback = 'New Conversation'): string {
  const cleaned = humanizeLatexInPlainText(prompt)
    .replace(/[#*_`>\[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return fallback;
  if (cleaned.length <= 44) return cleaned;
  return `${cleaned.slice(0, 41).trimEnd()}…`;
}

/**
 * Sanitizes a raw LLM-generated title into a crisp 3-6 word header title.
 * Strips reasoning traces, LaTeX markup, quotes, markdown, prefixes like "Title:", and trailing punctuation.
 */
export function sanitizeGeneratedTitle(raw: string, fallback: string): string {
  const stripped = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<think>[\s\S]*$/gi, '')
    .replace(/^(?:title\s*:\s*)/i, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.length > 0);

  if (!stripped) return fallback;

  const cleaned = humanizeLatexInPlainText(stripped)
    .replace(/^["'`*#\-\s]+|["'`*#\s.!?:;]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned || cleaned.length < 2) return fallback;

  const words = cleaned.split(' ').slice(0, 6).join(' ');
  return words.length <= 48 ? words : `${words.slice(0, 45).trimEnd()}…`;
}
