import {
  clampSegmentBytes,
  isRunawayDownloadOverflow,
  planFileSegments,
} from '../segmentPlanner';

describe('downloadPlanner & overflow guards', () => {
  it('plans a single native resumable stream per file even for multi-GB models', () => {
    const threeGb = 3 * 1024 * 1024 * 1024;
    const segments = planFileSegments('Qwen/Qwen3.5-4B::IQ4_NL', 0, threeGb);
    expect(segments).toHaveLength(1);
    expect(segments[0].start).toBe(0);
    expect(segments[0].end).toBe(threeGb - 1);
    expect(segments[0].status).toBe('pending');
  });

  it('clamps reported bytes so UI progress can never exceed expected file size', () => {
    const threeGb = 3_000_000_000;
    expect(clampSegmentBytes(3_900_000_000, threeGb)).toBe(threeGb);
    expect(clampSegmentBytes(1_900_000_000, threeGb)).toBe(1_900_000_000);
    expect(clampSegmentBytes(-100, threeGb)).toBe(0);
    expect(clampSegmentBytes(500_000, 0)).toBe(500_000);
  });

  it('flags runaway transfers exceeding 102% + 2MB tolerance', () => {
    const threeGb = 3_000_000_000;
    expect(isRunawayDownloadOverflow(threeGb, threeGb)).toBe(false);
    expect(isRunawayDownloadOverflow(3_030_000_000, threeGb)).toBe(false);
    expect(isRunawayDownloadOverflow(3_300_000_000, threeGb)).toBe(true);
    expect(isRunawayDownloadOverflow(3_900_000_000, threeGb)).toBe(true);
    expect(isRunawayDownloadOverflow(500_000, 0)).toBe(false);
  });
});
