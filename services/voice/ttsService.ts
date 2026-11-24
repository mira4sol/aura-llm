import * as Speech from 'expo-speech';

import type { InstalledModel } from '@/lib/types';
import { useAppStore } from '@/store/app.store';
import { useModelsStore } from '@/store/models.store';
import { useRuntimeStore } from '@/store/runtime.store';

export type TtsEngineKind = 'sherpa' | 'llama-vocoder' | 'os-fallback';

interface SherpaTtsLike {
  generate: (opts: { text: string; sid?: number; speed?: number }) => Promise<{
    samples: Float32Array | number[];
    sampleRate: number;
  }>;
  destroy?: () => Promise<void>;
}

let sherpaTts: SherpaTtsLike | null = null;
let loadedTtsModelId: string | null = null;
let stopRequested = false;

function findActiveTtsModel(): InstalledModel | null {
  const activeId = useAppStore.getState().activeTtsModelId;
  const installed = useModelsStore.getState().installed;
  if (activeId) {
    const exact = installed.find((m) => m.id === activeId);
    if (exact) return exact;
  }
  return installed.find((m) => m.capabilities.includes('voice_tts')) ?? null;
}

function splitSentences(text: string): string[] {
  const cleaned = text
    .replace(/```[\s\S]*?```/g, ' code block. ')
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/[#*_`>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return [];
  return cleaned
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function playPcmFloatBuffer(samples: Float32Array | number[], sampleRate: number): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { AudioContext } = require('react-native-audio-api');
  const ctx = new AudioContext({ sampleRate });
  const floatData = samples instanceof Float32Array ? samples : new Float32Array(samples);
  const buffer = ctx.createBuffer(1, floatData.length, sampleRate);
  buffer.copyToChannel(floatData, 0);

  await new Promise<void>((resolve) => {
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.onEnded = () => {
      void ctx.close?.();
      resolve();
    };
    src.start();
  });
}

export const ttsService = {
  getEngineKind(): TtsEngineKind {
    const model = findActiveTtsModel();
    if (!model) return 'os-fallback';
    return model.runtime === 'sherpa-onnx' ? 'sherpa' : 'llama-vocoder';
  },

  async speak(text: string): Promise<void> {
    await this.stop();
    stopRequested = false;

    const sentences = splitSentences(text);
    if (sentences.length === 0) return;

    const model = findActiveTtsModel();
    const rt = useRuntimeStore.getState();

    // 1. Offline Neural TTS via Sherpa-ONNX (Kokoro / Piper)
    if (model && model.runtime === 'sherpa-onnx') {
      rt.setVoiceState({ voiceSpeaking: true, voiceTtsEngine: 'sherpa' });
      try {
        if (!sherpaTts || loadedTtsModelId !== model.id) {
          await this.release();
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const sherpa = require('react-native-sherpa-onnx');
          const onnx = model.files.find((f) => f.role === 'weights');
          const voices = model.files.find((f) => f.role === 'voices');
          const tokens = model.files.find((f) => f.role === 'tokens');
          if (onnx && tokens && sherpa.createTTS) {
            sherpaTts = await sherpa.createTTS({
              model: {
                type: 'kokoro',
                model: onnx.localPath,
                voices: voices?.localPath,
                tokens: tokens.localPath,
                numThreads: 2,
                provider: 'cpu',
              },
            });
            loadedTtsModelId = model.id;
          }
        }

        if (sherpaTts) {
          for (const sentence of sentences) {
            if (stopRequested) break;
            const res = await sherpaTts.generate({ text: sentence, sid: 0, speed: 1.0 });
            if (stopRequested) break;
            await playPcmFloatBuffer(res.samples, res.sampleRate);
          }
          rt.setVoiceState({ voiceSpeaking: false });
          return;
        }
      } catch {
        // Fall through cleanly to OS speech fallback if local neural TTS fails
      }
    }

    // 2. Native OS speech fallback (ONLY when no local neural TTS model is installed/ready)
    rt.setVoiceState({ voiceSpeaking: true, voiceTtsEngine: 'os-fallback' });
    for (const sentence of sentences) {
      if (stopRequested) break;
      await new Promise<void>((resolve) => {
        Speech.speak(sentence, {
          rate: 1.0,
          onDone: resolve,
          onStopped: resolve,
          onError: () => resolve(),
        });
      });
    }
    rt.setVoiceState({ voiceSpeaking: false });
  },

  async stop(): Promise<void> {
    stopRequested = true;
    try {
      await Speech.stop();
    } catch {
      // ignore
    }
    useRuntimeStore.getState().setVoiceState({ voiceSpeaking: false });
  },

  async release(): Promise<void> {
    await this.stop();
    if (sherpaTts) {
      const inst = sherpaTts;
      sherpaTts = null;
      loadedTtsModelId = null;
      await inst.destroy?.().catch(() => {});
    }
  },
};
