import { PermissionsAndroid, Platform } from 'react-native';

interface AudioManagerLike {
  setAudioSessionOptions?: (opts: Record<string, unknown>) => void;
  setAudioSessionActivity?: (active: boolean) => Promise<boolean> | boolean;
  observeAudioInterruptions?: (observe: boolean) => void;
  addSystemEventListener?: (
    event: string,
    cb: (ev: { type?: string }) => void
  ) => { remove: () => void };
}

let audioManagerCache: AudioManagerLike | null | undefined;
function getAudioManager(): AudioManagerLike | null {
  if (audioManagerCache !== undefined) return audioManagerCache;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-audio-api');
    audioManagerCache = (mod.AudioManager ?? null) as AudioManagerLike | null;
  } catch {
    audioManagerCache = null;
  }
  return audioManagerCache;
}

export type InterruptionCallback = () => void;

const interruptionCallbacks = new Set<InterruptionCallback>();
let sub: { remove: () => void } | null = null;

export const audioSession = {
  async requestMicPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'Aura needs microphone access to transcribe your voice 100% offline.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    // iOS prompts natively on first audio session activation
    return true;
  },

  async configureForRecording(): Promise<void> {
    const mgr = getAudioManager();
    if (!mgr) return;
    try {
      mgr.setAudioSessionOptions?.({
        iosCategory: 'playAndRecord',
        iosMode: 'spokenAudio',
        iosOptions: ['defaultToSpeaker', 'allowBluetooth', 'allowBluetoothA2DP'],
      });
      await mgr.setAudioSessionActivity?.(true);
      this.ensureInterruptionListener();
    } catch {
      // ignore on simulator
    }
  },

  async configureForPlayback(): Promise<void> {
    const mgr = getAudioManager();
    if (!mgr) return;
    try {
      mgr.setAudioSessionOptions?.({
        iosCategory: 'playback',
        iosMode: 'spokenAudio',
        iosOptions: ['duckOthers'],
      });
      await mgr.setAudioSessionActivity?.(true);
    } catch {
      // ignore
    }
  },

  async deactivate(): Promise<void> {
    const mgr = getAudioManager();
    try {
      await mgr?.setAudioSessionActivity?.(false);
    } catch {
      // ignore
    }
  },

  ensureInterruptionListener(): void {
    if (sub) return;
    const mgr = getAudioManager();
    if (!mgr?.addSystemEventListener) return;
    try {
      mgr.observeAudioInterruptions?.(true);
      sub = mgr.addSystemEventListener('interruption', (ev) => {
        if (ev.type === 'began') {
          for (const cb of interruptionCallbacks) cb();
        }
      });
    } catch {
      // ignore
    }
  },

  onInterruption(cb: InterruptionCallback): () => void {
    interruptionCallbacks.add(cb);
    return () => {
      interruptionCallbacks.delete(cb);
    };
  },
};
