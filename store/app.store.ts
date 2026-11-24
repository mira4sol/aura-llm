import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { zustandMMKVStorage } from '@/lib/storage';

export interface InferencePreferences {
  temperature: number;
  topP: number;
  maxTokens: number;
  nCtxOverride: number | null;
  enableThinking: boolean;
  enableHexagonNpu: boolean;
  wifiOnlyDownloads: boolean;
  trustedPublishersOnly: boolean;
  autoReadAloud: boolean;
  webSearchEnabled: boolean;
  notificationsEnabled: boolean;
}

interface AppState {
  hasCompletedOnboarding: boolean;
  userName: string;
  /** Dynamic model ID (repoId::quant) selected during onboarding or active in chat */
  selectedStarterModelId: string | null;
  activeModelId: string | null;
  activeSttModelId: string | null;
  activeTtsModelId: string | null;
  bundleVoiceEngine: boolean;
  preferences: InferencePreferences;

  setUserName: (name: string) => void;
  setSelectedStarterModelId: (modelId: string | null) => void;
  setActiveModelId: (modelId: string | null) => void;
  setActiveSttModelId: (modelId: string | null) => void;
  setActiveTtsModelId: (modelId: string | null) => void;
  setBundleVoiceEngine: (enabled: boolean) => void;
  updatePreferences: (patch: Partial<InferencePreferences>) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
}

const DEFAULT_PREFERENCES: InferencePreferences = {
  temperature: 0.7,
  topP: 0.9,
  maxTokens: 1024,
  nCtxOverride: null,
  enableThinking: false,
  enableHexagonNpu: false,
  wifiOnlyDownloads: false,
  trustedPublishersOnly: true,
  autoReadAloud: false,
  webSearchEnabled: false,
  notificationsEnabled: true,
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      userName: '',
      selectedStarterModelId: null,
      activeModelId: null,
      activeSttModelId: null,
      activeTtsModelId: null,
      bundleVoiceEngine: true,
      preferences: DEFAULT_PREFERENCES,

      setUserName: (name) => set({ userName: name }),
      setSelectedStarterModelId: (modelId) => set({ selectedStarterModelId: modelId }),
      setActiveModelId: (modelId) => set({ activeModelId: modelId }),
      setActiveSttModelId: (modelId) => set({ activeSttModelId: modelId }),
      setActiveTtsModelId: (modelId) => set({ activeTtsModelId: modelId }),
      setBundleVoiceEngine: (enabled) => set({ bundleVoiceEngine: enabled }),
      updatePreferences: (patch) =>
        set((state) => ({ preferences: { ...state.preferences, ...patch } })),
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
      resetOnboarding: () => set({ hasCompletedOnboarding: false }),
    }),
    {
      name: 'aura-app-store',
      version: 2,
      storage: createJSONStorage(() => zustandMMKVStorage),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<AppState>;
        return {
          ...currentState,
          ...persisted,
          preferences: {
            ...DEFAULT_PREFERENCES,
            ...(persisted.preferences ?? {}),
          },
        };
      },
      migrate: (persistedState: unknown, version: number) => {
        const s = (persistedState ?? {}) as Record<string, unknown>;
        if (version < 2) {
          return {
            hasCompletedOnboarding: Boolean(s.hasCompletedOnboarding),
            userName: typeof s.userName === 'string' ? s.userName : '',
            selectedStarterModelId: null,
            activeModelId: null,
            activeSttModelId: null,
            activeTtsModelId: null,
            bundleVoiceEngine:
              typeof s.bundleVoiceEngine === 'boolean' ? s.bundleVoiceEngine : true,
            preferences: DEFAULT_PREFERENCES,
          };
        }
        return persistedState as AppState;
      },
    }
  )
);
