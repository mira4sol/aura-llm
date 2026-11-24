import { Platform } from 'react-native';

import type { InstalledModel } from '@/lib/types';
import { useAppStore } from '@/store/app.store';
import { useModelsStore } from '@/store/models.store';
import { useRuntimeStore } from '@/store/runtime.store';
import { vadService } from './vadService';

export interface DictationCallbacks {
  onPartial: (text: string) => void;
  onFinal: (text: string) => void;
  onLevel?: (rms: number) => void;
  onError?: (message: string) => void;
}

export interface DictationSession {
  stop: () => Promise<string>;
}

interface WhisperContextLike {
  release: () => Promise<void>;
}

let whisperCtx: WhisperContextLike | null = null;
let loadedWhisperModelId: string | null = null;

function findActiveSttModel(): InstalledModel | null {
  const activeId = useAppStore.getState().activeSttModelId;
  const installed = useModelsStore.getState().installed;
  if (activeId) {
    const exact = installed.find((m) => m.id === activeId);
    if (exact) return exact;
  }
  return installed.find((m) => m.capabilities.includes('audio_stt')) ?? null;
}

export const sttService = {
  getActiveModel(): InstalledModel | null {
    return findActiveSttModel();
  },

  async ensureWhisperLoaded(model: InstalledModel): Promise<WhisperContextLike> {
    if (whisperCtx && loadedWhisperModelId === model.id) return whisperCtx;
    await this.release();

    const weight = model.files.find((f) => f.role === 'weights');
    if (!weight) throw new Error('STT model weight file missing.');

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const whisper = require('whisper.rn');
    const plan = useRuntimeStore.getState().accelerationPlan;

    whisperCtx = await whisper.initWhisper({
      filePath: weight.localPath,
      useGpu: plan?.whisper.useGpu ?? Platform.OS === 'ios',
      useCoreMLIos: plan?.whisper.useCoreMLIos ?? Platform.OS === 'ios',
    });
    loadedWhisperModelId = model.id;
    return whisperCtx!;
  },

  async startRealtimeDictation(callbacks: DictationCallbacks): Promise<DictationSession> {
    const model = findActiveSttModel();
    if (!model) {
      throw new Error(
        'No offline speech-to-text model installed. Download a Whisper or Parakeet model in the Models Vault.'
      );
    }

    let latestTranscript = '';

    if (model.runtime === 'whisper.rn') {
      const ctx = await this.ensureWhisperLoaded(model);
      const vadCtx = await vadService.ensureVadContext();

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { RealtimeTranscriber } = require('whisper.rn/realtime-transcription/RealtimeTranscriber');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { AudioPcmStreamAdapter } = require('whisper.rn/realtime-transcription/adapters/AudioPcmStreamAdapter');

      const audioStream = new AudioPcmStreamAdapter();
      const transcriber = new RealtimeTranscriber(
        {
          whisperContext: ctx,
          vadContext: vadCtx ?? undefined,
          audioStream,
        },
        {
          audioSliceSec: 25,
          vad: vadCtx
            ? {
                threshold: 0.5,
                minSpeechDurationMs: 250,
                minSilenceDurationMs: 600,
              }
            : undefined,
          transcribeOptions: {
            language: 'en',
          },
        },
        {
          onRealtimeTranscribe: (ev: { result?: string }) => {
            if (ev?.result) {
              latestTranscript = ev.result.trim();
              callbacks.onPartial(latestTranscript);
            }
          },
          onSliceTranscriptionStabilized: (ev: { result?: string }) => {
            if (ev?.result) {
              latestTranscript = ev.result.trim();
              callbacks.onFinal(latestTranscript);
            }
          },
          onError: (err: unknown) => {
            callbacks.onError?.(err instanceof Error ? err.message : String(err));
          },
        }
      );

      await transcriber.start();

      return {
        stop: async () => {
          try {
            await transcriber.stop();
          } catch {
            // ignore
          }
          return latestTranscript;
        },
      };
    }

    // Sherpa-ONNX (Parakeet / streaming transducer) path
    const encoder = model.files.find((f) => f.path.toLowerCase().includes('encoder'));
    const decoder = model.files.find((f) => f.path.toLowerCase().includes('decoder'));
    const tokens = model.files.find((f) => f.role === 'tokens');
    if (!encoder || !decoder || !tokens) {
      throw new Error('Installed ONNX STT bundle is missing encoder/decoder/tokens files.');
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sherpa = require('react-native-sherpa-onnx');
    const recognizer = await sherpa.createOnlineRecognizer?.({
      encoder: encoder.localPath,
      decoder: decoder.localPath,
      tokens: tokens.localPath,
      numThreads: 2,
    });

    if (!recognizer) {
      throw new Error('Sherpa-ONNX streaming recognizer is unavailable in this build.');
    }

    return {
      stop: async () => {
        try {
          await recognizer.destroy?.();
        } catch {
          // ignore
        }
        return latestTranscript;
      },
    };
  },

  async release(): Promise<void> {
    if (whisperCtx) {
      const ctx = whisperCtx;
      whisperCtx = null;
      loadedWhisperModelId = null;
      await ctx.release().catch(() => {});
    }
    await vadService.release();
  },
};
