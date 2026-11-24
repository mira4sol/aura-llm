import type { MemoryTier } from '@/lib/types';

const MB = 1024 * 1024;
const GB = 1024 * MB;

export interface MemoryBudgetInput {
  platform: 'ios' | 'android';
  totalBytes: number;
  availableBytes: number;
  appAvailableBytes?: number;
  lowMemoryThresholdBytes?: number;
  iosIncreasedLimit?: boolean;
}

export function classifyMemoryTier(totalBytes: number): MemoryTier {
  const gb = totalBytes / GB;
  if (gb < 4) return 'lt4';
  if (gb < 6) return '4to6';
  if (gb < 8) return '6to8';
  if (gb < 12) return '8to12';
  return 'gt12';
}

/**
 * Computes the safe on-device AI memory ceiling respecting iOS Jetsam limits
 * and Android low-memory thresholds.
 */
export function computeSafeMemoryBudget(input: MemoryBudgetInput): number {
  const total = Math.max(0, input.totalBytes);
  if (total === 0) return 0;

  if (input.platform === 'ios') {
    const reserve = 350 * MB;
    const capRatio = input.iosIncreasedLimit !== false ? 0.7 : 0.55;
    const ratioCap = total * capRatio;
    const procAvail =
      input.appAvailableBytes && input.appAvailableBytes > 0
        ? Math.max(0, input.appAvailableBytes - reserve)
        : Math.max(0, input.availableBytes - reserve);
    if (procAvail > 0) {
      return Math.floor(Math.min(procAvail, ratioCap));
    }
    return Math.floor(ratioCap);
  }

  // Android
  const reserve = 400 * MB;
  const lowMem = input.lowMemoryThresholdBytes ?? 256 * MB;
  const ratioCap = total * 0.6;
  const availCap = Math.max(0, input.availableBytes - lowMem - reserve);
  if (availCap > 0) {
    return Math.floor(Math.min(availCap, ratioCap));
  }
  return Math.floor(ratioCap * 0.75);
}
