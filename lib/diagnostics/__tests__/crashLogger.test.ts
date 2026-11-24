import { crashLogger } from '../crashLogger';

describe('crashLogger', () => {
  beforeEach(() => {
    crashLogger.clearRecords();
  });

  it('persists crash records and caps the ring buffer at 20 entries', () => {
    for (let i = 0; i < 25; i++) {
      crashLogger.record({
        source: 'global_js',
        fatal: false,
        message: `Error #${i}`,
      });
    }
    const list = crashLogger.listRecords();
    expect(list).toHaveLength(20);
    expect(list[0].message).toBe('Error #24');
  });

  it('detects unexpected termination when previous session did not exit cleanly', () => {
    crashLogger.beginSession();
    crashLogger.setBreadcrumb({ lastAction: 'downloading_model', lastMemoryPressure: 'critical' });
    // Simulate sudden OS kill (no markCleanBackground called)
    const detected = crashLogger.beginSession();
    expect(detected).not.toBeNull();
    expect(detected?.source).toBe('unexpected_termination');
    expect(detected?.context?.lastAction).toBe('downloading_model');
  });

  it('does not flag unexpected termination after clean backgrounding', () => {
    crashLogger.beginSession();
    crashLogger.markCleanBackground();
    const detected = crashLogger.beginSession();
    expect(detected).toBeNull();
  });
});
