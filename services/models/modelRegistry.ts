import { File } from 'expo-file-system';

import { installedModelsRepo } from '@/lib/db/installedModelsRepo';
import type { InstalledModel, ModelCapability } from '@/lib/types';
import { inferenceService } from '@/services/inference/inferenceService';
import { modelLoadSentinel } from '@/services/inference/modelLoadSentinel';
import { useAppStore } from '@/store/app.store';
import { useModelsStore } from '@/store/models.store';

function fileExistsQuietly(uri: string): boolean {
  try {
    return new File(uri).exists;
  } catch {
    return true;
  }
}

export const modelRegistry = {
  async hydrate(): Promise<InstalledModel[]> {
    const models = await installedModelsRepo.listAll();
    // Filter out any entries whose weight files were manually evicted by OS
    const valid: InstalledModel[] = [];
    for (const m of models) {
      const allExist = m.files.every((f) => fileExistsQuietly(f.localPath));
      if (allExist) {
        valid.push(m);
      } else {
        await installedModelsRepo.remove(m.id);
      }
    }

    useModelsStore.getState().setInstalled(valid);

    // Ensure activeModelId still points to an installed model
    const app = useAppStore.getState();
    if (app.activeModelId && !valid.some((m) => m.id === app.activeModelId)) {
      const fallback = valid.find((m) => m.capabilities.includes('text'));
      app.setActiveModelId(fallback?.id ?? null);
    } else if (!app.activeModelId) {
      const firstText = valid.find((m) => m.capabilities.includes('text'));
      if (firstText) app.setActiveModelId(firstText.id);
    }

    return valid;
  },

  async activateModel(modelId: string): Promise<void> {
    const installed = useModelsStore.getState().installed.find((m) => m.id === modelId);
    if (!installed) throw new Error('Model is not installed.');

    const app = useAppStore.getState();
    if (installed.capabilities.includes('audio_stt') && !installed.capabilities.includes('text')) {
      app.setActiveSttModelId(modelId);
      return;
    }
    if (installed.capabilities.includes('voice_tts') && !installed.capabilities.includes('text')) {
      app.setActiveTtsModelId(modelId);
      return;
    }

    app.setActiveModelId(modelId);
    await inferenceService.ensureLoaded(modelId);
  },

  async deleteModel(modelId: string): Promise<void> {
    const installed = useModelsStore.getState().installed.find((m) => m.id === modelId);
    if (!installed) return;

    if (inferenceService.getLoadedHandle()?.modelId === modelId) {
      await inferenceService.unload();
    }

    for (const f of installed.files) {
      try {
        const file = new File(f.localPath);
        if (file.exists) file.delete();
      } catch {
        // ignore
      }
    }

    await installedModelsRepo.remove(modelId);
    modelLoadSentinel.clearRecord(modelId);
    useModelsStore.getState().removeInstalled(modelId);

    const app = useAppStore.getState();
    if (app.activeModelId === modelId) {
      const next = useModelsStore
        .getState()
        .installed.find((m) => m.capabilities.includes('text'));
      app.setActiveModelId(next?.id ?? null);
    }
    if (app.activeSttModelId === modelId) app.setActiveSttModelId(null);
    if (app.activeTtsModelId === modelId) app.setActiveTtsModelId(null);
  },

  findInstalledByCapability(cap: ModelCapability): InstalledModel[] {
    return useModelsStore.getState().installed.filter((m) => m.capabilities.includes(cap));
  },
};
