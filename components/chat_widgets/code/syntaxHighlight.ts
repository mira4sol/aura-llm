import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import cpp from 'highlight.js/lib/languages/cpp';
import css from 'highlight.js/lib/languages/css';
import go from 'highlight.js/lib/languages/go';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import kotlin from 'highlight.js/lib/languages/kotlin';
import python from 'highlight.js/lib/languages/python';
import rust from 'highlight.js/lib/languages/rust';
import sql from 'highlight.js/lib/languages/sql';
import swift from 'highlight.js/lib/languages/swift';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';

import { AURA_COLORS } from '@/components/theme';

let registered = false;
function ensureLanguages(): void {
  if (registered) return;
  registered = true;
  hljs.registerLanguage('typescript', typescript);
  hljs.registerLanguage('ts', typescript);
  hljs.registerLanguage('tsx', typescript);
  hljs.registerLanguage('javascript', javascript);
  hljs.registerLanguage('js', javascript);
  hljs.registerLanguage('jsx', javascript);
  hljs.registerLanguage('python', python);
  hljs.registerLanguage('py', python);
  hljs.registerLanguage('swift', swift);
  hljs.registerLanguage('kotlin', kotlin);
  hljs.registerLanguage('kt', kotlin);
  hljs.registerLanguage('json', json);
  hljs.registerLanguage('bash', bash);
  hljs.registerLanguage('sh', bash);
  hljs.registerLanguage('zsh', bash);
  hljs.registerLanguage('sql', sql);
  hljs.registerLanguage('rust', rust);
  hljs.registerLanguage('rs', rust);
  hljs.registerLanguage('go', go);
  hljs.registerLanguage('cpp', cpp);
  hljs.registerLanguage('c', cpp);
  hljs.registerLanguage('java', java);
  hljs.registerLanguage('html', xml);
  hljs.registerLanguage('xml', xml);
  hljs.registerLanguage('css', css);
  hljs.registerLanguage('yaml', yaml);
  hljs.registerLanguage('yml', yaml);
}

export interface HighlightedSpan {
  text: string;
  color: string;
}

const SCOPE_COLORS: Record<string, string> = {
  keyword: '#cdbdff',
  built_in: '#6ff6ff',
  type: '#6ff6ff',
  literal: '#ec4899',
  number: '#f472b6',
  string: '#7dd3fc',
  comment: '#757087',
  title: '#e8deff',
  attr: '#00dce6',
  property: '#6ff6ff',
  params: '#e4e1ee',
  variable: '#e4e1ee',
};

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'");
}

/**
 * Tokenizes source code into flat RN-renderable colored spans using highlight.js.
 */
export function highlightCodeToSpans(code: string, language: string | null): HighlightedSpan[] {
  ensureLanguages();
  if (!code) return [];
  // Skip expensive highlighting for very large blocks
  if (code.length > 8000) {
    return [{ text: code, color: AURA_COLORS.onSurface }];
  }

  try {
    const html =
      language && hljs.getLanguage(language)
        ? hljs.highlight(code, { language, ignoreIllegals: true }).value
        : hljs.highlightAuto(code).value;

    const spans: HighlightedSpan[] = [];
    const stack: string[] = [AURA_COLORS.onSurface];
    const tagRegex = /(<span class="hljs-([^"]+)">|<\/span>)/g;
    let last = 0;

    for (const m of html.matchAll(tagRegex)) {
      const idx = m.index ?? 0;
      if (idx > last) {
        spans.push({
          text: decodeHtmlEntities(html.slice(last, idx)),
          color: stack[stack.length - 1],
        });
      }
      if (m[0] === '</span>') {
        if (stack.length > 1) stack.pop();
      } else {
        const scope = (m[2] ?? '').split(/[\s-]/)[0];
        stack.push(SCOPE_COLORS[scope] ?? AURA_COLORS.onSurface);
      }
      last = idx + m[0].length;
    }

    if (last < html.length) {
      spans.push({
        text: decodeHtmlEntities(html.slice(last)),
        color: stack[stack.length - 1],
      });
    }
    return spans;
  } catch {
    return [{ text: code, color: AURA_COLORS.onSurface }];
  }
}
