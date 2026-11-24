import type { GgufHeaderMeta } from '@/lib/types';

// GGUF value type tags (per ggml/llama.cpp spec)
const GGUF_TYPE = {
  UINT8: 0,
  INT8: 1,
  UINT16: 2,
  INT16: 3,
  UINT32: 4,
  INT32: 5,
  FLOAT32: 6,
  BOOL: 7,
  STRING: 8,
  ARRAY: 9,
  UINT64: 10,
  INT64: 11,
  FLOAT64: 12,
} as const;

export interface GgufParseResult {
  complete: boolean;
  needsMoreBytes: boolean;
  meta: GgufHeaderMeta;
}

class BinaryReader {
  private view: DataView;
  private bytes: Uint8Array;
  public offset = 0;

  constructor(bytes: Uint8Array) {
    this.bytes = bytes;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  has(n: number): boolean {
    return this.offset + n <= this.bytes.byteLength;
  }

  u8(): number {
    if (!this.has(1)) throw new RangeError('EOF');
    const v = this.view.getUint8(this.offset);
    this.offset += 1;
    return v;
  }

  i8(): number {
    if (!this.has(1)) throw new RangeError('EOF');
    const v = this.view.getInt8(this.offset);
    this.offset += 1;
    return v;
  }

  u16(): number {
    if (!this.has(2)) throw new RangeError('EOF');
    const v = this.view.getUint16(this.offset, true);
    this.offset += 2;
    return v;
  }

  i16(): number {
    if (!this.has(2)) throw new RangeError('EOF');
    const v = this.view.getInt16(this.offset, true);
    this.offset += 2;
    return v;
  }

  u32(): number {
    if (!this.has(4)) throw new RangeError('EOF');
    const v = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return v;
  }

  i32(): number {
    if (!this.has(4)) throw new RangeError('EOF');
    const v = this.view.getInt32(this.offset, true);
    this.offset += 4;
    return v;
  }

  u64(): number {
    if (!this.has(8)) throw new RangeError('EOF');
    const lo = this.view.getUint32(this.offset, true);
    const hi = this.view.getUint32(this.offset + 4, true);
    this.offset += 8;
    return hi * 0x100000000 + lo;
  }

  f32(): number {
    if (!this.has(4)) throw new RangeError('EOF');
    const v = this.view.getFloat32(this.offset, true);
    this.offset += 4;
    return v;
  }

  f64(): number {
    if (!this.has(8)) throw new RangeError('EOF');
    const v = this.view.getFloat64(this.offset, true);
    this.offset += 8;
    return v;
  }

  str(maxDecode = 2048): string {
    const len = this.u64();
    if (len > 64 * 1024 * 1024) throw new Error('Invalid GGUF string length');
    if (!this.has(len)) throw new RangeError('EOF');
    const sliceLen = Math.min(len, maxDecode);
    let out = '';
    for (let i = 0; i < sliceLen; i++) {
      out += String.fromCharCode(this.bytes[this.offset + i]);
    }
    this.offset += len;
    return out;
  }

  skipValue(type: number): void {
    switch (type) {
      case GGUF_TYPE.UINT8:
      case GGUF_TYPE.INT8:
      case GGUF_TYPE.BOOL:
        if (!this.has(1)) throw new RangeError('EOF');
        this.offset += 1;
        return;
      case GGUF_TYPE.UINT16:
      case GGUF_TYPE.INT16:
        if (!this.has(2)) throw new RangeError('EOF');
        this.offset += 2;
        return;
      case GGUF_TYPE.UINT32:
      case GGUF_TYPE.INT32:
      case GGUF_TYPE.FLOAT32:
        if (!this.has(4)) throw new RangeError('EOF');
        this.offset += 4;
        return;
      case GGUF_TYPE.UINT64:
      case GGUF_TYPE.INT64:
      case GGUF_TYPE.FLOAT64:
        if (!this.has(8)) throw new RangeError('EOF');
        this.offset += 8;
        return;
      case GGUF_TYPE.STRING: {
        const len = this.u64();
        if (!this.has(len)) throw new RangeError('EOF');
        this.offset += len;
        return;
      }
      case GGUF_TYPE.ARRAY: {
        const elemType = this.u32();
        const count = this.u64();
        const fixedSizes: Record<number, number> = {
          [GGUF_TYPE.UINT8]: 1,
          [GGUF_TYPE.INT8]: 1,
          [GGUF_TYPE.BOOL]: 1,
          [GGUF_TYPE.UINT16]: 2,
          [GGUF_TYPE.INT16]: 2,
          [GGUF_TYPE.UINT32]: 4,
          [GGUF_TYPE.INT32]: 4,
          [GGUF_TYPE.FLOAT32]: 4,
          [GGUF_TYPE.UINT64]: 8,
          [GGUF_TYPE.INT64]: 8,
          [GGUF_TYPE.FLOAT64]: 8,
        };
        const fixed = fixedSizes[elemType];
        if (fixed) {
          const total = fixed * count;
          if (!this.has(total)) throw new RangeError('EOF');
          this.offset += total;
          return;
        }
        for (let i = 0; i < count; i++) {
          this.skipValue(elemType);
        }
        return;
      }
      default:
        throw new Error(`Unknown GGUF type: ${type}`);
    }
  }

  readScalar(type: number): string | number | boolean | null {
    switch (type) {
      case GGUF_TYPE.UINT8:
        return this.u8();
      case GGUF_TYPE.INT8:
        return this.i8();
      case GGUF_TYPE.UINT16:
        return this.u16();
      case GGUF_TYPE.INT16:
        return this.i16();
      case GGUF_TYPE.UINT32:
        return this.u32();
      case GGUF_TYPE.INT32:
        return this.i32();
      case GGUF_TYPE.FLOAT32:
        return this.f32();
      case GGUF_TYPE.BOOL:
        return this.u8() !== 0;
      case GGUF_TYPE.STRING:
        return this.str();
      case GGUF_TYPE.UINT64:
      case GGUF_TYPE.INT64:
        return this.u64();
      case GGUF_TYPE.FLOAT64:
        return this.f64();
      default:
        this.skipValue(type);
        return null;
    }
  }
}

/**
 * Parses GGUF v2/v3 KV metadata header from a leading byte buffer.
 * Never throws on truncated buffers; returns { needsMoreBytes: true } with partial meta.
 */
export function parseGgufHeader(buffer: Uint8Array): GgufParseResult {
  const meta: GgufHeaderMeta = {};
  if (buffer.byteLength < 24) {
    return { complete: false, needsMoreBytes: true, meta };
  }

  // Magic "GGUF"
  if (
    buffer[0] !== 0x47 ||
    buffer[1] !== 0x47 ||
    buffer[2] !== 0x55 ||
    buffer[3] !== 0x46
  ) {
    return { complete: false, needsMoreBytes: false, meta };
  }

  const reader = new BinaryReader(buffer);
  reader.offset = 4;

  try {
    const version = reader.u32();
    if (version < 2 || version > 3) {
      return { complete: false, needsMoreBytes: false, meta };
    }
    reader.u64(); // tensor_count
    const kvCount = reader.u64();

    const kv = new Map<string, string | number | boolean>();
    const wantedSuffixes = [
      'general.architecture',
      'general.size_label',
      '.block_count',
      '.attention.head_count',
      '.attention.head_count_kv',
      '.embedding_length',
      '.context_length',
      'tokenizer.chat_template',
      'clip.has_vision_encoder',
      'clip.has_audio_encoder',
    ];

    for (let i = 0; i < kvCount; i++) {
      const key = reader.str(256);
      const valType = reader.u32();
      const shouldKeep = wantedSuffixes.some((s) => key === s || key.endsWith(s));
      if (shouldKeep && valType !== GGUF_TYPE.ARRAY) {
        const val = reader.readScalar(valType);
        if (val !== null) kv.set(key, val);
      } else {
        reader.skipValue(valType);
      }
    }

    extractMetaFromMap(kv, meta);
    return { complete: true, needsMoreBytes: false, meta };
  } catch (err) {
    if (err instanceof RangeError && err.message === 'EOF') {
      return { complete: false, needsMoreBytes: true, meta };
    }
    return { complete: false, needsMoreBytes: false, meta };
  }
}

function extractMetaFromMap(kv: Map<string, string | number | boolean>, meta: GgufHeaderMeta): void {
  const arch = kv.get('general.architecture');
  if (typeof arch === 'string') meta.architecture = arch;

  const sizeLabel = kv.get('general.size_label');
  if (typeof sizeLabel === 'string') meta.sizeLabel = sizeLabel;

  if (kv.has('tokenizer.chat_template')) meta.hasChatTemplate = true;
  if (kv.get('clip.has_vision_encoder') === true) meta.hasVisionEncoder = true;
  if (kv.get('clip.has_audio_encoder') === true) meta.hasAudioEncoder = true;

  const num = (suffix: string): number | undefined => {
    if (meta.architecture) {
      const exact = kv.get(`${meta.architecture}${suffix}`);
      if (typeof exact === 'number') return exact;
    }
    for (const [k, v] of kv.entries()) {
      if (k.endsWith(suffix) && typeof v === 'number') return v;
    }
    return undefined;
  };

  meta.blockCount = num('.block_count');
  meta.headCount = num('.attention.head_count');
  meta.headCountKv = num('.attention.head_count_kv') ?? meta.headCount;
  meta.embeddingLength = num('.embedding_length');
  meta.contextLength = num('.context_length');
}
