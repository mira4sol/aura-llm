import { humanizeLatexInPlainText } from '@/lib/chat/latexMath';
import { useRuntimeStore } from '@/store/runtime.store';
import { audioSession } from './audioSession';
import { sttService, type DictationCallbacks, type DictationSession } from './sttService';
import { ttsService } from './ttsService';

function cleanTextForSpeech(raw: string): string {
  const withoutThink = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^[\s\S]*?<\/think>/i, '')
    .replace(/```[\s\S]*?```/g, ' code snippet ')
    .replace(/[#*_`~>]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  return humanizeLatexInPlainText(withoutThink).replace(/\s+/g, ' ').trim();
}

let activeSession: DictationSession | null = null;
let interruptionUnsub: (() => void) | null = null;

export const voiceService = {
  async startDictation(callbacks: DictationCallbacks): Promise<void> {
    await ttsService.stop();
    const permitted = await audioSession.requestMicPermission();
    if (!permitted) {
      throw new Error('Microphone permission denied. Enable it in system settings for offline voice.');
    }

    await audioSession.configureForRecording();
    useRuntimeStore.getState().setVoiceState({ voiceListening: true });

    interruptionUnsub?.();
    interruptionUnsub = audioSession.onInterruption(() => {
      void this.stopDictation();
    });

    try {
      activeSession = await sttService.startRealtimeDictation(callbacks);
    } catch (err) {
      useRuntimeStore.getState().setVoiceState({ voiceListening: false });
      await audioSession.deactivate();
      throw err;
    }
  },

  async stopDictation(): Promise<string> {
    interruptionUnsub?.();
    interruptionUnsub = null;
    useRuntimeStore.getState().setVoiceState({ voiceListening: false });
    if (!activeSession) {
      await audioSession.deactivate();
      return '';
    }
    const sess = activeSession;
    activeSession = null;
    const text = await sess.stop();
    await audioSession.deactivate();
    return text;
  },

  async speak(text: string, messageId?: string): Promise<void> {
    const clean = cleanTextForSpeech(text);
    if (!clean) return;
    useRuntimeStore.getState().setVoiceState({ speakingMessageId: messageId ?? null });
    await audioSession.configureForPlayback();
    await ttsService.speak(clean);
  },

  async stopSpeaking(): Promise<void> {
    useRuntimeStore.getState().setVoiceState({ speakingMessageId: null, voiceSpeaking: false });
    await ttsService.stop();
  },

  async releaseAll(): Promise<void> {
    await this.stopDictation();
    await sttService.release();
    await ttsService.release();
  },
};
