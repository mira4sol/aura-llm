import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { Paths } from 'expo-file-system';

import {
  getMemorySnapshot,
  probeHardware,
  type NativeHardwareProbe,
} from '@/modules/aura-native';
import { runtimeStorage } from '@/lib/storage';
import type { CpuCluster, DeviceHardwareProfile, SocVendor } from '@/lib/types';
import { classifyMemoryTier, computeSafeMemoryBudget } from './memoryBudget';

const PROFILE_CACHE_KEY = 'hardware-profile-v1';

function parseAdrenoGeneration(gpuName: string | null | undefined): number | undefined {
  if (!gpuName) return undefined;
  const match = gpuName.match(/adreno(?:\s*\(tm\))?\s*(\d)(\d{2})/i);
  if (!match) return undefined;
  const gen = Number.parseInt(match[1], 10);
  return Number.isFinite(gen) ? gen : undefined;
}

function computePerformanceCores(clusters: CpuCluster[], totalCores: number): number {
  if (clusters.length === 0) {
    return Math.max(2, Math.min(4, Math.ceil(totalCores / 2)));
  }
  const maxMHz = Math.max(...clusters.map((c) => c.maxFreqMHz));
  if (maxMHz <= 0) return Math.max(2, Math.min(6, totalCores));
  const perf = clusters
    .filter((c) => c.maxFreqMHz >= maxMHz * 0.75)
    .reduce((sum, c) => sum + c.cores, 0);
  return Math.max(2, perf || totalCores);
}

function deriveMarketingSocName(vendor: SocVendor, rawModel: string | null): string | null {
  if (!rawModel) return null;
  const upper = rawModel.toUpperCase();
  if (vendor === 'apple') return rawModel;
  // Common Qualcomm marketing mappings for clearer UI display while preserving exact model
  if (upper.includes('SM8750')) return 'Snapdragon 8 Elite';
  if (upper.includes('SM8650')) return 'Snapdragon 8 Gen 3';
  if (upper.includes('SM8550')) return 'Snapdragon 8 Gen 2';
  if (upper.includes('SM8475') || upper.includes('SM8450')) return 'Snapdragon 8 Gen 1';
  if (upper.includes('SM8635')) return 'Snapdragon 8s Gen 3';
  if (upper.includes('MT6991')) return 'Dimensity 9400';
  if (upper.includes('MT6989')) return 'Dimensity 9300';
  if (upper.includes('MT6985')) return 'Dimensity 9200';
  if (upper.includes('S5E9945')) return 'Exynos 2400';
  if (upper.includes('S5E9925')) return 'Exynos 2200';
  return rawModel;
}

function readDiskSpace(): { freeBytes: number; totalBytes: number } {
  try {
    return {
      freeBytes: Paths.availableDiskSpace ?? 0,
      totalBytes: Paths.totalDiskSpace ?? 0,
    };
  } catch {
    return { freeBytes: 0, totalBytes: 0 };
  }
}

export async function collectHardwareProfile(): Promise<DeviceHardwareProfile> {
  const platform: 'ios' | 'android' = Platform.OS === 'ios' ? 'ios' : 'android';
  let nativeProbe: NativeHardwareProbe | null = null;
  try {
    nativeProbe = await probeHardware();
  } catch {
    nativeProbe = null;
  }

  const totalBytes = nativeProbe?.memory.totalBytes || Device.totalMemory || 0;
  const availableBytes = nativeProbe?.memory.availableBytes || Math.floor(totalBytes * 0.5);
  const safeBudgetBytes = computeSafeMemoryBudget({
    platform,
    totalBytes,
    availableBytes,
    appAvailableBytes: nativeProbe?.memory.appAvailableBytes,
    lowMemoryThresholdBytes: nativeProbe?.memory.lowMemoryThresholdBytes,
    iosIncreasedLimit: platform === 'ios',
  });

  const clusters: CpuCluster[] = (nativeProbe?.cpuClusters ?? []).map((c) => ({
    maxFreqMHz: Math.round(c.maxFreqKHz / 1000),
    cores: c.cores,
  }));
  const totalCores =
    clusters.reduce((sum, c) => sum + c.cores, 0) || (platform === 'ios' ? 6 : 8);
  const performanceCores = computePerformanceCores(clusters, totalCores);

  const vendor: SocVendor =
    nativeProbe?.socVendor ?? (platform === 'ios' ? 'apple' : 'unknown');
  const socModel = nativeProbe?.socModel ?? null;
  const gpuName = nativeProbe?.gpu.name ?? null;
  const storage = readDiskSpace();

  const cached = runtimeStorage.getJSON<DeviceHardwareProfile>(PROFILE_CACHE_KEY);

  const profile: DeviceHardwareProfile = {
    capturedAt: Date.now(),
    platform,
    osVersion: `${platform === 'ios' ? 'iOS' : 'Android'} ${Device.osVersion ?? Platform.Version}`,
    deviceModel: Device.modelName ?? Device.deviceName ?? 'Unknown Device',
    deviceIdentifier: nativeProbe?.deviceIdentifier ?? Device.modelId ?? null,
    soc: {
      vendor,
      model: socModel,
      marketingName: deriveMarketingSocName(vendor, socModel),
    },
    cpu: {
      abi: Device.supportedCpuArchitectures?.[0] ?? (platform === 'ios' ? 'arm64e' : 'arm64-v8a'),
      totalCores,
      clusters,
      performanceCores,
      features: nativeProbe?.cpuFeatures ?? {
        neon: true,
        fp16: platform === 'ios',
        dotprod: platform === 'ios',
        i8mm: false,
        sve: false,
        sme: false,
      },
    },
    gpu: {
      name: gpuName,
      metal: nativeProbe?.gpu.metal ?? platform === 'ios',
      metalFamily: nativeProbe?.gpu.metalFamily,
      opencl: nativeProbe?.gpu.openclAvailable ?? false,
      vulkanVersion: nativeProbe?.gpu.vulkanVersion,
      adrenoGeneration: parseAdrenoGeneration(gpuName),
    },
    npu: {
      appleNeuralEngine: nativeProbe?.npu.ane ?? platform === 'ios',
      hexagon: nativeProbe?.npu.hexagonRpc ?? false,
      hexagonArch: nativeProbe?.npu.hexagonArch,
    },
    memory: {
      totalBytes,
      availableBytes,
      safeBudgetBytes,
      tier: classifyMemoryTier(totalBytes),
    },
    storage,
    thermal: nativeProbe?.thermal ?? 'nominal',
    llamaBackends: cached?.llamaBackends,
  };

  runtimeStorage.setJSON(PROFILE_CACHE_KEY, profile);
  return profile;
}

export function getCachedHardwareProfile(): DeviceHardwareProfile | null {
  return runtimeStorage.getJSON<DeviceHardwareProfile>(PROFILE_CACHE_KEY);
}

export async function refreshLiveTelemetry(
  existing: DeviceHardwareProfile
): Promise<DeviceHardwareProfile> {
  const mem = await getMemorySnapshot().catch(() => null);
  const storage = readDiskSpace();
  const totalBytes = mem?.totalBytes || existing.memory.totalBytes;
  const availableBytes = mem?.availableBytes || existing.memory.availableBytes;
  const safeBudgetBytes = computeSafeMemoryBudget({
    platform: existing.platform,
    totalBytes,
    availableBytes,
    appAvailableBytes: mem?.appAvailableBytes,
    lowMemoryThresholdBytes: mem?.lowMemoryThresholdBytes,
    iosIncreasedLimit: existing.platform === 'ios',
  });

  const updated: DeviceHardwareProfile = {
    ...existing,
    capturedAt: Date.now(),
    memory: {
      ...existing.memory,
      totalBytes,
      availableBytes,
      safeBudgetBytes,
      tier: classifyMemoryTier(totalBytes),
    },
    storage,
  };
  runtimeStorage.setJSON(PROFILE_CACHE_KEY, updated);
  return updated;
}

export function saveLlamaBackendProbe(
  info: NonNullable<DeviceHardwareProfile['llamaBackends']>
): void {
  const existing = getCachedHardwareProfile();
  if (!existing) return;
  runtimeStorage.setJSON(PROFILE_CACHE_KEY, {
    ...existing,
    llamaBackends: info,
  });
}
