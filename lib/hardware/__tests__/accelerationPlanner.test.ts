import { createAccelerationPlan } from '../accelerationPlanner';
import { classifyMemoryTier, computeSafeMemoryBudget } from '../memoryBudget';
import type { DeviceHardwareProfile } from '@/lib/types';

const GB = 1024 * 1024 * 1024;

function makeProfile(overrides: Partial<DeviceHardwareProfile>): DeviceHardwareProfile {
  return {
    capturedAt: Date.now(),
    platform: 'android',
    osVersion: 'Android 15',
    deviceModel: 'Test Phone',
    deviceIdentifier: 'TEST',
    soc: { vendor: 'unknown', model: null, marketingName: null },
    cpu: {
      abi: 'arm64-v8a',
      totalCores: 8,
      clusters: [
        { maxFreqMHz: 3200, cores: 4 },
        { maxFreqMHz: 2000, cores: 4 },
      ],
      performanceCores: 4,
      features: { neon: true, fp16: true, dotprod: true, i8mm: true, sve: false, sme: false },
    },
    gpu: { name: null, metal: false, opencl: false },
    npu: { appleNeuralEngine: false, hexagon: false },
    memory: {
      totalBytes: 12 * GB,
      availableBytes: 8 * GB,
      safeBudgetBytes: 6.5 * GB,
      tier: 'gt12',
    },
    storage: { freeBytes: 80 * GB, totalBytes: 256 * GB },
    thermal: 'nominal',
    ...overrides,
  };
}

describe('accelerationPlanner', () => {
  it('dispatches Apple Silicon iOS devices to Metal GPU + Core ML ANE', () => {
    const profile = makeProfile({
      platform: 'ios',
      osVersion: 'iOS 18.2',
      soc: { vendor: 'apple', model: 'Apple A17 Pro', marketingName: 'Apple A17 Pro' },
      gpu: { name: 'Apple A17 Pro GPU', metal: true, metalFamily: 'Apple9', opencl: false },
      npu: { appleNeuralEngine: true, hexagon: false },
      memory: { totalBytes: 8 * GB, availableBytes: 5.5 * GB, safeBudgetBytes: 5 * GB, tier: '8to12' },
    });

    const plan = createAccelerationPlan(profile);
    expect(plan.primary).toBe('metal');
    expect(plan.nGpuLayers).toBe(99);
    expect(plan.whisper.useCoreMLIos).toBe(true);
    expect(plan.kvCacheType).toBe('f16');
  });

  it('dispatches Snapdragon Adreno 750 to OpenCL by default, and Hexagon HTP0 when opted in', () => {
    const profile = makeProfile({
      soc: { vendor: 'qualcomm', model: 'SM8650', marketingName: 'Snapdragon 8 Gen 3' },
      gpu: { name: 'Adreno (TM) 750', metal: false, opencl: true, adrenoGeneration: 7 },
      npu: { appleNeuralEngine: false, hexagon: true },
    });

    const defaultPlan = createAccelerationPlan(profile);
    expect(defaultPlan.primary).toBe('opencl');
    expect(defaultPlan.fallbacks).toContain('cpu');

    const htpPlan = createAccelerationPlan(profile, { enableHexagonOptIn: true });
    expect(htpPlan.primary).toBe('hexagon');
    expect(htpPlan.devices).toEqual(['HTP0']);
    expect(htpPlan.fallbacks).toEqual(['opencl', 'cpu']);

    const blacklistedPlan = createAccelerationPlan(profile, {
      enableHexagonOptIn: true,
      hexagonBlacklisted: true,
    });
    expect(blacklistedPlan.primary).toBe('opencl');
  });

  it('keeps older Adreno 6xx, MediaTek, Exynos, and Google Tensor on performance-core NEON CPU', () => {
    const adreno6 = createAccelerationPlan(
      makeProfile({
        soc: { vendor: 'qualcomm', model: 'SM7325', marketingName: 'Snapdragon 778G' },
        gpu: { name: 'Adreno 642L', metal: false, opencl: true, adrenoGeneration: 6 },
      })
    );
    expect(adreno6.primary).toBe('cpu');

    for (const vendor of ['mediatek', 'samsung', 'google'] as const) {
      const plan = createAccelerationPlan(
        makeProfile({
          soc: { vendor, model: vendor.toUpperCase(), marketingName: vendor },
          cpu: {
            abi: 'arm64-v8a',
            totalCores: 8,
            clusters: [
              { maxFreqMHz: 3250, cores: 4 },
              { maxFreqMHz: 2000, cores: 4 },
            ],
            performanceCores: 4,
            features: { neon: true, fp16: true, dotprod: true, i8mm: true, sve: false, sme: false },
          },
        })
      );
      expect(plan.primary).toBe('cpu');
      expect(plan.nGpuLayers).toBe(0);
      expect(plan.nThreads).toBe(4);
    }
  });

  it('reserves at least 2 CPU cores for UI/JS/Audio on 8-core devices even when all cores report as performance', () => {
    const mt6878 = createAccelerationPlan(
      makeProfile({
        soc: { vendor: 'mediatek', model: 'MT6878', marketingName: 'MT6878' },
        cpu: {
          abi: 'arm64-v8a',
          totalCores: 8,
          clusters: [{ maxFreqMHz: 2500, cores: 8 }],
          performanceCores: 8,
          features: { neon: true, fp16: true, dotprod: true, i8mm: false, sve: false, sme: false },
        },
      })
    );
    expect(mt6878.primary).toBe('cpu');
    expect(mt6878.nThreads).toBe(4);
  });

  it('throttles CPU threads when device thermal state is serious', () => {
    const plan = createAccelerationPlan(
      makeProfile({
        soc: { vendor: 'google', model: 'Tensor G4', marketingName: 'Tensor G4' },
        cpu: {
          abi: 'arm64-v8a',
          totalCores: 8,
          clusters: [{ maxFreqMHz: 3100, cores: 6 }],
          performanceCores: 6,
          features: { neon: true, fp16: true, dotprod: true, i8mm: true, sve: false, sme: false },
        },
        thermal: 'serious',
      })
    );
    expect(plan.nThreads).toBe(2);
  });

  it('forces safe CPU execution on both iOS Simulator and Android Emulator', () => {
    const iosSim = createAccelerationPlan(
      makeProfile({
        platform: 'ios',
        soc: { vendor: 'apple', model: 'Apple iOS simulator', marketingName: 'Apple iOS simulator' },
        gpu: { name: 'Apple iOS simulator GPU', metal: true, opencl: false },
      })
    );
    expect(iosSim.primary).toBe('cpu');
    expect(iosSim.nGpuLayers).toBe(0);

    const androidEmu = createAccelerationPlan(
      makeProfile({
        platform: 'android',
        deviceModel: 'sdk_gphone64_arm64',
        soc: { vendor: 'qualcomm', model: 'ranchu', marketingName: 'ranchu' },
        gpu: { name: 'Adreno (TM) 750', metal: false, opencl: true, adrenoGeneration: 7 },
      })
    );
    expect(androidEmu.primary).toBe('cpu');
    expect(androidEmu.nGpuLayers).toBe(0);
  });
});

describe('memoryBudget', () => {
  it('computes safe memory ceilings and tiers accurately', () => {
    expect(classifyMemoryTier(6 * GB)).toBe('6to8');
    expect(classifyMemoryTier(12 * GB)).toBe('gt12');

    const iosBudget = computeSafeMemoryBudget({
      platform: 'ios',
      totalBytes: 8 * GB,
      availableBytes: 5 * GB,
      appAvailableBytes: 5 * GB,
      iosIncreasedLimit: true,
    });
    expect(iosBudget).toBeLessThan(5 * GB);
    expect(iosBudget).toBeGreaterThan(4 * GB);

    const androidBudget = computeSafeMemoryBudget({
      platform: 'android',
      totalBytes: 12 * GB,
      availableBytes: 7 * GB,
      lowMemoryThresholdBytes: 256 * 1024 * 1024,
    });
    expect(androidBudget).toBeLessThanOrEqual(7 * GB);
    expect(androidBudget).toBeGreaterThan(5 * GB);
  });
});
