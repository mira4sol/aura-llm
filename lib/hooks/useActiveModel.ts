import { useMemo } from 'react';

import { useAppStore } from '@/store/app.store';
import { useModelsStore } from '@/store/models.store';
import { useRuntimeStore } from '@/store/runtime.store';

export function useActiveModel() {
  const activeModelId = useAppStore((s) => s.activeModelId);
  const installed = useModelsStore((s) => s.installed);
  const engineState = useRuntimeStore((s) => s.engineState);
  const activeBackend = useRuntimeStore((s) => s.activeBackend);
  const activeContextLength = useRuntimeStore((s) => s.activeContextLength);
  const lastTokensPerSec = useRuntimeStore((s) => s.lastTokensPerSec);
  const loadedCapabilities = useRuntimeStore((s) => s.loadedCapabilities);

  const activeModel = useMemo(
    () => installed.find((m) => m.id === activeModelId) ?? null,
    [installed, activeModelId]
  );

  return {
    activeModel,
    installed,
    engineState,
    activeBackend,
    activeContextLength,
    lastTokensPerSec: lastTokensPerSec ?? activeModel?.benchmark?.tokensPerSec ?? null,
    capabilities:
      loadedCapabilities.length > 0 ? loadedCapabilities : (activeModel?.capabilities ?? []),
  };
}
