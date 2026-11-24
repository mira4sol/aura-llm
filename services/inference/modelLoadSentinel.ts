import { runtimeStorage } from '@/lib/storage';
import type { AcceleratorBackend } from '@/lib/types';

const PENDING_LOAD_KEY = 'model-load-sentinel-pending';
const CRASH_RECORD_KEY = 'model-load-crash-records';

interface PendingLoad {
  modelId: string;
  backend: AcceleratorBackend;
  ts: number;
}

export interface ModelCrashRecord {
  gpuCrashed: boolean;
  cpuCrashCount: number;
  hasSucceededBefore: boolean;
  lastCrashedAt: number;
}

function readRecords(): Record<string, ModelCrashRecord> {
  return runtimeStorage.getJSON<Record<string, ModelCrashRecord>>(CRASH_RECORD_KEY) ?? {};
}

function writeRecords(records: Record<string, ModelCrashRecord>): void {
  runtimeStorage.setJSON(CRASH_RECORD_KEY, records);
}

/**
 * Universal native crash-loop guard for both iOS and Android.
 * Persists a flag in MMKV before invoking native `llama.rn` `initLlama()`.
 * - A GPU crash forces safe CPU fallback on next attempt.
 * - Requires 2 consecutive CPU crashes (on a model that has never succeeded) before
 *   quarantining, so Metro reloads or background kills never falsely block working models.
 */
export const modelLoadSentinel = {
  checkAndRecoverOnStartup(): PendingLoad | null {
    const pending = runtimeStorage.getJSON<PendingLoad>(PENDING_LOAD_KEY);
    if (!pending) return null;

    runtimeStorage.remove(PENDING_LOAD_KEY);

    // Ignore stale flags (> 2 minutes old, e.g. from dev reloads)
    if (Date.now() - pending.ts > 120_000) return null;

    const records = readRecords();
    const prev = records[pending.modelId] ?? {
      gpuCrashed: false,
      cpuCrashCount: 0,
      hasSucceededBefore: false,
      lastCrashedAt: 0,
    };

    records[pending.modelId] = {
      gpuCrashed: prev.gpuCrashed || pending.backend !== 'cpu',
      cpuCrashCount: pending.backend === 'cpu' ? prev.cpuCrashCount + 1 : prev.cpuCrashCount,
      hasSucceededBefore: prev.hasSucceededBefore,
      lastCrashedAt: Date.now(),
    };
    writeRecords(records);
    return pending;
  },

  markLoadStarted(modelId: string, backend: AcceleratorBackend): void {
    runtimeStorage.setJSON<PendingLoad>(PENDING_LOAD_KEY, {
      modelId,
      backend,
      ts: Date.now(),
    });
  },

  markLoadSucceeded(modelId?: string): void {
    runtimeStorage.remove(PENDING_LOAD_KEY);
    if (modelId) {
      const records = readRecords();
      const prev = records[modelId];
      records[modelId] = {
        gpuCrashed: prev?.gpuCrashed ?? false,
        cpuCrashCount: 0,
        hasSucceededBefore: true,
        lastCrashedAt: prev?.lastCrashedAt ?? 0,
      };
      writeRecords(records);
    }
  },

  isQuarantined(modelId: string): boolean {
    const rec = readRecords()[modelId];
    if (!rec) return false;
    // Never quarantine a model that has already loaded cleanly before;
    // otherwise require 2 consecutive CPU crashes
    return !rec.hasSucceededBefore && (rec.cpuCrashCount ?? 0) >= 2;
  },

  getRecord(modelId: string): ModelCrashRecord | null {
    return readRecords()[modelId] ?? null;
  },

  clearRecord(modelId: string): void {
    const records = readRecords();
    if (records[modelId]) {
      delete records[modelId];
      writeRecords(records);
    }
  },
};
