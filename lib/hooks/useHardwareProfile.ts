import { useCallback, useEffect } from 'react';

import { createAccelerationPlan } from '@/lib/hardware/accelerationPlanner';
import { collectHardwareProfile, refreshLiveTelemetry } from '@/lib/hardware/hardwareProfiler';
import { npuSentinel } from '@/services/inference/npuSentinel';
import { useAppStore } from '@/store/app.store';
import { useRuntimeStore } from '@/store/runtime.store';

export function useHardwareProfile() {
  const hardware = useRuntimeStore((s) => s.hardware);
  const accelerationPlan = useRuntimeStore((s) => s.accelerationPlan);
  const thermalState = useRuntimeStore((s) => s.thermalState);
  const enableHexagonNpu = useAppStore((s) => s.preferences.enableHexagonNpu);

  const refresh = useCallback(async () => {
    const current = useRuntimeStore.getState().hardware;
    const fresh = current ? await refreshLiveTelemetry(current) : await collectHardwareProfile();
    const fp = `${fresh.deviceIdentifier ?? fresh.deviceModel}-${fresh.osVersion}`;
    const plan = createAccelerationPlan(fresh, {
      enableHexagonOptIn: enableHexagonNpu,
      hexagonBlacklisted: npuSentinel.isBlacklisted(fp),
    });
    useRuntimeStore.getState().setHardware(fresh, plan);
  }, [enableHexagonNpu]);

  useEffect(() => {
    if (!hardware) {
      void refresh();
    }
  }, [hardware, refresh]);

  return { hardware, accelerationPlan, thermalState, refresh };
}
