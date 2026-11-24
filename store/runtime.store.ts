import { create } from 'zustand';

import type {
  AccelerationPlan,
  AcceleratorBackend,
  DeviceHardwareProfile,
  ModelCapability,
  ThermalState,
} from '@/lib/types';

export type EngineLoadState = 'unloaded' | 'loading' | 'ready' | 'error';

interface RuntimeState {
  hardware: DeviceHardwareProfile | null;
  accelerationPlan: AccelerationPlan | null;
  engineState: EngineLoadState;
  loadedModelId: string | null;
  loadedCapabilities: ModelCapability[];
  activeBackend: AcceleratorBackend | null;
  activeContextLength: number;
  lastTokensPerSec: number | null;
  engineError: string | null;
  thermalState: ThermalState;
  voiceListening: boolean;
  voiceSpeaking: boolean;
  speakingMessageId: string | null;
  voiceTtsEngine: 'sherpa' | 'llama-vocoder' | 'os-fallback' | null;
  bootstrapped: boolean;

  setHardware: (profile: DeviceHardwareProfile, plan: AccelerationPlan) => void;
  setEngineStatus: (patch: {
    engineState?: EngineLoadState;
    loadedModelId?: string | null;
    loadedCapabilities?: ModelCapability[];
    activeBackend?: AcceleratorBackend | null;
    activeContextLength?: number;
    lastTokensPerSec?: number | null;
    engineError?: string | null;
  }) => void;
  setThermalState: (state: ThermalState) => void;
  setVoiceState: (patch: {
    voiceListening?: boolean;
    voiceSpeaking?: boolean;
    speakingMessageId?: string | null;
    voiceTtsEngine?: 'sherpa' | 'llama-vocoder' | 'os-fallback' | null;
  }) => void;
  setBootstrapped: (val: boolean) => void;
}

export const useRuntimeStore = create<RuntimeState>((set) => ({
  hardware: null,
  accelerationPlan: null,
  engineState: 'unloaded',
  loadedModelId: null,
  loadedCapabilities: [],
  activeBackend: null,
  activeContextLength: 4096,
  lastTokensPerSec: null,
  engineError: null,
  thermalState: 'nominal',
  voiceListening: false,
  voiceSpeaking: false,
  speakingMessageId: null,
  voiceTtsEngine: null,
  bootstrapped: false,

  setHardware: (hardware, accelerationPlan) =>
    set({ hardware, accelerationPlan, thermalState: hardware.thermal }),
  setEngineStatus: (patch) => set((state) => ({ ...state, ...patch })),
  setThermalState: (thermalState) => set({ thermalState }),
  setVoiceState: (patch) =>
    set((state) => ({
      ...state,
      ...patch,
      speakingMessageId:
        patch.voiceSpeaking === false
          ? null
          : patch.speakingMessageId !== undefined
            ? patch.speakingMessageId
            : state.speakingMessageId,
    })),
  setBootstrapped: (bootstrapped) => set({ bootstrapped }),
}));
