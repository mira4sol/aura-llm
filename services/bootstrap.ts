import { getDatabase } from '@/lib/db/database';
import { createAccelerationPlan } from '@/lib/hardware/accelerationPlanner';
import { collectHardwareProfile } from '@/lib/hardware/hardwareProfiler';
import { useAppStore } from '@/store/app.store';
import { useRuntimeStore } from '@/store/runtime.store';
import { chatService } from './chat/chatService';
import { downloadService } from './downloads/downloadService';
import { modelLoadSentinel } from './inference/modelLoadSentinel';
import { npuSentinel } from './inference/npuSentinel';
import { registerAuxContextReleaser, runtimeHygiene } from './inference/runtimeHygiene';
import { catalogService } from './models/catalogService';
import { modelRegistry } from './models/modelRegistry';
import { notificationService } from './notifications/notificationService';
import { voiceService } from './voice/voiceService';

let bootstrapPromise: Promise<void> | null = null;

/**
 * Deterministic startup sequence for Aura OS:
 * 1. SQLite migrations
 * 2. Real device hardware profiling + crash-safe Hexagon NPU sentinel check
 * 3. Local notification channels & listeners
 * 4. Background download queue re-attachment & orphan temp cleanup
 * 5. Installed model registry & offline SQLite catalog hydration
 * 6. Conversation history hydration & runtime hygiene listeners
 */
export function bootstrapAuraServices(): Promise<void> {
  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = (async () => {
    await getDatabase();

    const hardware = await collectHardwareProfile();
    const fp = `${hardware.deviceIdentifier ?? hardware.deviceModel}-${hardware.osVersion}`;
    npuSentinel.checkAndRecoverOnStartup(fp);
    modelLoadSentinel.checkAndRecoverOnStartup();

    const prefs = useAppStore.getState().preferences;
    const plan = createAccelerationPlan(hardware, {
      enableHexagonOptIn: prefs.enableHexagonNpu,
      hexagonBlacklisted: npuSentinel.isBlacklisted(fp),
    });
    useRuntimeStore.getState().setHardware(hardware, plan);

    await notificationService.init();
    await modelRegistry.hydrate();
    await downloadService.init();
    await catalogService.hydrateFromCache();
    await chatService.hydrateConversations();

    registerAuxContextReleaser(() => voiceService.releaseAll());
    runtimeHygiene.start();

    useRuntimeStore.getState().setBootstrapped(true);

    // Background-refresh catalog silently if cache is empty
    if (useModelsStoreCheckEmpty()) {
      void catalogService.syncCatalog();
    }
  })().catch(() => {
    useRuntimeStore.getState().setBootstrapped(true);
  });

  return bootstrapPromise;
}

function useModelsStoreCheckEmpty(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useModelsStore } = require('@/store/models.store');
  return (useModelsStore.getState().catalog?.length ?? 0) === 0;
}
