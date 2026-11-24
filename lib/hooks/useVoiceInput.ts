import { useCallback, useState } from 'react';

import { voiceService } from '@/services/voice/voiceService';
import { useRuntimeStore } from '@/store/runtime.store';

export function useVoiceInput(onTranscript: (text: string, isFinal: boolean) => void) {
  const isListening = useRuntimeStore((s) => s.voiceListening);
  const isSpeaking = useRuntimeStore((s) => s.voiceSpeaking);
  const ttsEngine = useRuntimeStore((s) => s.voiceTtsEngine);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const toggleDictation = useCallback(async () => {
    setVoiceError(null);
    if (isListening) {
      const final = await voiceService.stopDictation();
      if (final) onTranscript(final, true);
      return;
    }
    try {
      await voiceService.startDictation({
        onPartial: (t) => onTranscript(t, false),
        onFinal: (t) => onTranscript(t, true),
        onError: (msg) => setVoiceError(msg),
      });
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : String(err));
    }
  }, [isListening, onTranscript]);

  const speak = useCallback(async (text: string, messageId?: string) => {
    setVoiceError(null);
    const { voiceSpeaking, speakingMessageId } = useRuntimeStore.getState();
    if (voiceSpeaking) {
      await voiceService.stopSpeaking();
      // If user tapped Stop on the same message, stop; if they tapped another message, play it.
      if (!messageId || speakingMessageId === messageId) {
        return;
      }
    }
    await voiceService.speak(text, messageId);
  }, []);

  return {
    isListening,
    isSpeaking,
    ttsEngine,
    voiceError,
    toggleDictation,
    speak,
    stopSpeaking: voiceService.stopSpeaking,
  };
}
