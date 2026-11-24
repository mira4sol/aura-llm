export interface PcmChunkEvent {
  samples: Int16Array;
  rms: number;
}

export interface MicCaptureHandle {
  stop: () => Promise<void>;
}

/**
 * Computes normalized RMS amplitude (0..1) from 16-bit mono PCM samples for waveform display.
 */
export function computePcmRms(samples: Int16Array): number {
  if (samples.length === 0) return 0;
  let sumSq = 0;
  for (let i = 0; i < samples.length; i++) {
    const norm = samples[i] / 32768;
    sumSq += norm * norm;
  }
  return Math.min(1, Math.sqrt(sumSq / samples.length) * 3.5);
}

/**
 * Captures 16 kHz mono 16-bit PCM audio frames using @fugood/react-native-audio-pcm-stream.
 */
export async function startMicPcmCapture(
  onChunk: (ev: PcmChunkEvent) => void
): Promise<MicCaptureHandle> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pcmStream = require('@fugood/react-native-audio-pcm-stream');
  const mod = pcmStream.default ?? pcmStream;

  mod.init({
    sampleRate: 16000,
    channels: 1,
    bitsPerSample: 16,
    audioSource: 6, // VOICE_RECOGNITION on Android
    bufferSize: 4096,
  });

  const listener = mod.on('data', (base64Chunk: string) => {
    try {
      const binary = globalThis.atob ? globalThis.atob(base64Chunk) : '';
      const len = Math.floor(binary.length / 2);
      const samples = new Int16Array(len);
      for (let i = 0; i < len; i++) {
        const lo = binary.charCodeAt(i * 2);
        const hi = binary.charCodeAt(i * 2 + 1);
        samples[i] = (hi << 8) | lo;
      }
      onChunk({ samples, rms: computePcmRms(samples) });
    } catch {
      // skip malformed chunk
    }
  });

  mod.start();

  return {
    stop: async () => {
      try {
        mod.stop();
        listener?.remove?.();
      } catch {
        // ignore
      }
    },
  };
}
