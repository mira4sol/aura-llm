import type {
  AccelerationPlan,
  AcceleratorBackend,
  DeviceHardwareProfile,
  ThermalState,
} from '@/lib/types';

export interface PlanOptions {
  enableHexagonOptIn?: boolean;
  hexagonBlacklisted?: boolean;
  thermalOverride?: ThermalState;
}

const GB = 1024 * 1024 * 1024;

/**
 * Pure, deterministic planner mapping a DeviceHardwareProfile to an AccelerationPlan
 * across Apple Silicon, Snapdragon (Adreno 700+ & Hexagon), MediaTek, Exynos, and Google Tensor.
 */
export function createAccelerationPlan(
  profile: DeviceHardwareProfile,
  options: PlanOptions = {}
): AccelerationPlan {
  const rationale: string[] = [];
  const thermal = options.thermalOverride ?? profile.thermal;
  const totalRamGb = profile.memory.totalBytes / GB;

  // Reserve at least 2 physical cores for OS UI, React Native JS thread, and Audio/TTS
  // so touch events, Speak, Copy, and scrolling stay responsive during CPU inference.
  const totalCores = Math.max(2, profile.cpu.totalCores || profile.cpu.performanceCores || 4);
  const maxInteractiveCpuThreads = totalCores >= 10 ? 6 : 4;
  const headroomCap = Math.max(2, Math.min(maxInteractiveCpuThreads, totalCores - 2));
  let nThreads = Math.max(2, Math.min(headroomCap, profile.cpu.performanceCores || 4));
  if (thermal === 'serious' || thermal === 'critical') {
    nThreads = Math.max(2, Math.floor(nThreads / 2));
    rationale.push(`Thermal state "${thermal}": throttled CPU threads to ${nThreads}`);
  }

  // KV cache quantization: f16 when plenty of RAM (>= 8 GB), q8_0 otherwise, q4_0 on <4 GB
  const kvCacheType: AccelerationPlan['kvCacheType'] =
    totalRamGb >= 8 ? 'f16' : totalRamGb >= 4 ? 'q8_0' : 'q4_0';

  // Detect simulators/emulators on both iOS & Android — GPU offload is unstable there
  const hwText = `${profile.soc.model ?? ''} ${profile.gpu.name ?? ''} ${profile.deviceModel}`.toLowerCase();
  const isVirtualDevice =
    hwText.includes('simulator') ||
    hwText.includes('emulator') ||
    hwText.includes('goldfish') ||
    hwText.includes('ranchu') ||
    hwText.includes('sdk_gphone');

  // 1. iOS — Apple A-series / M-series
  if (profile.platform === 'ios' && profile.gpu.metal && !isVirtualDevice) {
    rationale.push(
      `Apple Silicon (${profile.soc.model ?? 'Metal'}) detected: offloading all layers to Metal GPU`
    );
    if (profile.npu.appleNeuralEngine) {
      rationale.push('Apple Neural Engine (Core ML) enabled for Whisper encoder');
    }
    return {
      primary: 'metal',
      fallbacks: ['cpu'],
      nGpuLayers: 99,
      nThreads: Math.max(2, Math.min(6, nThreads)),
      flashAttn: 'auto',
      kvCacheType: totalRamGb >= 8 ? 'f16' : 'q8_0',
      useMmap: true,
      useMlock: false,
      whisper: {
        useGpu: true,
        useCoreMLIos: profile.npu.appleNeuralEngine,
        nThreads: Math.max(2, Math.min(4, nThreads)),
      },
      rationale,
    };
  }

  // 2. Android — Qualcomm Snapdragon (Adreno 700+ OpenCL + opt-in Hexagon HTP)
  if (profile.soc.vendor === 'qualcomm' && !isVirtualDevice) {
    const adrenoGen = profile.gpu.adrenoGeneration ?? 0;
    const hasOpenCL700Plus = profile.gpu.opencl && adrenoGen >= 7;
    const canTryHexagon =
      Boolean(options.enableHexagonOptIn) &&
      !options.hexagonBlacklisted &&
      profile.npu.hexagon;

    if (canTryHexagon) {
      const fallbacks: AcceleratorBackend[] = hasOpenCL700Plus ? ['opencl', 'cpu'] : ['cpu'];
      rationale.push('Qualcomm Hexagon NPU (HTP0) opt-in enabled with crash-safe fallback');
      return {
        primary: 'hexagon',
        fallbacks,
        nGpuLayers: 99,
        devices: ['HTP0'],
        nThreads: Math.min(6, nThreads),
        flashAttn: 'auto',
        kvCacheType: kvCacheType === 'f16' ? 'q8_0' : kvCacheType,
        useMmap: true,
        useMlock: false,
        whisper: {
          useGpu: false,
          useCoreMLIos: false,
          nThreads: Math.min(4, nThreads),
        },
        rationale,
      };
    }

    if (hasOpenCL700Plus) {
      rationale.push(
        `Qualcomm Adreno ${adrenoGen}xx + OpenCL detected: offloading layers to Adreno GPU`
      );
      return {
        primary: 'opencl',
        fallbacks: ['cpu'],
        nGpuLayers: 99,
        nThreads: Math.min(6, nThreads),
        flashAttn: 'auto',
        kvCacheType: kvCacheType === 'f16' ? 'q8_0' : kvCacheType,
        useMmap: true,
        useMlock: false,
        whisper: {
          useGpu: false,
          useCoreMLIos: false,
          nThreads: Math.min(4, nThreads),
        },
        rationale,
      };
    }

    rationale.push(
      `Qualcomm SoC (${profile.soc.model ?? 'Snapdragon'}) without Adreno 700+ OpenCL: using ARM NEON CPU`
    );
  }

  // 3. Android — MediaTek Dimensity / Samsung Exynos / Google Tensor / Generic ARM64
  const featFlags: string[] = [];
  if (profile.cpu.features.dotprod) featFlags.push('dotprod');
  if (profile.cpu.features.i8mm) featFlags.push('i8mm');
  if (profile.cpu.features.fp16) featFlags.push('fp16');

  const hasFastNeon = profile.cpu.features.dotprod || profile.cpu.features.i8mm;
  if (profile.soc.vendor === 'mediatek') {
    rationale.push(
      `MediaTek (${profile.soc.model ?? 'Dimensity'}): using ${nThreads} performance-core ARM NEON threads (${featFlags.join(', ') || 'base'})`
    );
  } else if (profile.soc.vendor === 'samsung') {
    rationale.push(
      `Samsung Exynos (${profile.soc.model ?? 'Exynos'}): using ${nThreads} performance-core ARM NEON threads (${featFlags.join(', ') || 'base'})`
    );
  } else if (profile.soc.vendor === 'google') {
    rationale.push(
      `Google Tensor (${profile.soc.model ?? 'Tensor'}): using ${nThreads} big/mid ARM NEON threads (${featFlags.join(', ') || 'base'})`
    );
  } else if (rationale.length === 0) {
    rationale.push(
      `CPU execution pinned to ${nThreads} performance cores (${featFlags.join(', ') || 'ARMv8'})`
    );
  }

  return {
    primary: 'cpu',
    fallbacks: [],
    nGpuLayers: 0,
    nThreads,
    flashAttn: hasFastNeon ? 'auto' : 'off',
    kvCacheType: hasFastNeon ? (kvCacheType === 'f16' ? 'q8_0' : kvCacheType) : 'f16',
    useMmap: true,
    useMlock: false,
    whisper: {
      useGpu: false,
      useCoreMLIos: false,
      nThreads: Math.max(2, Math.min(4, nThreads)),
    },
    rationale,
  };
}
