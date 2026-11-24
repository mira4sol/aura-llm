import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
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

const PANTRY_INGREDIENTS = ['Fresh Salmon', 'Quinoa', 'Asparagus'];

const OMNIMODAL_CHIPS: { label: string; icon: MaterialIconName; color: string }[] = [
  { label: 'Analyze Screen', icon: 'document_scanner', color: AURA_COLORS.secondary },
  { label: 'Audio Memo', icon: 'mic', color: AURA_COLORS.tertiary },
  { label: 'Plan Evening', icon: 'calendar_today', color: AURA_COLORS.primary },
  { label: 'Summarize Notes', icon: 'summarize', color: AURA_COLORS.outline },
];

const RATES = ['1.0x', '1.25x', '1.5x'];

export default function UnifiedVoiceChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [orbCollapsed, setOrbCollapsed] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [rateIndex, setRateIndex] = useState(1);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [ledgerAdded, setLedgerAdded] = useState(false);
  const [promptText, setPromptText] = useState('');

  const topPadding = insets.top + HEADER_CONTENT_HEIGHT + 8;
  const bottomPadding = getTabBarTotalHeight(insets.bottom) + 18;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: AURA_COLORS.surface }}>
      <AuraHeader subtitle="Assistant Chat" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: topPadding,
          paddingBottom: bottomPadding,
          paddingHorizontal: 20,
          gap: 14,
        }}>
        {/* Atmospheric Glow Spotlights */}
        <AmbientGlow
          id="unifiedGlow1"
          color={AURA_COLORS.tertiaryContainer}
          size={340}
          opacity={0.22}
          style={{ top: 0, alignSelf: 'center' }}
        />
        <AmbientGlow
          id="unifiedGlow2"
          color={AURA_COLORS.secondaryContainer}
          size={240}
          opacity={0.16}
          style={{ top: 200, right: -40 }}
        />

        {/* Section 1: System Telemetry & Model Control Strip */}
        <View style={{ gap: 8 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}>
            {/* Active Model Specs Pill */}
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/models')}
              activeOpacity={0.78}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 999,
                backgroundColor: 'rgba(41, 41, 51, 0.78)',
                flexShrink: 1,
              }}>
              <PulsingDot size={6} color={AURA_COLORS.secondaryContainer} />
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: AURA_FONTS.monoMedium,
                  fontSize: 10.5,
                  color: AURA_COLORS.secondaryFixed,
                }}>
                Mistral NeMo 12B · Q4_K_M
              </Text>
            </TouchableOpacity>

            {/* Mode Selector Segmentation: Hybrid | Voice | Text */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 3,
                borderRadius: 999,
                backgroundColor: 'rgba(13, 13, 22, 0.85)',
              }}>
              <TouchableOpacity
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 999,
                  backgroundColor: AURA_COLORS.primaryContainer,
                }}>
                <Text
                  style={{
                    fontFamily: AURA_FONTS.sansSemiBold,
                    fontSize: 12,
                    color: '#ffffff',
                  }}>
                  Hybrid
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/(tabs)/voice')}
                style={{
                  paddingHorizontal: 9,
                  paddingVertical: 4,
                  borderRadius: 999,
                }}>
                <Text
                  style={{
                    fontFamily: AURA_FONTS.sansSemiBold,
                    fontSize: 12,
                    color: AURA_COLORS.onSurfaceVariant,
                  }}>
                  Voice
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/(tabs)/assistant')}
                style={{
                  paddingHorizontal: 9,
                  paddingVertical: 4,
                  borderRadius: 999,
                }}>
                <Text
                  style={{
                    fontFamily: AURA_FONTS.sansSemiBold,
                    fontSize: 12,
                    color: AURA_COLORS.onSurfaceVariant,
                  }}>
                  Text
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Live On-Device Telemetry Metrics */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 16,
              backgroundColor: 'rgba(13, 13, 22, 0.68)',
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <MaterialIcon name="bolt" size={14} color={AURA_COLORS.secondary} />
              <Text
                style={{
                  fontFamily: AURA_FONTS.monoMedium,
                  fontSize: 11,
                  color: AURA_COLORS.onSurfaceVariant,
                }}>
                42ms Latency
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <MaterialIcon name="lock" size={14} color={AURA_COLORS.tertiary} />
              <Text
                style={{
                  fontFamily: AURA_FONTS.monoMedium,
                  fontSize: 11,
                  color: AURA_COLORS.onSurfaceVariant,
                }}>
                0 B Outbound
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <MaterialIcon name="memory" size={14} color={AURA_COLORS.secondaryContainer} />
              <Text
                style={{
                  fontFamily: AURA_FONTS.monoMedium,
                  fontSize: 11,
                  color: AURA_COLORS.secondaryFixed,
                }}>
                NPU 32 tk/s
              </Text>
            </View>
          </View>
        </View>

        {/* Section 2: Fluid Neural Orb & Live Audio Workspace */}
        <View
          style={{
            borderRadius: 28,
            backgroundColor: 'rgba(27, 27, 36, 0.84)',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.06)',
            padding: 16,
            alignItems: 'center',
            shadowColor: '#07070d',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.48,
            shadowRadius: 24,
            elevation: 10,
          }}>
          {!orbCollapsed && (
            <>
              <AuraOrb
                variant="compact"
                isListening={!isMuted}
                onPress={() => setIsMuted((prev) => !prev)}
              />

              <View style={{ marginVertical: 4 }}>
                <WaveformBars active={!isMuted} variant="compact" />
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  marginTop: 4,
                  borderRadius: 999,
                  backgroundColor: 'rgba(52, 52, 62, 0.65)',
                }}>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: isMuted ? AURA_COLORS.outline : AURA_COLORS.secondaryContainer,
                  }}
                />
                <Text
                  style={{
                    fontFamily: AURA_FONTS.sansSemiBold,
                    fontSize: 12.5,
                    color: AURA_COLORS.onSurface,
                  }}>
                  {isMuted ? 'Microphone Muted' : 'Listening · Neural D-Noise Active'}
                </Text>
              </View>
            </>
          )}

          {/* Quick Audio Controls Strip */}
          <View
            style={{
              width: '100%',
              marginTop: orbCollapsed ? 0 : 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'rgba(41, 41, 51, 0.48)',
              borderRadius: 16,
              paddingHorizontal: 10,
              paddingVertical: 6,
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TouchableOpacity
                onPress={() => setIsMuted((prev) => !prev)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: isMuted
                    ? 'rgba(147, 0, 10, 0.45)'
                    : AURA_COLORS.surfaceContainer,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <MaterialIcon
                  name={isMuted ? 'mic_off' : 'mic'}
                  size={17}
                  color={isMuted ? AURA_COLORS.error : AURA_COLORS.onSurfaceVariant}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setRateIndex((prev) => (prev + 1) % RATES.length)}
                style={{
                  paddingHorizontal: 9,
                  paddingVertical: 5,
                  borderRadius: 999,
                  backgroundColor: AURA_COLORS.surfaceContainer,
                }}>
                <Text
                  style={{
                    fontFamily: AURA_FONTS.monoMedium,
                    fontSize: 11,
                    color: AURA_COLORS.onSurface,
                  }}>
                  {RATES[rateIndex]}
                </Text>
              </TouchableOpacity>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 999,
                  backgroundColor: 'rgba(0, 241, 253, 0.14)',
                }}>
                <MaterialIcon name="waving_hand" size={13} color={AURA_COLORS.secondaryContainer} />
                <Text
                  style={{
                    fontFamily: AURA_FONTS.monoMedium,
                    fontSize: 11,
                    color: AURA_COLORS.secondaryContainer,
                  }}>
                  Hands-Free
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setOrbCollapsed((prev) => !prev)}
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: AURA_COLORS.surfaceContainer,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <MaterialIcon
                name={orbCollapsed ? 'unfold_more' : 'unfold_less'}
                size={18}
                color={AURA_COLORS.onSurfaceVariant}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 3: Live Synchronized Dialogue & Tool Stream */}
        <View style={{ gap: 14, marginTop: 2 }}>
          {/* User Voice Query Bubble */}
          <View style={{ alignItems: 'flex-end', gap: 6, marginLeft: 24 }}>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 }}>
              <MaterialIcon name="mic" size={14} color={AURA_COLORS.secondary} />
              <Text
                style={{
                  fontFamily: AURA_FONTS.sansSemiBold,
                  fontSize: 12.5,
                  color: AURA_COLORS.onSurfaceVariant,
                }}>
                Robin · Spoken Live
              </Text>
              <Text
                style={{
                  fontFamily: AURA_FONTS.monoMedium,
                  fontSize: 10.5,
                  color: AURA_COLORS.outline,
                }}>
                19:42:08
              </Text>
            </View>

            <View
              style={{
                padding: 14,
                borderRadius: 18,
                borderTopRightRadius: 4,
                backgroundColor: AURA_COLORS.surfaceContainerHigh,
              }}>
              <Text
                style={{
                  fontFamily: AURA_FONTS.sansRegular,
                  fontSize: 14,
                  lineHeight: 21,
                  color: AURA_COLORS.onSurface,
                }}>
                Summarize my energy consumption and calculate my dinner grocery budget for tonight.
              </Text>
              <View
                style={{
                  marginTop: 8,
                  alignSelf: 'flex-start',
                  paddingHorizontal: 7,
                  paddingVertical: 2.5,
                  borderRadius: 6,
                  backgroundColor: AURA_COLORS.surfaceContainerLowest,
                }}>
                <Text
                  style={{
                    fontFamily: AURA_FONTS.monoMedium,
                    fontSize: 10.5,
                    color: AURA_COLORS.secondaryFixed,
                  }}>
                  Whisper-Small · 99.4% conf
                </Text>
              </View>
            </View>
          </View>

          {/* AI Multi-modal Response Vessel */}
          <View style={{ gap: 6, marginRight: 8 }}>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 }}>
              <LinearGradient
                colors={[AURA_COLORS.secondaryContainer, AURA_COLORS.primaryContainer]}
                start={{ x: 0, y: 1 }}
                end={{ x: 1, y: 0 }}
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <MaterialIcon name="neurology" size={10} color={AURA_COLORS.onPrimary} />
              </LinearGradient>
              <Text
                style={{
                  fontFamily: AURA_FONTS.sansSemiBold,
                  fontSize: 13,
                  color: AURA_COLORS.onSurface,
                }}>
                Aura Intelligence
              </Text>
              <Text
                style={{
                  fontFamily: AURA_FONTS.monoMedium,
                  fontSize: 10.5,
                  color: AURA_COLORS.outline,
                }}>
                TTS Nova 24kHz
              </Text>
            </View>

            {/* Main Assistant Card */}
            <View
              style={{
                borderRadius: 18,
                borderTopLeftRadius: 4,
                backgroundColor: AURA_COLORS.surfaceContainerLow,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.05)',
                padding: 16,
                gap: 12,
              }}>
              {/* Spoken Audio Player Pill */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: 'rgba(41, 41, 51, 0.85)',
                }}>
                <TouchableOpacity
                  onPress={() => setIsPlayingAudio((prev) => !prev)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: AURA_COLORS.primaryContainer,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <MaterialIcon
                    name={isPlayingAudio ? 'pause' : 'play_arrow'}
                    size={17}
                    color="#ffffff"
                  />
                </TouchableOpacity>

                <View style={{ flex: 1, gap: 5 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text
                      style={{
                        fontFamily: AURA_FONTS.monoMedium,
                        fontSize: 11,
                        color: AURA_COLORS.onSurfaceVariant,
                      }}>
                      TTS Nova Voice
                    </Text>
                    <Text
                      style={{
                        fontFamily: AURA_FONTS.monoMedium,
                        fontSize: 11,
                        color: AURA_COLORS.secondaryFixed,
                      }}>
                      {isPlayingAudio ? '0:21 / 0:38' : '0:14 / 0:38'}
                    </Text>
                  </View>
                  <View
                    style={{
                      width: '100%',
                      height: 4,
                      borderRadius: 999,
                      backgroundColor: AURA_COLORS.surfaceContainerHighest,
                      overflow: 'hidden',
                    }}>
                    <LinearGradient
                      colors={[AURA_COLORS.secondaryContainer, AURA_COLORS.primaryContainer]}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={{
                        width: isPlayingAudio ? '55%' : '37%',
                        height: '100%',
                        borderRadius: 999,
                      }}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => setIsPlayingAudio(true)}
                  style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialIcon name="replay_10" size={18} color={AURA_COLORS.onSurfaceVariant} />
                </TouchableOpacity>
              </View>

              {/* Assistant Synthesized Context Text */}
              <Text
                style={{
                  fontFamily: AURA_FONTS.sansRegular,
                  fontSize: 14,
                  lineHeight: 21,
                  color: AURA_COLORS.onSurface,
                }}>
                Offline telemetry registers daily power draw at{' '}
                <Text
                  style={{
                    fontFamily: AURA_FONTS.sansSemiBold,
                    color: AURA_COLORS.secondaryFixed,
                  }}>
                  14.2 kWh
                </Text>{' '}
                (18% below your target). Based on available ingredients, here is your curated dinner
                allocation:
              </Text>

              {/* Offline Tool Execution Card: grocery_budget_calc */}
              <View
                style={{
                  borderRadius: 16,
                  backgroundColor: AURA_COLORS.surfaceContainer,
                  padding: 12,
                  gap: 10,
                }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <MaterialIcon name="receipt_long" size={16} color={AURA_COLORS.tertiary} />
                    <Text
                      style={{
                        fontFamily: AURA_FONTS.monoMedium,
                        fontSize: 11,
                        color: AURA_COLORS.onSurface,
                      }}>
                      Offline Tool: grocery_budget_calc
                    </Text>
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 6,
                      backgroundColor: AURA_COLORS.surfaceContainerHigh,
                    }}>
                    <Text
                      style={{
                        fontFamily: AURA_FONTS.monoMedium,
                        fontSize: 10.5,
                        color: AURA_COLORS.secondary,
                      }}>
                      OK 0.04s
                    </Text>
                  </View>
                </View>

                {/* Calculation Grid */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View
                    style={{
                      flex: 1,
                      padding: 11,
                      borderRadius: 14,
                      backgroundColor: 'rgba(41, 41, 51, 0.65)',
                    }}>
                    <Text
                      style={{
                        fontFamily: AURA_FONTS.sansRegular,
                        fontSize: 12,
                        color: AURA_COLORS.onSurfaceVariant,
                      }}>
                      Estimated Meal
                    </Text>
                    <Text
                      style={{
                        fontFamily: AURA_FONTS.sansSemiBold,
                        fontSize: 17,
                        color: AURA_COLORS.secondaryContainer,
                        marginTop: 2,
                      }}>
                      $16.50
                    </Text>
                  </View>

                  <View
                    style={{
                      flex: 1,
                      padding: 11,
                      borderRadius: 14,
                      backgroundColor: 'rgba(41, 41, 51, 0.65)',
                    }}>
                    <Text
                      style={{
                        fontFamily: AURA_FONTS.sansRegular,
                        fontSize: 12,
                        color: AURA_COLORS.onSurfaceVariant,
                      }}>
                      Remaining Weekly
                    </Text>
                    <Text
                      style={{
                        fontFamily: AURA_FONTS.sansSemiBold,
                        fontSize: 17,
                        color: AURA_COLORS.tertiary,
                        marginTop: 2,
                      }}>
                      $35.50
                    </Text>
                  </View>
                </View>

                {/* Pantry Match List */}
                <View style={{ gap: 6, paddingTop: 2 }}>
                  <Text
                    style={{
                      fontFamily: AURA_FONTS.sansSemiBold,
                      fontSize: 12.5,
                      color: AURA_COLORS.onSurfaceVariant,
                    }}>
                    Pantry Ingredients Detected:
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {PANTRY_INGREDIENTS.map((item) => (
                      <View
                        key={item}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          paddingHorizontal: 9,
                          paddingVertical: 3.5,
                          borderRadius: 999,
                          backgroundColor: AURA_COLORS.surfaceContainerHighest,
                        }}>
                        <View
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: AURA_COLORS.secondaryContainer,
                          }}
                        />
                        <Text
                          style={{
                            fontFamily: AURA_FONTS.sansRegular,
                            fontSize: 12,
                            color: AURA_COLORS.onSurface,
                          }}>
                          {item}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              {/* Follow-up Action Chips */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 2 }}>
                <TouchableOpacity
                  onPress={() => setLedgerAdded(true)}
                  activeOpacity={0.78}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    paddingHorizontal: 12,
                    paddingVertical: 6.5,
                    borderRadius: 999,
                    backgroundColor: ledgerAdded
                      ? 'rgba(0, 241, 253, 0.2)'
                      : 'rgba(108, 60, 233, 0.25)',
                  }}>
                  <MaterialIcon
                    name={ledgerAdded ? 'check' : 'add_circle'}
                    size={15}
                    color={ledgerAdded ? AURA_COLORS.secondaryFixed : AURA_COLORS.primary}
                  />
                  <Text
                    style={{
                      fontFamily: AURA_FONTS.sansSemiBold,
                      fontSize: 12.5,
                      color: ledgerAdded ? AURA_COLORS.secondaryFixed : AURA_COLORS.primary,
                    }}>
                    {ledgerAdded ? '$16.50 Added to Ledger' : 'Add $16.50 to Ledger'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/voice')}
                  activeOpacity={0.78}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    paddingHorizontal: 12,
                    paddingVertical: 6.5,
                    borderRadius: 999,
                    backgroundColor: AURA_COLORS.surfaceContainerHigh,
                  }}>
                  <MaterialIcon name="table_restaurant" size={15} color={AURA_COLORS.onSurface} />
                  <Text
                    style={{
                      fontFamily: AURA_FONTS.sansSemiBold,
                      fontSize: 12.5,
                      color: AURA_COLORS.onSurface,
                    }}>
                    Dictate Recipe Prep
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Section 4: Omnimodal Suggestion Chips Carousel */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -20 }}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingVertical: 4 }}>
          {OMNIMODAL_CHIPS.map((chip) => (
            <TouchableOpacity
              key={chip.label}
              onPress={() => setPromptText(chip.label)}
              activeOpacity={0.78}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 13,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: 'rgba(41, 41, 51, 0.82)',
              }}>
              <MaterialIcon name={chip.icon} size={16} color={chip.color} />
              <Text
                style={{
                  fontFamily: AURA_FONTS.sansSemiBold,
                  fontSize: 12.5,
                  color: AURA_COLORS.onSurface,
                }}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Section 5: Unified Omnimodal Input Dock */}
        <View style={{ gap: 8, paddingTop: 2 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              padding: 6,
              borderRadius: 999,
              backgroundColor: 'rgba(13, 13, 22, 0.92)',
              borderWidth: 1,
              borderColor: 'rgba(0, 241, 253, 0.16)',
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.5,
              shadowRadius: 20,
              elevation: 10,
            }}>
            <TouchableOpacity
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(41, 41, 51, 0.74)',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <MaterialIcon name="photo_camera" size={20} color={AURA_COLORS.onSurfaceVariant} />
            </TouchableOpacity>

            <TextInput
              value={promptText}
              onChangeText={setPromptText}
              placeholder="Type or speak naturally (100% Offline)..."
              placeholderTextColor={AURA_COLORS.outline}
              style={{
                flex: 1,
                fontFamily: AURA_FONTS.sansRegular,
                fontSize: 14,
                color: AURA_COLORS.onSurface,
                paddingHorizontal: 6,
                paddingVertical: 6,
              }}
            />

            <TouchableOpacity
              onPress={() => {
                if (promptText.trim()) {
                  router.push({
                    pathname: '/(tabs)/assistant',
                    params: { prompt: promptText.trim() },
                  });
                  setPromptText('');
                } else {
                  router.push('/(tabs)/voice');
                }
              }}
              activeOpacity={0.78}
              style={{
                borderRadius: 22,
                overflow: 'hidden',
              }}>
              <LinearGradient
                colors={
                  promptText.trim().length > 0
                    ? [AURA_COLORS.secondaryContainer, AURA_COLORS.secondaryFixedDim]
                    : [
                        AURA_COLORS.primaryContainer,
                        AURA_COLORS.tertiaryContainer,
                        AURA_COLORS.secondaryContainer,
                      ]
                }
                start={{ x: 0, y: 1 }}
                end={{ x: 1, y: 0 }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <MaterialIcon
                  name={promptText.trim().length > 0 ? 'arrow_upward' : 'mic'}
                  size={21}
                  color={promptText.trim().length > 0 ? AURA_COLORS.onSecondary : '#ffffff'}
                  filled
                />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}>
            <View
              style={{
                width: 5,
                height: 5,
                borderRadius: 2.5,
                backgroundColor: AURA_COLORS.secondaryContainer,
              }}
            />
            <Text
              style={{
                fontFamily: AURA_FONTS.monoMedium,
                fontSize: 10.5,
                color: AURA_COLORS.outline,
              }}>
              Zero Cloud Relay · Zero Memory Leaks · On-Device Sovereign
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
