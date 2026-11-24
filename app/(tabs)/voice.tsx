import React, { useCallback, useState } from 'react';
import { TouchableOpacity, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmbientGlow } from '../../components/AmbientGlow';
import { AuraHeader } from '../../components/AuraHeader';
import { AuraOrb } from '../../components/AuraOrb';
import { MaterialIcon, MaterialIconName } from '../../components/MaterialIcon';
import { PulsingDot } from '../../components/PulsingDot';
import {
  AURA_COLORS,
  AURA_FONTS,
  getTabBarTotalHeight,
  HEADER_CONTENT_HEIGHT,
} from '../../components/theme';
import { WaveformBars } from '../../components/WaveformBars';
import { useActiveModel } from '../../lib/hooks/useActiveModel';
import { useVoiceInput } from '../../lib/hooks/useVoiceInput';
import { chatService } from '../../services/chat/chatService';
import { useAppStore } from '../../store/app.store';

const PERSONAS = ['Nova (Warm & Fluid)', 'Orion (Calm & Crisp)', 'Atlas (Executive)'];

const SPEEDS = ['1.0x', '1.2x', '1.5x'];

const VOICE_SUGGESTIONS: { label: string; icon: MaterialIconName; color: string }[] = [
  { label: 'Reschedule 3 PM meet', icon: 'calendar_today', color: AURA_COLORS.secondary },
  { label: 'Show grocery checklist', icon: 'format_list_bulleted', color: AURA_COLORS.primary },
  { label: 'Summarize today', icon: 'summarize', color: AURA_COLORS.tertiary },
];

export default function VoiceAssistantScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const userName = useAppStore((s) => s.userName);
  const { activeModel, activeBackend } = useActiveModel();
  const [liveTranscript, setLiveTranscript] = useState('');
  const [denoiseActive, setDenoiseActive] = useState(true);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [personaIndex, setPersonaIndex] = useState(0);

  const handleTranscript = useCallback(
    (text: string, isFinal: boolean) => {
      setLiveTranscript(text);
      if (isFinal && text.trim()) {
        void chatService
          .createConversation({ origin: 'home_voice', initialText: text.trim() })
          .then(({ conversation }) => {
            router.push({
              pathname: '/(tabs)/assistant',
              params: { cid: conversation.id, autostart: '1' },
            });
          })
          .catch(() => {
            // Keep transcript visible on screen if conversation creation fails
          });
      }
    },
    [router]
  );

  const { isListening, voiceError, toggleDictation } = useVoiceInput(handleTranscript);

  const topPadding = insets.top + HEADER_CONTENT_HEIGHT + 8;
  const bottomPadding = getTabBarTotalHeight(insets.bottom) + 16;

  return (
    <View style={{ flex: 1, backgroundColor: AURA_COLORS.surface }}>
      <AuraHeader subtitle="Voice Orb" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: topPadding,
          paddingBottom: bottomPadding,
          paddingHorizontal: 20,
        }}>
        {/* Ambient Atmospheric Void Radial Glows */}
        <AmbientGlow
          id="voiceGlow1"
          color={AURA_COLORS.primaryContainer}
          size={320}
          opacity={0.22}
          style={{ top: 0, alignSelf: 'center' }}
        />
        <AmbientGlow
          id="voiceGlow2"
          color={AURA_COLORS.secondaryContainer}
          size={380}
          opacity={0.18}
          style={{ top: 150, alignSelf: 'center' }}
        />
        <AmbientGlow
          id="voiceGlow3"
          color={AURA_COLORS.tertiaryContainer}
          size={300}
          opacity={0.22}
          style={{ bottom: 60, alignSelf: 'center' }}
        />

        {/* 1. Voice Status Header & Telemetry */}
        <View style={{ alignItems: 'center', gap: 10 }}>
          {/* Telemetry Diagnostic Badge */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 5,
              borderRadius: 999,
              backgroundColor: 'rgba(41, 41, 51, 0.82)',
            }}>
            <PulsingDot size={6} color={AURA_COLORS.secondaryContainer} ring />
            <Text
              style={{
                fontFamily: AURA_FONTS.monoMedium,
                fontSize: 11,
                color: AURA_COLORS.secondaryFixedDim,
              }}>
              {activeModel
                ? `${activeModel.displayName} · ${(activeBackend ?? 'LOCAL').toUpperCase()} · 0 bytes outbound`
                : 'Offline Voice Engine · 0 bytes outbound'}
            </Text>
          </View>

          {/* Voice Core Identity & Persona Switcher */}
          <View
            style={{
              width: '100%',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 2,
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <Text
                style={{
                  fontFamily: AURA_FONTS.monoMedium,
                  fontSize: 13.5,
                  color: AURA_COLORS.onSurfaceVariant,
                }}>
                Aura Core v2.4
              </Text>
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 2.5,
                  borderRadius: 999,
                  backgroundColor: 'rgba(52, 52, 62, 0.85)',
                }}>
                <Text
                  style={{
                    fontFamily: AURA_FONTS.monoMedium,
                    fontSize: 10,
                    color: AURA_COLORS.secondary,
                  }}>
                  NPU ACTIVE
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setPersonaIndex((prev) => (prev + 1) % PERSONAS.length)}
              activeOpacity={0.78}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: 11,
                paddingVertical: 6.5,
                borderRadius: 999,
                backgroundColor: 'rgba(31, 31, 40, 0.78)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.06)',
              }}>
              <MaterialIcon name="graphic_eq" size={15} color={AURA_COLORS.primary} />
              <Text
                style={{
                  fontFamily: AURA_FONTS.sansSemiBold,
                  fontSize: 12,
                  color: AURA_COLORS.onSurface,
                }}>
                {PERSONAS[personaIndex]}
              </Text>
              <MaterialIcon name="expand_more" size={15} color={AURA_COLORS.outline} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. Centerpiece: Dynamic Luminous Voice Orb & Frequency Field */}
        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 16 }}>
          <AuraOrb
            variant="voice"
            isListening={isListening}
            onPress={() => void toggleDictation()}
          />

          {/* Mode Context Label */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
            {isListening ? (
              <PulsingDot size={8} color={AURA_COLORS.secondaryContainer} ring />
            ) : (
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: AURA_COLORS.outline,
                }}
              />
            )}
            <Text
              style={{
                fontFamily: AURA_FONTS.sansSemiBold,
                fontSize: 17,
                color: isListening ? AURA_COLORS.secondary : AURA_COLORS.outline,
                letterSpacing: -0.2,
              }}>
              {isListening ? 'Listening...' : 'Paused (Tap to resume)'}
            </Text>
          </View>

          {/* Animated Audio Waveform EQ Bars */}
          <View style={{ marginTop: 8 }}>
            <WaveformBars active={isListening} variant="voice" />
          </View>
        </View>

        {/* 3. Live Conversational Subtitle Deck (Tap to open Unified Voice & Chat) */}
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/unified')}
          activeOpacity={0.78}
          style={{
            width: '100%',
            padding: 16,
            borderRadius: 22,
            backgroundColor: 'rgba(31, 31, 40, 0.8)',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.06)',
            gap: 12,
          }}>
          {/* User Utterance */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                backgroundColor: AURA_COLORS.surfaceContainerHighest,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 2,
              }}>
              <MaterialIcon name="person" size={14} color={AURA_COLORS.onSurfaceVariant} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: AURA_FONTS.monoMedium,
                  fontSize: 10.5,
                  color: AURA_COLORS.outline,
                  letterSpacing: 0.6,
                }}>
                {(userName.trim() || 'YOU').toUpperCase()}
              </Text>
              <Text
                style={{
                  fontFamily: AURA_FONTS.sansMedium,
                  fontSize: 14,
                  lineHeight: 20,
                  color: voiceError ? AURA_COLORS.error : AURA_COLORS.onSurface,
                  marginTop: 3,
                }}>
                {voiceError
                  ? voiceError
                  : liveTranscript
                    ? `“${liveTranscript}”`
                    : 'Tap the orb to begin offline Whisper/VAD dictation…'}
              </Text>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: 'rgba(52, 52, 62, 0.65)' }} />

          {/* Local AI Streaming Response */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                backgroundColor: 'rgba(108, 60, 233, 0.42)',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 2,
              }}>
              <MaterialIcon name="auto_awesome" size={14} color={AURA_COLORS.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text
                  style={{
                    fontFamily: AURA_FONTS.monoMedium,
                    fontSize: 10.5,
                    color: AURA_COLORS.secondaryFixedDim,
                    letterSpacing: 0.6,
                  }}>
                  AURA LOCAL
                </Text>
                <Text
                  style={{
                    fontFamily: AURA_FONTS.monoMedium,
                    fontSize: 10.5,
                    color: AURA_COLORS.outline,
                  }}>
                  TTS · {SPEEDS[speedIndex]}
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: AURA_FONTS.sansRegular,
                  fontSize: 14,
                  lineHeight: 21,
                  color: AURA_COLORS.onSurfaceVariant,
                  marginTop: 3,
                }}>
                You have{' '}
                <Text
                  style={{
                    fontFamily: AURA_FONTS.sansSemiBold,
                    color: AURA_COLORS.onSurface,
                  }}>
                  two high-priority items
                </Text>
                : finalize the offline model benchmark report at{' '}
                <Text
                  style={{
                    fontFamily: AURA_FONTS.sansMedium,
                    color: AURA_COLORS.secondary,
                  }}>
                  3:00 PM
                </Text>
                , and review your grocery list before heading home.
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Quick Agent Prompt Suggestions */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -20, marginTop: 12 }}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingVertical: 4 }}>
          {VOICE_SUGGESTIONS.map((item) => (
            <TouchableOpacity
              key={item.label}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/assistant',
                  params: { prompt: item.label },
                })
              }
              activeOpacity={0.78}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 13,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: 'rgba(41, 41, 51, 0.76)',
              }}>
              <MaterialIcon name={item.icon} size={15} color={item.color} />
              <Text
                style={{
                  fontFamily: AURA_FONTS.sansSemiBold,
                  fontSize: 12.5,
                  color: AURA_COLORS.onSurface,
                }}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 4. Tactile Bottom Control Deck */}
        <View style={{ marginTop: 12, gap: 14 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 4,
            }}>
            {/* Switch to Keyboard */}
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/assistant')}
              activeOpacity={0.78}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: 'rgba(41, 41, 51, 0.68)',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <MaterialIcon name="keyboard" size={20} color={AURA_COLORS.onSurfaceVariant} />
            </TouchableOpacity>

            {/* Neural D-Noise Toggle */}
            <TouchableOpacity
              onPress={() => setDenoiseActive((prev) => !prev)}
              activeOpacity={0.78}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 7,
                paddingHorizontal: 13,
                paddingVertical: 9,
                borderRadius: 999,
                backgroundColor: 'rgba(41, 41, 51, 0.85)',
              }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: denoiseActive
                    ? AURA_COLORS.secondaryContainer
                    : AURA_COLORS.outline,
                  shadowColor: denoiseActive ? AURA_COLORS.secondaryContainer : 'transparent',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.9,
                  shadowRadius: 6,
                }}
              />
              <Text
                style={{
                  fontFamily: AURA_FONTS.monoMedium,
                  fontSize: 11,
                  color: AURA_COLORS.onSurface,
                }}>
                Neural D-Noise: {denoiseActive ? 'On' : 'Off'}
              </Text>
            </TouchableOpacity>

            {/* Speed Control */}
            <TouchableOpacity
              onPress={() => setSpeedIndex((prev) => (prev + 1) % SPEEDS.length)}
              activeOpacity={0.78}
              style={{
                paddingHorizontal: 13,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: 'rgba(41, 41, 51, 0.68)',
              }}>
              <Text
                style={{
                  fontFamily: AURA_FONTS.monoMedium,
                  fontSize: 11.5,
                  color: AURA_COLORS.onSurface,
                }}>
                {SPEEDS[speedIndex]}
              </Text>
            </TouchableOpacity>

            {/* End Voice Session */}
            <TouchableOpacity
              onPress={() => router.push('/(tabs)')}
              activeOpacity={0.78}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: 'rgba(147, 0, 10, 0.34)',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <MaterialIcon name="call_end" size={20} color={AURA_COLORS.error} />
            </TouchableOpacity>
          </View>

          {/* Center Primary Action: Large Glowing Mic Button */}
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 4 }}>
            <View
              style={{
                width: 88,
                height: 88,
                borderRadius: 44,
                backgroundColor: isListening
                  ? 'rgba(0, 241, 253, 0.14)'
                  : 'rgba(148, 142, 161, 0.1)',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <TouchableOpacity
                onPress={() => void toggleDictation()}
                activeOpacity={0.78}
                style={{
                  borderRadius: 34,
                  overflow: 'hidden',
                  shadowColor: AURA_COLORS.secondaryContainer,
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: isListening ? 0.48 : 0.15,
                  shadowRadius: 20,
                  elevation: 12,
                }}>
                <LinearGradient
                  colors={
                    isListening
                      ? [
                          AURA_COLORS.primaryContainer,
                          AURA_COLORS.primary,
                          AURA_COLORS.secondaryContainer,
                        ]
                      : [AURA_COLORS.surfaceContainerHigh, AURA_COLORS.surfaceContainerHighest]
                  }
                  start={{ x: 0, y: 1 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    width: 66,
                    height: 66,
                    borderRadius: 33,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <MaterialIcon
                    name={isListening ? 'mic' : 'mic_off'}
                    size={30}
                    color={
                      isListening
                        ? AURA_COLORS.surfaceContainerLowest
                        : AURA_COLORS.onSurfaceVariant
                    }
                    filled={isListening}
                  />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <Text
              style={{
                fontFamily: AURA_FONTS.monoMedium,
                fontSize: 11,
                color: AURA_COLORS.outline,
                textAlign: 'center',
                marginTop: 6,
              }}>
              Tap mic to interrupt or hold for offline dictation mode
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
