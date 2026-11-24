import { parseGgufHeader } from '../ggufHeaderParser';

function buildMinimalGgufHeader(): Uint8Array {
  // Build a valid GGUF v3 header with 3 KV entries:
  // general.architecture = "llama"
  // llama.block_count = 28 (uint32)
  // llama.context_length = 8192 (uint32)
  const parts: number[] = [];
  const pushU32 = (n: number) => {
    parts.push(n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff);
  };
  const pushU64 = (n: number) => {
    pushU32(n >>> 0);
    pushU32(Math.floor(n / 0x100000000));
  };
  const pushStr = (s: string) => {
    pushU64(s.length);
    for (let i = 0; i < s.length; i++) parts.push(s.charCodeAt(i));
  };

  // Magic "GGUF"
  parts.push(0x47, 0x47, 0x55, 0x46);
  pushU32(3); // version 3
  pushU64(0); // tensor count
  pushU64(3); // kv count

  // KV 1: general.architecture = "llama" (type 8 = STRING)
  pushStr('general.architecture');
  pushU32(8);
  pushStr('llama');

  // KV 2: llama.block_count = 28 (type 4 = UINT32)
  pushStr('llama.block_count');
  pushU32(4);
  pushU32(28);

  // KV 3: llama.context_length = 8192 (type 4 = UINT32)
  pushStr('llama.context_length');
  pushU32(4);
  pushU32(8192);

  return new Uint8Array(parts);
}

describe('ggufHeaderParser', () => {
  it('parses architecture, block_count, and context_length from GGUF v3 binary header', () => {
    const bytes = buildMinimalGgufHeader();
    const res = parseGgufHeader(bytes);
    expect(res.complete).toBe(true);
    expect(res.meta.architecture).toBe('llama');
    expect(res.meta.blockCount).toBe(28);
    expect(res.meta.contextLength).toBe(8192);
  });

  it('requests more bytes gracefully on any truncated prefix without throwing', () => {
    const full = buildMinimalGgufHeader();
    for (let cut = 0; cut < full.length; cut++) {
      const res = parseGgufHeader(full.subarray(0, cut));
      expect(res.complete).toBe(false);
      expect(res.needsMoreBytes).toBe(true);
    }
  });
});
