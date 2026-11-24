export type SocVendor = 'apple' | 'qualcomm' | 'mediatek' | 'samsung' | 'google' | 'unknown';
export type AcceleratorBackend = 'metal' | 'opencl' | 'hexagon' | 'cpu';
export type ThermalState = 'nominal' | 'fair' | 'serious' | 'critical';
export type MemoryTier = 'lt4' | '4to6' | '6to8' | '8to12' | 'gt12';

export interface CpuCluster {
  maxFreqMHz: number;
  cores: number;
}

export interface CpuFeatures {
  neon: boolean;
  fp16: boolean;
  dotprod: boolean;
  i8mm: boolean;
  sve: boolean;
  sme: boolean;
}

export interface DeviceHardwareProfile {
  capturedAt: number;
  platform: 'ios' | 'android';
  osVersion: string;
  deviceModel: string;
  deviceIdentifier: string | null;
  soc: {
    vendor: SocVendor;
    model: string | null;
    marketingName: string | null;
  };
  cpu: {
    abi: string;
    totalCores: number;
    clusters: CpuCluster[];
    performanceCores: number;
    features: CpuFeatures;
  };
  gpu: {
    name: string | null;
    metal: boolean;
    metalFamily?: string;
    opencl: boolean;
    vulkanVersion?: string;
    adrenoGeneration?: number;
  };
  npu: {
    appleNeuralEngine: boolean;
    hexagon: boolean;
    hexagonArch?: string;
  };
  memory: {
    totalBytes: number;
    availableBytes: number;
    safeBudgetBytes: number;
    tier: MemoryTier;
  };
  storage: {
    freeBytes: number;
    totalBytes: number;
  };
  thermal: ThermalState;
  llamaBackends?: {
    devices: string[];
    gpuAvailable: boolean;
    reasonNoGPU?: string;
  };
}

export interface AccelerationPlan {
  primary: AcceleratorBackend;
  fallbacks: AcceleratorBackend[];
  nGpuLayers: number;
  devices?: string[];
  nThreads: number;
  flashAttn: 'auto' | 'on' | 'off';
  kvCacheType: 'f16' | 'q8_0' | 'q4_0';
  useMmap: boolean;
  useMlock: boolean;
  whisper: {
    useGpu: boolean;
    useCoreMLIos: boolean;
    nThreads: number;
  };
  rationale: string[];
}
