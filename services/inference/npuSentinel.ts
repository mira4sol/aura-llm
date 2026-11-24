import { runtimeStorage } from '@/lib/storage';

const SENTINEL_PENDING_KEY = 'hexagon-npu-probe-pending';
const BLACKLIST_KEY = 'hexagon-npu-blacklisted-fingerprint';

/**
 * Crash-safe sentinel for experimental Qualcomm Hexagon NPU (HTP0) offload.
 * Before attempting HTP init, `markProbeStarted` writes a persistent flag to MMKV.
 * If the native driver aborts the process before `markProbeSucceeded`, the next app
 * launch detects the stale flag and blacklists Hexagon for this device+OS fingerprint.
 */
export const npuSentinel = {
  checkAndRecoverOnStartup(deviceFingerprint: string): boolean {
    const pending = runtimeStorage.getString(SENTINEL_PENDING_KEY);
    if (pending) {
      runtimeStorage.remove(SENTINEL_PENDING_KEY);
      runtimeStorage.set(BLACKLIST_KEY, deviceFingerprint);
      return true; // Crash detected -> blacklisted
    }
    return false;
  },

  isBlacklisted(deviceFingerprint: string): boolean {
    return runtimeStorage.getString(BLACKLIST_KEY) === deviceFingerprint;
  },

  markProbeStarted(deviceFingerprint: string): void {
    runtimeStorage.set(SENTINEL_PENDING_KEY, deviceFingerprint);
  },

  markProbeSucceeded(): void {
    runtimeStorage.remove(SENTINEL_PENDING_KEY);
  },

  resetBlacklist(): void {
    runtimeStorage.remove(BLACKLIST_KEY);
    runtimeStorage.remove(SENTINEL_PENDING_KEY);
  },
};
