import { AppState, type AppStateStatus } from 'react-native';

import { addMemoryPressureListener, addThermalListener } from '@/modules/aura-native';
import { crashLogger } from '@/lib/diagnostics/crashLogger';
import { createAccelerationPlan } from '@/lib/hardware/accelerationPlanner';
import { refreshLiveTelemetry } from '@/lib/hardware/hardwareProfiler';
import { useAppStore } from '@/store/app.store';
import { useRuntimeStore } from '@/store/runtime.store';
import { inferenceService } from './inferenceService';
import { npuSentinel } from './npuSentinel';

const BACKGROUND_UNLOAD_DELAY_MS = 60_000;

let started = false;
let bgTimer: ReturnType<typeof setTimeout> | null = null;
let auxReleaseCallback: (() => Promise<void>) | null = null;

export function registerAuxContextReleaser(cb: () => Promise<void>): void {
  auxReleaseCallback = cb;
}

/**
 * Manages mobile runtime hygiene:
 * - Stops GPU/NPU generation cleanly when app enters background (prevents iOS Metal crash)
 * - Releases LLM context after 60s in background or on critical OS memory warnings
 * - Releases auxiliary voice contexts (Whisper/TTS) on moderate memory pressure
 * - Reacts to OS thermal throttling by updating AccelerationPlan & pausing on critical heat
 */
export const runtimeHygiene = {
  start(): void {
    if (started) return;
    started = true;

    AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        crashLogger.markCleanBackground();
        if (inferenceService.isGenerating()) {
          void inferenceService.stop('background');
        }
        if (state === 'background' && !bgTimer) {
          bgTimer = setTimeout(() => {
            bgTimer = null;
            void inferenceService.unload();
            void auxReleaseCallback?.();
          }, BACKGROUND_UNLOAD_DELAY_MS);
        }
      } else if (state === 'active') {
        if (bgTimer) {
          clearTimeout(bgTimer);
          bgTimer = null;
        }
        const hw = useRuntimeStore.getState().hardware;
        if (hw) {
          void refreshLiveTelemetry(hw).then((fresh) => {
            const prefs = useAppStore.getState().preferences;
            const fp = `${fresh.deviceIdentifier ?? fresh.deviceModel}-${fresh.osVersion}`;
            const plan = createAccelerationPlan(fresh, {
              enableHexagonOptIn: prefs.enableHexagonNpu,
              hexagonBlacklisted: npuSentinel.isBlacklisted(fp),
            });
            useRuntimeStore.getState().setHardware(fresh, plan);
          });
        }
      }
    });

    addMemoryPressureListener((level) => {
      crashLogger.setBreadcrumb({ lastMemoryPressure: level });
      if (level === 'warning') {
        void auxReleaseCallback?.();
      } else if (level === 'critical') {
        crashLogger.record({
          source: 'memory_pressure',
          fatal: false,
          message: 'OS critical memory pressure — unloading local AI contexts to prevent OOM kill',
        });
        if (inferenceService.isGenerating()) {
          void inferenceService.stop('background');
        }
        void auxReleaseCallback?.();
        void inferenceService.unload();
      }
    });

    addThermalListener((thermal) => {
      useRuntimeStore.getState().setThermalState(thermal);
      const hw = useRuntimeStore.getState().hardware;
      if (hw) {
        const prefs = useAppStore.getState().preferences;
        const fp = `${hw.deviceIdentifier ?? hw.deviceModel}-${hw.osVersion}`;
        const plan = createAccelerationPlan(
          { ...hw, thermal },
          {
            enableHexagonOptIn: prefs.enableHexagonNpu,
            hexagonBlacklisted: npuSentinel.isBlacklisted(fp),
            thermalOverride: thermal,
          }
        );
        useRuntimeStore.getState().setHardware({ ...hw, thermal }, plan);
      }
      if (thermal === 'critical' && inferenceService.isGenerating()) {
        void inferenceService.stop('limit');
      }
    });
  },
};
