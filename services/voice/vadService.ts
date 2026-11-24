import { Platform } from 'react-native';

import { useModelsStore } from '@/store/models.store';

interface WhisperVadContextLike {
  release: () => Promise<void>;
}

let vadContext: WhisperVadContextLike | null = null;

export const vadService = {
  async ensureVadContext(): Promise<WhisperVadContextLike | null> {
    if (vadContext) return vadContext;

    // Look for a downloaded Silero VAD file in any installed STT bundle
    const installed = useModelsStore.getState().installed;
    let vadPath: string | null = null;
    for (const m of installed) {
      const f = m.files.find((file) => file.role === 'vad');
      if (f) {
        vadPath = f.localPath;
        break;
      }
    }
    if (!vadPath) return null;

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const whisper = require('whisper.rn');
      if (!whisper.initWhisperVad) return null;
      vadContext = await whisper.initWhisperVad({
        filePath: vadPath,
        useGpu: Platform.OS === 'ios',
        nThreads: 2,
      });
      return vadContext;
    } catch {
      return null;
    }
  },

  async release(): Promise<void> {
    if (!vadContext) return;
    const ctx = vadContext;
    vadContext = null;
    await ctx.release().catch(() => {});
  },
};
