import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { MaterialIcon } from '@/components/MaterialIcon';
import { AURA_COLORS, AURA_FONTS } from '@/components/theme';
import { formatDurationMs } from '@/lib/format';
import { voiceService } from '@/services/voice/voiceService';

interface AudioMessageProps {
  durationMs: number;
  waveform: number[];
  transcript?: string;
}

const DEFAULT_BARS = [0.25, 0.55, 0.8, 0.45, 0.9, 0.65, 0.4, 0.75, 0.5, 0.35, 0.7, 0.6, 0.3, 0.5, 0.2];

export const AudioMessage = React.memo<AudioMessageProps>(function AudioMessage({
  durationMs,
  waveform,
  transcript,
}) {
  const [playing, setPlaying] = useState(false);
  const [showTranscript, setShowTranscript] = useState(Boolean(transcript));
  const bars = waveform.length >= 6 ? waveform.slice(0, 24) : DEFAULT_BARS;

  const handleTogglePlay = async () => {
    if (playing) {
      await voiceService.stopSpeaking();
      setPlaying(false);
      return;
    }
    if (!transcript) return;
    setPlaying(true);
    try {
      await voiceService.speak(transcript);
    } finally {
      setPlaying(false);
    }
  };

  return (
    <View
      style={{
        borderRadius: 16,
        backgroundColor: 'rgba(27, 27, 36, 0.88)',
        borderWidth: 1,
        borderColor: 'rgba(0, 241, 253, 0.16)',
        padding: 12,
        gap: 10,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleTogglePlay}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: AURA_COLORS.primaryContainer,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <MaterialIcon
            name={playing ? 'pause' : 'play_arrow'}
            size={20}
            color={AURA_COLORS.onPrimaryContainer}
          />
        </TouchableOpacity>

        {/* Waveform Bars */}
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 3,
            height: 28,
          }}>
          {bars.map((amp, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: Math.max(4, Math.round(Math.min(1, amp) * 26)),
                borderRadius: 999,
                backgroundColor: playing ? AURA_COLORS.secondaryContainer : AURA_COLORS.primary,
                opacity: 0.45 + Math.min(0.55, amp * 0.55),
              }}
            />
          ))}
        </View>

        <Text
          style={{
            fontFamily: AURA_FONTS.monoMedium,
            fontSize: 11,
            color: AURA_COLORS.onSurfaceVariant,
          }}>
          {formatDurationMs(durationMs)}
        </Text>
      </View>

      {transcript && (
        <View style={{ gap: 4 }}>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => setShowTranscript((v) => !v)}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text
              style={{
                fontFamily: AURA_FONTS.monoMedium,
                fontSize: 10.5,
                color: AURA_COLORS.secondaryFixed,
              }}>
              OFFLINE TRANSCRIPT
            </Text>
            <MaterialIcon
              name={showTranscript ? 'unfold_less' : 'expand_more'}
              size={16}
              color={AURA_COLORS.outline}
            />
          </TouchableOpacity>
          {showTranscript && (
            <Text
              selectable
              style={{
                fontFamily: AURA_FONTS.sansRegular,
                fontSize: 12.5,
                lineHeight: 18,
                color: AURA_COLORS.onSurfaceVariant,
              }}>
              {transcript}
            </Text>
          )}
        </View>
      )}
    </View>
  );
});
