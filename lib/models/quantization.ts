export interface QuantInfo {
  quant: string;
  bitsPerWeight: number;
  qualityRank: number; // higher is better
}

const QUANT_TABLE: Record<string, { bpw: number; rank: number }> = {
  F32: { bpw: 32, rank: 100 },
  F16: { bpw: 16, rank: 95 },
  BF16: { bpw: 16, rank: 94 },
  Q8_0: { bpw: 8.5, rank: 90 },
  Q6_K: { bpw: 6.6, rank: 85 },
  Q6_K_L: { bpw: 6.7, rank: 86 },
  Q5_K_M: { bpw: 5.7, rank: 80 },
  Q5_K_S: { bpw: 5.5, rank: 78 },
  Q5_K_L: { bpw: 5.8, rank: 81 },
  Q5_0: { bpw: 5.5, rank: 76 },
  Q4_K_M: { bpw: 4.85, rank: 75 },
  Q4_K_S: { bpw: 4.6, rank: 72 },
  Q4_K_L: { bpw: 4.95, rank: 76 },
  IQ4_NL: { bpw: 4.5, rank: 71 },
  IQ4_XS: { bpw: 4.25, rank: 70 },
  Q4_0: { bpw: 4.5, rank: 68 },
  Q4_1: { bpw: 5.0, rank: 69 },
  IQ3_M: { bpw: 3.7, rank: 60 },
  Q3_K_L: { bpw: 3.9, rank: 62 },
  Q3_K_M: { bpw: 3.6, rank: 59 },
  Q3_K_S: { bpw: 3.4, rank: 56 },
  IQ3_XS: { bpw: 3.3, rank: 55 },
  IQ3_XXS: { bpw: 3.1, rank: 52 },
  Q2_K: { bpw: 2.9, rank: 45 },
  IQ2_M: { bpw: 2.7, rank: 44 },
  IQ2_S: { bpw: 2.5, rank: 42 },
  IQ2_XS: { bpw: 2.3, rank: 40 },
  IQ2_XXS: { bpw: 2.1, rank: 38 },
  INT8: { bpw: 8.0, rank: 88 },
  FP16: { bpw: 16.0, rank: 95 },
  Q5_1: { bpw: 6.0, rank: 79 },
};

const QUANT_PATTERN =
  /(?:^|[._-])(IQ[1-4]_[A-Z0-9]+|Q[2-8]_K(?:_[SML])?|Q[458]_[01]|BF16|FP16|F16|F32|INT8)(?:[._-]|$)/i;

export function extractQuantFromFilename(filename: string): string {
  const base = filename.split('/').pop() ?? filename;
  const cleaned = base.replace(/\.(gguf|bin|onnx)$/i, '');
  const match = cleaned.match(QUANT_PATTERN);
  if (match) {
    return match[1].toUpperCase();
  }
  if (/int8/i.test(cleaned)) return 'INT8';
  if (/fp16|f16/i.test(cleaned)) return 'F16';
  return 'DEFAULT';
}

export function getQuantInfo(quant: string): QuantInfo {
  const key = quant.toUpperCase();
  const entry = QUANT_TABLE[key];
  if (entry) {
    return { quant: key, bitsPerWeight: entry.bpw, qualityRank: entry.rank };
  }
  return { quant: key, bitsPerWeight: 4.85, qualityRank: 50 };
}

/**
 * Strips split shard suffixes like "-00001-of-00003" to group multi-part GGUFs.
 */
export function getSplitGroupKey(filename: string): { key: string; isSplit: boolean } {
  const match = filename.match(/^(.*?)-\d{5}-of-\d{5}(\.gguf)$/i);
  if (match) {
    return { key: `${match[1]}${match[2]}`, isSplit: true };
  }
  return { key: filename, isSplit: false };
}

export const QUANT_RECOMMENDATION_ORDER = [
  'Q8_0',
  'Q6_K',
  'Q5_K_M',
  'Q4_K_M',
  'IQ4_XS',
  'Q4_0',
  'IQ3_M',
  'Q3_K_M',
  'IQ2_M',
];
