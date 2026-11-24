import { File } from 'expo-file-system';

import { extractPdfText } from '@/modules/aura-native';
import { sniffDocument } from './mimeSniffer';
import { fitDocumentToTokenBudget, type TokenCounter } from './tokenBudget';

export interface ParsedDocumentResult {
  status: 'parsed' | 'truncated' | 'unsupported' | 'error';
  text: string;
  tokenCount: number;
  includedChunks: number;
  totalChunks: number;
  pageCount?: number;
  errorMessage?: string;
}

const MAX_READ_BYTES = 15 * 1024 * 1024; // 15 MB safety ceiling for text files

export async function parseLocalDocument(
  uri: string,
  name: string,
  mime: string,
  sizeBytes: number,
  options: { maxTokenBudget?: number; countTokens?: TokenCounter } = {}
): Promise<ParsedDocumentResult> {
  const budget = options.maxTokenBudget ?? 2400;

  // Sniff extension + MIME first
  const initialSniff = sniffDocument(name, mime);
  if (!initialSniff.supported) {
    return {
      status: 'unsupported',
      text: '',
      tokenCount: 0,
      includedChunks: 0,
      totalChunks: 0,
      errorMessage: initialSniff.reason,
    };
  }

  try {
    if (initialSniff.kind === 'pdf') {
      const pdf = await extractPdfText(uri, 150);
      const joined = pdf.pages
        .map((p, idx) => (p.trim() ? `[Page ${idx + 1}]\n${p.trim()}` : ''))
        .filter(Boolean)
        .join('\n\n');

      if (!joined.trim()) {
        return {
          status: 'unsupported',
          text: '',
          tokenCount: 0,
          includedChunks: 0,
          totalChunks: 0,
          pageCount: pdf.pageCount,
          errorMessage:
            'This PDF appears to be scanned with no extractable text layer. Attach page screenshots with a Vision model instead.',
        };
      }

      const fitted = await fitDocumentToTokenBudget(joined, budget, {
        countTokens: options.countTokens,
      });
      return {
        status: fitted.truncated ? 'truncated' : 'parsed',
        text: fitted.includedText,
        tokenCount: fitted.tokenCount,
        includedChunks: fitted.includedChunks,
        totalChunks: fitted.totalChunks,
        pageCount: pdf.pageCount,
      };
    }

    if (sizeBytes > MAX_READ_BYTES) {
      return {
        status: 'error',
        text: '',
        tokenCount: 0,
        includedChunks: 0,
        totalChunks: 0,
        errorMessage: 'File exceeds the 15 MB local text parsing limit.',
      };
    }

    const file = new File(uri);
    const bytes = await file.bytes();
    const byteSniff = sniffDocument(name, mime, bytes.subarray(0, 512));
    if (!byteSniff.supported) {
      return {
        status: 'unsupported',
        text: '',
        tokenCount: 0,
        includedChunks: 0,
        totalChunks: 0,
        errorMessage: byteSniff.reason,
      };
    }

    let rawText = await file.text();
    if (byteSniff.kind === 'json') {
      try {
        rawText = JSON.stringify(JSON.parse(rawText), null, 2);
      } catch {
        // Keep raw if malformed JSON
      }
    }

    const fitted = await fitDocumentToTokenBudget(rawText, budget, {
      countTokens: options.countTokens,
    });

    return {
      status: fitted.truncated ? 'truncated' : 'parsed',
      text: fitted.includedText,
      tokenCount: fitted.tokenCount,
      includedChunks: fitted.includedChunks,
      totalChunks: fitted.totalChunks,
    };
  } catch (err) {
    return {
      status: 'error',
      text: '',
      tokenCount: 0,
      includedChunks: 0,
      totalChunks: 0,
      errorMessage: err instanceof Error ? err.message : 'Failed to parse attachment locally.',
    };
  }
}
