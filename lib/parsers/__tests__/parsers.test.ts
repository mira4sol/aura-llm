import { sniffDocument } from '../mimeSniffer';
import { fitDocumentToTokenBudget } from '../tokenBudget';
import { computeBackoffMs } from '@/services/downloads/backoff';
import { planFileSegments } from '@/services/downloads/segmentPlanner';

describe('document parsers & download helpers', () => {
  it('allowlists supported documents and blocks unsupported binaries', () => {
    expect(sniffDocument('notes.md', 'text/markdown').supported).toBe(true);
    expect(sniffDocument('report.pdf', 'application/pdf').kind).toBe('pdf');
    expect(sniffDocument('main.ts', 'text/plain').kind).toBe('code');
    expect(sniffDocument('archive.zip', 'application/zip').supported).toBe(false);
    expect(
      sniffDocument('fake.txt', 'text/plain', new Uint8Array([0x50, 0x4b, 0x03, 0x04])).supported
    ).toBe(false);
  });

  it('chunks and truncates large documents within token budget', async () => {
    const bigDoc = Array.from({ length: 20 }, (_, i) => `Paragraph ${i}: ${'word '.repeat(120)}`).join(
      '\n\n'
    );
    const res = await fitDocumentToTokenBudget(bigDoc, 600, { targetChunkTokens: 250 });
    expect(res.truncated).toBe(true);
    expect(res.includedChunks).toBeLessThan(res.totalChunks);
    expect(res.tokenCount).toBeLessThanOrEqual(650);
  });

  it('plans a single native resumable stream for large files (no manual Range conflicts)', () => {
    const size = 600 * 1024 * 1024;
    const segs = planFileSegments('repo::Q4', 0, size);
    expect(segs.length).toBe(1);
    expect(segs[0].start).toBe(0);
    expect(segs[0].end).toBe(size - 1);
  });

  it('caps exponential backoff at 60s', () => {
    expect(computeBackoffMs(1)).toBeGreaterThanOrEqual(1000);
    expect(computeBackoffMs(10)).toBeLessThanOrEqual(60_000);
  });
});
