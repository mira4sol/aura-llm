import { installedModelsRepo } from '@/lib/db/installedModelsRepo';
import { createAccelerationPlan } from '@/lib/hardware/accelerationPlanner';
import { collectHardwareProfile } from '@/lib/hardware/hardwareProfiler';
import type { GenerationTelemetry, InstalledModel, ModelCapability } from '@/lib/types';
import { useAppStore } from '@/store/app.store';
import { useModelsStore } from '@/store/models.store';
import { useRuntimeStore } from '@/store/runtime.store';
import { LlamaRnEngine } from './llmEngine';
import { npuSentinel } from './npuSentinel';
import type { GenerateRequest, LoadedModelHandle, TokenEvent } from './types';

const engine = new LlamaRnEngine();
let opMutex: Promise<unknown> = Promise.resolve();
let activeGeneration = false;

function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
  const next = opMutex.then(fn, fn);
  opMutex = next.catch(() => {});
  return next;
}

export const inferenceService = {
  getLoadedHandle(): LoadedModelHandle | null {
    return engine.loadedHandle;
  },

  isGenerating(): boolean {
    return activeGeneration;
  },

  getActiveCapabilities(): ModelCapability[] {
    if (engine.loadedHandle) return engine.loadedHandle.capabilities;
    const activeId = useAppStore.getState().activeModelId;
    const installed = useModelsStore.getState().installed.find((m) => m.id === activeId);
    return installed?.capabilities ?? [];
  },

  async ensureLoaded(modelId?: string): Promise<LoadedModelHandle> {
    return runExclusive(async () => {
      const targetId = modelId ?? useAppStore.getState().activeModelId;
      if (!targetId) {
        throw new Error('No active local model selected. Install a model in the Models Vault.');
      }

      if (engine.loadedHandle?.modelId === targetId) {
        return engine.loadedHandle;
      }

      const installed =
        useModelsStore.getState().installed.find((m) => m.id === targetId) ??
        (await installedModelsRepo.getById(targetId));

      if (!installed) {
        throw new Error('Selected model is no longer installed on device.');
      }

      return this.loadModelInternal(installed);
    });
  },

  async loadModelInternal(model: InstalledModel): Promise<LoadedModelHandle> {
    const rt = useRuntimeStore.getState();
    rt.setEngineStatus({
      engineState: 'loading',
      engineError: null,
    });

    try {
      const hw = rt.hardware ?? (await collectHardwareProfile());
      const fp = `${hw.deviceIdentifier ?? hw.deviceModel}-${hw.osVersion}`;
      engine.setDeviceFingerprint(fp);

      const prefs = useAppStore.getState().preferences;
      const plan = createAccelerationPlan(hw, {
        enableHexagonOptIn: prefs.enableHexagonNpu,
        hexagonBlacklisted: npuSentinel.isBlacklisted(fp),
        thermalOverride: rt.thermalState,
      });

      const handle = await engine.load(model, plan, {
        nCtx: prefs.nCtxOverride ?? undefined,
      });

      useRuntimeStore.getState().setEngineStatus({
        engineState: 'ready',
        loadedModelId: handle.modelId,
        loadedCapabilities: handle.capabilities,
        activeBackend: handle.backend,
        activeContextLength: handle.nCtx,
        engineError: null,
      });

      return handle;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      useRuntimeStore.getState().setEngineStatus({
        engineState: 'error',
        loadedModelId: null,
        loadedCapabilities: [],
        engineError: message,
      });
      throw err;
    }
  },

  async unload(): Promise<void> {
    return runExclusive(async () => {
      await engine.unload();
      useRuntimeStore.getState().setEngineStatus({
        engineState: 'unloaded',
        loadedModelId: null,
        loadedCapabilities: [],
        activeBackend: null,
      });
    });
  },

  async generate(
    req: GenerateRequest,
    onToken: (ev: TokenEvent) => void
  ): Promise<GenerationTelemetry> {
    if (!engine.loadedHandle) {
      await this.ensureLoaded();
    }
    activeGeneration = true;
    try {
      const telemetry = await engine.generate(req, onToken);
      useRuntimeStore.getState().setEngineStatus({
        lastTokensPerSec: telemetry.tokensPerSec,
      });
      // Record real measured benchmark on the installed model
      if (telemetry.completionTokens >= 8 && telemetry.tokensPerSec > 0) {
        const bench = {
          tokensPerSec: telemetry.tokensPerSec,
          ttftMs: telemetry.ttftMs,
          backend: telemetry.backend,
          measuredAt: Date.now(),
        };
        await installedModelsRepo.recordBenchmark(telemetry.modelId, bench);
        const existing = useModelsStore
          .getState()
          .installed.find((m) => m.id === telemetry.modelId);
        if (existing) {
          useModelsStore.getState().upsertInstalled({
            ...existing,
            lastUsedAt: Date.now(),
            benchmark: bench,
          });
        }
      }
      return telemetry;
    } finally {
      activeGeneration = false;
    }
  },

  async stop(reason: GenerationTelemetry['stoppedBy'] = 'user'): Promise<void> {
    await engine.stop(reason);
  },

  /** Clears native llama.rn KV cache without unloading model weights (instant chat switch). */
  async clearContextCache(): Promise<void> {
    await engine.clearCache();
  },

  /**
   * Non-blocking local title generation using the already-loaded LLM.
   * Skips immediately if a user generation is currently active.
   */
  async generateQuickTitle(userPrompt: string, assistantReply: string): Promise<string> {
    if (activeGeneration || !engine.loadedHandle) return '';
    const snippet = `User: ${userPrompt.slice(0, 260)}\nAssistant: ${assistantReply.slice(0, 260)}`;
    const raw = await engine.quickCompletion(snippet, 22);
    // Clear KV cache after quick side-completion so the titling prompt never leaks into chat
    await engine.clearCache();
    return raw;
  },

  async countTokens(text: string): Promise<number> {
    if (!engine.loadedHandle) {
      return Math.ceil(text.length / 3.6);
    }
    const tokens = await engine.tokenize(text);
    return tokens.length > 0 ? tokens.length : Math.ceil(text.length / 3.6);
  },
};
