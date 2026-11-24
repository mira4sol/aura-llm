import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

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
import {
  formatBytes,
  formatDateHeader,
  formatTimeOfDayGreeting,
} from '../../lib/format';
import { useActiveModel } from '../../lib/hooks/useActiveModel';
import { useHardwareProfile } from '../../lib/hooks/useHardwareProfile';
import { useKeyboardVisible } from '../../lib/hooks/useKeyboardVisible';
import { useScreenActive } from '../../lib/hooks/useScreenActive';
import { chatService } from '../../services/chat/chatService';
import { useAppStore } from '../../store/app.store';

interface DispatchPrompt {
  label: string;
  icon: MaterialIconName;
  iconColor: string;
}

const FAST_DISPATCH_ITEMS: DispatchPrompt[] = [
  { label: 'Plan my day', icon: 'event_note', iconColor: AURA_COLORS.secondary },
  { label: 'Summarize meeting notes', icon: 'summarize', iconColor: AURA_COLORS.tertiary },
  { label: 'Analyze monthly spend', icon: 'pie_chart', iconColor: AURA_COLORS.secondaryFixed },
  { label: 'Organize grocery list', icon: 'local_grocery_store', iconColor: AURA_COLORS.primary },
  { label: 'Check device NPU load', icon: 'memory', iconColor: AURA_COLORS.outline },
];

function formatClock(date: Date): string {
  const hrs = String(date.getHours()).padStart(2, '0');
  const mins = String(date.getMinutes()).padStart(2, '0');
  const secs = String(date.getSeconds()).padStart(2, '0');
  return `${hrs}:${mins}:${secs}`;
}

/** Isolated 1Hz clock paused whenever Home blurs or app backgrounds. */
const LiveClockText = React.memo(function LiveClockText() {
  const [focused, setFocused] = useState(true);
  const active = useScreenActive(focused);
  const [clock, setClock] = useState(() => formatClock(new Date()));

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, [])
  );

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setClock(formatClock(new Date()));
    }, 1000);
    return () => clearInterval(id);
  }, [active]);

  return (
    <Text
      style={{
        fontFamily: AURA_FONTS.monoMedium,
        fontSize: 11,
        lineHeight: 16,
        color: AURA_COLORS.outline,
        letterSpacing: 0.7,
      }}>
      {clock}
    </Text>
  );
});

export default function HomeDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const promptSectionYRef = useRef(0);
  const userName = useAppStore((state) => state.userName);
  const { keyboardVisible } = useKeyboardVisible();
  const { activeModel, activeBackend, lastTokensPerSec } = useActiveModel();
  const { hardware } = useHardwareProfile();
  const [homePrompt, setHomePrompt] = useState('');
  const [priorityTaskDone, setPriorityTaskDone] = useState(false);
  const [showInsight, setShowInsight] = useState(true);

  const launchConversation = useCallback(
    async (
      promptText: string,
      origin: 'home_text' | 'home_voice' | 'dispatch' = 'home_text'
    ) => {
      const trimmed = promptText.trim();
      if (!trimmed) {
        router.push('/(tabs)/assistant');
        return;
      }
      try {
        const { conversation } = await chatService.createConversation({
          origin,
          initialText: trimmed,
        });
        setHomePrompt('');
        router.push({
          pathname: '/(tabs)/assistant',
          params: { cid: conversation.id, autostart: '1' },
        });
      } catch (err) {
        Alert.alert(
          'Unable to Start Chat',
          err instanceof Error ? err.message : 'Could not open local conversation.'
        );
      }
    },
    [router]
  );

  const topPadding = insets.top + HEADER_CONTENT_HEIGHT + 10;
  const bottomPadding = getTabBarTotalHeight(insets.bottom) + 18;

  const completedCount = priorityTaskDone ? 10 : 9;
  const completedPct = Math.round((completedCount / 12) * 100);
  const ringRadius = 15.9155;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringStrokeDashoffset = ringCircumference * (1 - completedPct / 100);

  return (
    <KeyboardAvoidingView
      behavior="padding"
      enabled={Platform.OS === 'ios' || keyboardVisible}
      style={{ flex: 1, backgroundColor: AURA_COLORS.surface }}>
      <AuraHeader subtitle="Dashboard" />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: topPadding,
          paddingBottom: bottomPadding,
          paddingHorizontal: 20,
          gap: 24,
        }}>
        {/* Atmospheric Nebula Glow Backdrops */}
        <AmbientGlow
          id="homeGlow1"
          color={AURA_COLORS.primaryContainer}
          size={340}
          opacity={0.22}
          style={{ top: 10, alignSelf: 'center' }}
        />
        <AmbientGlow
          id="homeGlow2"
          color={AURA_COLORS.secondaryContainer}
          size={280}
          opacity={0.14}
          style={{ top: 380, right: -90 }}
        />
        <AmbientGlow
          id="homeGlow3"
          color={AURA_COLORS.tertiaryContainer}
          size={320}
          opacity={0.16}
          style={{ top: 760, left: -100 }}
        />

        {/* 1. Welcome & Local Security Status Header */}
        <View style={{ gap: 10 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: 999,
                backgroundColor: 'rgba(41, 41, 51, 0.85)',
              }}>
              <PulsingDot size={7} color={AURA_COLORS.secondaryContainer} />
              <Text
                style={{
                  fontFamily: AURA_FONTS.monoMedium,
                  fontSize: 11,
                  lineHeight: 16,
                  color: AURA_COLORS.secondary,
                  letterSpacing: 0.35,
                }}>
                100% OFFLINE · ZERO TELEMETRY
              </Text>
            </View>

            <LiveClockText />
          </View>

          <View style={{ marginTop: 2 }}>
            <Text
              style={{
                fontFamily: AURA_FONTS.sansBold,
                fontSize: 30,
                lineHeight: 36,
                color: AURA_COLORS.onSurface,
                letterSpacing: -0.6,
              }}>
              {formatTimeOfDayGreeting()}, {userName.trim() || 'Alex'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <MaterialIcon name="calendar_today" size={15} color={AURA_COLORS.primary} />
              <Text
                style={{
                  fontFamily: AURA_FONTS.sansRegular,
                  fontSize: 12.5,
                  lineHeight: 18,
                  color: AURA_COLORS.onSurfaceVariant,
                }}>
                {formatDateHeader()}
              </Text>
              <Text style={{ color: AURA_COLORS.outline, fontSize: 12 }}>•</Text>
              <Text
                style={{
                  fontFamily: AURA_FONTS.sansMedium,
                  fontSize: 12.5,
                  lineHeight: 18,
                  color: AURA_COLORS.primary,
                }}>
                {activeModel ? `${(activeBackend ?? 'LOCAL').toUpperCase()} Armed` : 'Install a Model'}
              </Text>
            </View>
          </View>

          {/* Central Interactive AI Luminescent Orb Entry Widget */}
          <View
            style={{
              marginTop: 6,
              borderRadius: 34,
              overflow: 'hidden',
              backgroundColor: '#171722',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.07)',
              paddingHorizontal: 18,
              paddingTop: 18,
              paddingBottom: 18,
              shadowColor: '#07070d',
              shadowOffset: { width: 0, height: 14 },
              shadowOpacity: 0.55,
              shadowRadius: 28,
              elevation: 12,
            }}>
            {/* Top-left Nebula Violet + Top-right Cyan corner ambient lighting matching Stitch */}
            <LinearGradient
              colors={[
                'rgba(108, 60, 233, 0.24)',
                'rgba(23, 23, 34, 0.08)',
                'rgba(13, 13, 22, 0.45)',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              pointerEvents="none"
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
            <AmbientGlow
              id="orbCardTopLeft"
              color={AURA_COLORS.primaryContainer}
              size={250}
              opacity={0.32}
              style={{ top: -70, left: -60 }}
            />
            <AmbientGlow
              id="orbCardTopRight"
              color={AURA_COLORS.secondaryContainer}
              size={240}
              opacity={0.26}
              style={{ top: -60, right: -60 }}
            />

            <View style={{ alignItems: 'center' }}>
              <AuraOrb variant="home" onPress={() => router.push('/(tabs)/voice')} />

              <Text
                style={{
                  fontFamily: AURA_FONTS.sansSemiBold,
                  fontSize: 17,
                  lineHeight: 24,
                  color: AURA_COLORS.onSurface,
                  letterSpacing: -0.2,
                  textAlign: 'center',
                  marginTop: 14,
                }}>
                How can Aura assist your workflow?
              </Text>
              <Text
                style={{
                  fontFamily: AURA_FONTS.sansRegular,
                  fontSize: 12,
                  lineHeight: 18,
                  color: AURA_COLORS.onSurfaceVariant,
                  textAlign: 'center',
                  maxWidth: 278,
                  marginTop: 4,
                }}>
                Zero cloud latency. Ready to execute scripts, summarize notes, and curate your
                schedule.
              </Text>

              {/* Glassmorphic Live Prompt Input */}
              <View
                onLayout={(e) => {
                  promptSectionYRef.current = e.nativeEvent.layout.y + 180;
                }}
                style={{
                  width: '100%',
                  marginTop: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  paddingLeft: 14,
                  paddingRight: 8,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: 'rgba(26, 26, 36, 0.92)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.08)',
                }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    flex: 1,
                    minWidth: 0,
                  }}>
                  <MaterialIcon name="magic_button" size={19} color={AURA_COLORS.primary} />
                  <TextInput
                    value={homePrompt}
                    onChangeText={setHomePrompt}
                    onFocus={() => {
                      setTimeout(() => {
                        scrollRef.current?.scrollTo({
                          y: Math.max(0, promptSectionYRef.current - 40),
                          animated: true,
                        });
                      }, 120);
                    }}
                    onSubmitEditing={() => void launchConversation(homePrompt, 'home_text')}
                    returnKeyType="send"
                    placeholder="Ask anything or summon voice..."
                    placeholderTextColor={AURA_COLORS.onSurfaceVariant}
                    style={{
                      fontFamily: AURA_FONTS.sansRegular,
                      fontSize: 13.5,
                      color: AURA_COLORS.onSurface,
                      flex: 1,
                      paddingVertical: 4,
                    }}
                  />
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TouchableOpacity
                    activeOpacity={0.78}
                    onPress={() => void launchConversation(homePrompt, 'home_text')}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      backgroundColor: 'rgba(108, 60, 233, 0.44)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <MaterialIcon
                      name={homePrompt.trim().length > 0 ? 'arrow_upward' : 'keyboard'}
                      size={18}
                      color={AURA_COLORS.primary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.78}
                    onPress={() => router.push('/(tabs)/voice')}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      backgroundColor: 'rgba(0, 241, 253, 0.22)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: AURA_COLORS.secondaryContainer,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.45,
                      shadowRadius: 10,
                    }}>
                    <MaterialIcon
                      name="graphic_eq"
                      size={18}
                      color={AURA_COLORS.secondaryFixedDim}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* 2. Quick AI Command Bubbles (Fast Dispatch) */}
        <View style={{ gap: 10 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
            <Text
              style={{
                fontFamily: AURA_FONTS.sansSemiBold,
                fontSize: 12.5,
                letterSpacing: 0.8,
                color: AURA_COLORS.onSurfaceVariant,
                textTransform: 'uppercase',
              }}>
              Fast Dispatch
            </Text>
            <Text
              style={{
                fontFamily: AURA_FONTS.monoMedium,
                fontSize: 11,
                color: AURA_COLORS.outline,
              }}>
              Offline LLM Pipelines
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -20 }}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
            {FAST_DISPATCH_ITEMS.map((item) => (
              <TouchableOpacity
                key={item.label}
                activeOpacity={0.78}
                onPress={() => void launchConversation(item.label, 'dispatch')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                  borderRadius: 999,
                  backgroundColor: 'rgba(41, 41, 51, 0.84)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.06)',
                }}>
                <MaterialIcon name={item.icon} size={17} color={item.iconColor} />
                <Text
                  style={{
                    fontFamily: AURA_FONTS.sansSemiBold,
                    fontSize: 13,
                    color: AURA_COLORS.onSurface,
                  }}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 3. Today's Focus & Productivity Snapshot (Metrics & Telemetry) */}
        <View style={{ gap: 12 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
            <Text
              style={{
                fontFamily: AURA_FONTS.sansSemiBold,
                fontSize: 17,
                lineHeight: 24,
                color: AURA_COLORS.onSurface,
              }}>
              System Telemetry & Focus
            </Text>
            <View
              style={{
                paddingHorizontal: 9,
                paddingVertical: 3,
                borderRadius: 999,
                backgroundColor: AURA_COLORS.surfaceContainerHigh,
              }}>
              <Text
                style={{
                  fontFamily: AURA_FONTS.monoMedium,
                  fontSize: 10.5,
                  color: AURA_COLORS.secondary,
                  letterSpacing: 0.4,
                }}>
                REALTIME
              </Text>
            </View>
          </View>

          {/* 2-Column Metrics Row */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {/* Metric Card 1: Completed Tasks */}
            <View
              style={{
                flex: 1,
                padding: 16,
                borderRadius: 24,
                backgroundColor: 'rgba(31, 31, 40, 0.78)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.06)',
                justifyContent: 'space-between',
              }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                <Text
                  numberOfLines={1}
                  style={{
                    fontFamily: AURA_FONTS.sansSemiBold,
                    fontSize: 12.5,
                    color: AURA_COLORS.onSurfaceVariant,
                    flex: 1,
                  }}>
                  Completed Tasks
                </Text>
                <MaterialIcon name="check_circle" size={18} color={AURA_COLORS.primary} />
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 14,
                }}>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                    <Text
                      style={{
                        fontFamily: AURA_FONTS.sansBold,
                        fontSize: 29,
                        lineHeight: 34,
                        color: AURA_COLORS.onSurface,
                      }}>
                      {completedCount}
                    </Text>
                    <Text
                      style={{
                        fontFamily: AURA_FONTS.sansSemiBold,
                        fontSize: 16,
                        color: AURA_COLORS.outline,
                      }}>
                      /12
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontFamily: AURA_FONTS.sansRegular,
                      fontSize: 12,
                      color: AURA_COLORS.onSurfaceVariant,
                      marginTop: 2,
                    }}>
                    {12 - completedCount} remaining
                  </Text>
                </View>

                {/* Progress Ring SVG */}
                <View
                  style={{
                    width: 48,
                    height: 48,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Svg
                    width={48}
                    height={48}
                    viewBox="0 0 36 36"
                    style={{ transform: [{ rotate: '-90deg' }] }}>
                    <Circle
                      cx="18"
                      cy="18"
                      r={ringRadius}
                      fill="none"
                      stroke={AURA_COLORS.surfaceVariant}
                      strokeWidth="3.5"
                    />
                    <Circle
                      cx="18"
                      cy="18"
                      r={ringRadius}
                      fill="none"
                      stroke={AURA_COLORS.primaryContainer}
                      strokeWidth="3.5"
                      strokeDasharray={`${ringCircumference} ${ringCircumference}`}
                      strokeDashoffset={ringStrokeDashoffset}
                      strokeLinecap="round"
                    />
                  </Svg>
                  <Text
                    style={{
                      position: 'absolute',
                      fontFamily: AURA_FONTS.monoSemiBold,
                      fontSize: 11,
                      color: AURA_COLORS.onSurface,
                    }}>
                    {completedPct}%
                  </Text>
                </View>
              </View>
            </View>

            {/* Metric Card 2: Daily Focus Score */}
            <View
              style={{
                flex: 1,
                padding: 16,
                borderRadius: 24,
                backgroundColor: 'rgba(31, 31, 40, 0.78)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.06)',
                justifyContent: 'space-between',
              }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                <Text
                  numberOfLines={1}
                  style={{
                    fontFamily: AURA_FONTS.sansSemiBold,
                    fontSize: 12.5,
                    color: AURA_COLORS.onSurfaceVariant,
                    flex: 1,
                  }}>
                  Daily Focus Score
                </Text>
                <MaterialIcon name="timelapse" size={18} color={AURA_COLORS.secondary} />
              </View>

              <View style={{ marginTop: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                  <Text
                    style={{
                      fontFamily: AURA_FONTS.sansBold,
                      fontSize: 29,
                      lineHeight: 34,
                      color: AURA_COLORS.onSurface,
                    }}>
                    88%
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                    <MaterialIcon
                      name="arrow_upward"
                      size={13}
                      color={AURA_COLORS.secondaryFixedDim}
                    />
                    <Text
                      style={{
                        fontFamily: AURA_FONTS.monoMedium,
                        fontSize: 11,
                        color: AURA_COLORS.secondaryFixedDim,
                      }}>
                      4%
                    </Text>
                  </View>
                </View>

                <View
                  style={{
                    width: '100%',
                    height: 6,
                    borderRadius: 999,
                    backgroundColor: AURA_COLORS.surfaceVariant,
                    marginTop: 10,
                    overflow: 'hidden',
                  }}>
                  <LinearGradient
                    colors={[AURA_COLORS.primary, AURA_COLORS.secondaryContainer]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={{ width: '88%', height: '100%', borderRadius: 999 }}
                  />
                </View>

                <Text
                  numberOfLines={1}
                  style={{
                    fontFamily: AURA_FONTS.sansRegular,
                    fontSize: 11.5,
                    color: AURA_COLORS.onSurfaceVariant,
                    marginTop: 7,
                  }}>
                  Optimal flow state detected
                </Text>
              </View>
            </View>
          </View>

          {/* Metric Card 3: Active Local Model Telemetry Banner */}
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={() => router.push('/(tabs)/models')}
            style={{
              padding: 16,
              borderRadius: 24,
              backgroundColor: 'rgba(41, 41, 51, 0.68)',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.06)',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                flex: 1,
                minWidth: 0,
              }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 14,
                  backgroundColor: AURA_COLORS.surfaceContainerHighest,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <MaterialIcon name="developer_board" size={22} color={AURA_COLORS.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: AURA_FONTS.sansSemiBold,
                      fontSize: 15.5,
                      color: AURA_COLORS.onSurface,
                      flexShrink: 1,
                    }}>
                    {activeModel ? activeModel.displayName : 'No Model Installed'}
                  </Text>
                  <View
                    style={{
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 6,
                      backgroundColor: 'rgba(0, 241, 253, 0.18)',
                    }}>
                    <Text
                      style={{
                        fontFamily: AURA_FONTS.monoSemiBold,
                        fontSize: 10,
                        color: AURA_COLORS.secondaryFixed,
                      }}>
                      {activeModel ? activeModel.quant : 'VAULT'}
                    </Text>
                  </View>
                </View>
                <Text
                  numberOfLines={1}
                  style={{
                    fontFamily: AURA_FONTS.monoMedium,
                    fontSize: 11,
                    color: AURA_COLORS.onSurfaceVariant,
                    marginTop: 2,
                  }}>
                  {activeModel
                    ? `${formatBytes(activeModel.totalBytes)} on disk${
                        lastTokensPerSec ? ` • ${lastTokensPerSec.toFixed(1)} tok/s` : ''
                      }`
                    : hardware
                      ? `${formatBytes(hardware.memory.safeBudgetBytes)} safe AI RAM ready`
                      : 'Tap to install an offline model'}
                </Text>
              </View>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <Text
                style={{
                  fontFamily: AURA_FONTS.monoSemiBold,
                  fontSize: 14,
                  color: AURA_COLORS.secondary,
                }}>
                0.0ms
              </Text>
              <Text
                style={{
                  fontFamily: AURA_FONTS.sansRegular,
                  fontSize: 11,
                  color: AURA_COLORS.outline,
                }}>
                Network Ping
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 4. Contextual Quick Utilities Matrix (Active Workspaces) */}
        <View style={{ gap: 12 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
            <Text
              style={{
                fontFamily: AURA_FONTS.sansSemiBold,
                fontSize: 17,
                lineHeight: 24,
                color: AURA_COLORS.onSurface,
              }}>
              Active Workspaces
            </Text>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => router.push('/(tabs)/utilities')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Text
                style={{
                  fontFamily: AURA_FONTS.sansSemiBold,
                  fontSize: 13,
                  color: AURA_COLORS.primary,
                }}>
                Expand Hub
              </Text>
              <MaterialIcon name="chevron_right" size={16} color={AURA_COLORS.primary} />
            </TouchableOpacity>
          </View>

          {/* Row 1: Notes + Priority Tasks */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {/* Utility 1: Notes */}
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() =>
                router.push({ pathname: '/(tabs)/utilities', params: { category: 'Notes' } })
              }
              style={{
                flex: 1,
                padding: 15,
                borderRadius: 24,
                backgroundColor: 'rgba(31, 31, 40, 0.72)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.06)',
                justifyContent: 'space-between',
                minHeight: 162,
              }}>
              <View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                  <MaterialIcon name="sticky_note_2" size={20} color={AURA_COLORS.outline} />
                  <Text
                    style={{
                      fontFamily: AURA_FONTS.monoMedium,
                      fontSize: 11,
                      color: AURA_COLORS.outline,
                    }}>
                    20m ago
                  </Text>
                </View>
                <Text
                  numberOfLines={1}
                  style={{
                    fontFamily: AURA_FONTS.sansSemiBold,
                    fontSize: 15,
                    lineHeight: 20,
                    color: AURA_COLORS.onSurface,
                    marginTop: 11,
                  }}>
                  Weekly Sprint Retrospective
                </Text>
                <Text
                  numberOfLines={2}
                  style={{
                    fontFamily: AURA_FONTS.sansRegular,
                    fontSize: 12,
                    lineHeight: 17,
                    color: AURA_COLORS.onSurfaceVariant,
                    marginTop: 5,
                  }}>
                  Discussed local quantized inference latency targets and UI frame rates...
                </Text>
              </View>

              <View
                style={{
                  marginTop: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                <Text
                  style={{
                    fontFamily: AURA_FONTS.sansSemiBold,
                    fontSize: 13,
                    color: AURA_COLORS.primary,
                  }}>
                  Summarize
                </Text>
                <MaterialIcon name="bolt" size={16} color={AURA_COLORS.primary} />
              </View>
            </TouchableOpacity>

            {/* Utility 2: Priority Tasks */}
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => setPriorityTaskDone((prev) => !prev)}
              style={{
                flex: 1,
                padding: 15,
                borderRadius: 24,
                backgroundColor: 'rgba(31, 31, 40, 0.72)',
                borderWidth: 1,
                borderColor: priorityTaskDone
                  ? 'rgba(0, 241, 253, 0.28)'
                  : 'rgba(255, 255, 255, 0.06)',
                justifyContent: 'space-between',
                minHeight: 162,
              }}>
              <View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                  <MaterialIcon name="flag" size={20} color={AURA_COLORS.error} />
                  <View
                    style={{
                      paddingHorizontal: 7,
                      paddingVertical: 2.5,
                      borderRadius: 6,
                      backgroundColor: 'rgba(147, 0, 10, 0.45)',
                    }}>
                    <Text
                      style={{
                        fontFamily: AURA_FONTS.monoSemiBold,
                        fontSize: 9.5,
                        color: AURA_COLORS.error,
                      }}>
                      HIGH PRIO
                    </Text>
                  </View>
                </View>

                <Text
                  numberOfLines={2}
                  style={{
                    fontFamily: AURA_FONTS.sansSemiBold,
                    fontSize: 15,
                    lineHeight: 20,
                    color: AURA_COLORS.onSurface,
                    textDecorationLine: priorityTaskDone ? 'line-through' : 'none',
                    opacity: priorityTaskDone ? 0.65 : 1,
                    marginTop: 11,
                  }}>
                  Review Quantization Benchmarks
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
                  <MaterialIcon name="schedule" size={14} color={AURA_COLORS.outline} />
                  <Text
                    style={{
                      fontFamily: AURA_FONTS.sansRegular,
                      fontSize: 12,
                      color: AURA_COLORS.onSurfaceVariant,
                    }}>
                    Due 4:00 PM
                  </Text>
                </View>
              </View>

              <View
                style={{
                  marginTop: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                <Text
                  style={{
                    fontFamily: AURA_FONTS.sansSemiBold,
                    fontSize: 13,
                    color: priorityTaskDone
                      ? AURA_COLORS.secondaryFixed
                      : AURA_COLORS.onSurfaceVariant,
                  }}>
                  {priorityTaskDone ? 'Completed' : 'Mark Done'}
                </Text>
                <MaterialIcon
                  name="done"
                  size={16}
                  color={
                    priorityTaskDone ? AURA_COLORS.secondaryFixed : AURA_COLORS.onSurfaceVariant
                  }
                />
              </View>
            </TouchableOpacity>
          </View>

          {/* Row 2: Monthly Budget + Household Pantry */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {/* Utility 3: Monthly Budget */}
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() =>
                router.push({ pathname: '/(tabs)/utilities', params: { category: 'Budget' } })
              }
              style={{
                flex: 1,
                padding: 15,
                borderRadius: 24,
                backgroundColor: 'rgba(31, 31, 40, 0.72)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.06)',
                justifyContent: 'space-between',
                minHeight: 158,
              }}>
              <View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                  <MaterialIcon
                    name="account_balance_wallet"
                    size={20}
                    color={AURA_COLORS.secondary}
                  />
                  <Text
                    style={{
                      fontFamily: AURA_FONTS.monoMedium,
                      fontSize: 11,
                      color: AURA_COLORS.outline,
                    }}>
                    Oct Target
                  </Text>
                </View>
                <Text
                  style={{
                    fontFamily: AURA_FONTS.sansSemiBold,
                    fontSize: 15,
                    color: AURA_COLORS.onSurface,
                    marginTop: 11,
                  }}>
                  Monthly Budget
                </Text>
                <View
                  style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                  <Text
                    style={{
                      fontFamily: AURA_FONTS.monoSemiBold,
                      fontSize: 14,
                      color: AURA_COLORS.onSurface,
                    }}>
                    $1,420
                  </Text>
                  <Text
                    style={{
                      fontFamily: AURA_FONTS.monoMedium,
                      fontSize: 11,
                      color: AURA_COLORS.outline,
                    }}>
                    / $2,000
                  </Text>
                </View>
                <View
                  style={{
                    width: '100%',
                    height: 4,
                    borderRadius: 999,
                    backgroundColor: AURA_COLORS.surfaceVariant,
                    marginTop: 9,
                    overflow: 'hidden',
                  }}>
                  <View
                    style={{
                      width: '71%',
                      height: '100%',
                      borderRadius: 999,
                      backgroundColor: AURA_COLORS.secondaryContainer,
                    }}
                  />
                </View>
              </View>

              <View
                style={{
                  marginTop: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                <Text
                  style={{
                    fontFamily: AURA_FONTS.sansSemiBold,
                    fontSize: 13,
                    color: AURA_COLORS.secondary,
                  }}>
                  Details
                </Text>
                <MaterialIcon name="receipt_long" size={16} color={AURA_COLORS.secondary} />
              </View>
            </TouchableOpacity>

            {/* Utility 4: Household Pantry */}
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() =>
                router.push({ pathname: '/(tabs)/utilities', params: { category: 'Grocery' } })
              }
              style={{
                flex: 1,
                padding: 15,
                borderRadius: 24,
                backgroundColor: 'rgba(31, 31, 40, 0.72)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.06)',
                justifyContent: 'space-between',
                minHeight: 158,
              }}>
              <View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                  <MaterialIcon name="shopping_cart" size={20} color={AURA_COLORS.tertiary} />
                  <View
                    style={{
                      paddingHorizontal: 7,
                      paddingVertical: 2.5,
                      borderRadius: 6,
                      backgroundColor: 'rgba(114, 64, 219, 0.32)',
                    }}>
                    <Text
                      style={{
                        fontFamily: AURA_FONTS.monoSemiBold,
                        fontSize: 9.5,
                        color: AURA_COLORS.tertiaryFixed,
                      }}>
                      7 ITEMS
                    </Text>
                  </View>
                </View>

                <Text
                  style={{
                    fontFamily: AURA_FONTS.sansSemiBold,
                    fontSize: 15,
                    color: AURA_COLORS.onSurface,
                    marginTop: 11,
                  }}>
                  Household Pantry
                </Text>
                <Text
                  numberOfLines={2}
                  style={{
                    fontFamily: AURA_FONTS.sansRegular,
                    fontSize: 12,
                    lineHeight: 17,
                    color: AURA_COLORS.onSurfaceVariant,
                    marginTop: 5,
                  }}>
                  Oat milk, Espresso beans, Greek yogurt, Spinach...
                </Text>
              </View>

              <View
                style={{
                  marginTop: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                <Text
                  style={{
                    fontFamily: AURA_FONTS.sansSemiBold,
                    fontSize: 13,
                    color: AURA_COLORS.tertiary,
                  }}>
                  AI Recipe Idea
                </Text>
                <MaterialIcon name="skillet" size={16} color={AURA_COLORS.tertiary} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* 5. Offline Intelligence Insights Card */}
        {showInsight && (
          <View
            style={{
              borderRadius: 28,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: 'rgba(205, 189, 255, 0.14)',
              shadowColor: '#07070d',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.45,
              shadowRadius: 22,
              elevation: 8,
            }}>
            <LinearGradient
              colors={['rgba(41, 41, 51, 0.94)', 'rgba(31, 31, 40, 0.8)', 'rgba(27, 27, 36, 0.94)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 16 }}>
              <AmbientGlow
                id="insightGlow"
                color={AURA_COLORS.primaryContainer}
                size={180}
                opacity={0.28}
                style={{ right: -40, bottom: -40 }}
              />

              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: 'rgba(108, 60, 233, 0.34)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 2,
                  }}>
                  <MaterialIcon name="insights" size={20} color={AURA_COLORS.primary} />
                </View>

                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                    <Text
                      style={{
                        fontFamily: AURA_FONTS.sansSemiBold,
                        fontSize: 13.5,
                        color: AURA_COLORS.primary,
                        letterSpacing: 0.2,
                      }}>
                      Predictive Focus Window
                    </Text>
                    <Text
                      style={{
                        fontFamily: AURA_FONTS.monoMedium,
                        fontSize: 11,
                        color: AURA_COLORS.outline,
                      }}>
                      In 45 min
                    </Text>
                  </View>

                  <Text
                    style={{
                      fontFamily: AURA_FONTS.sansRegular,
                      fontSize: 12.5,
                      lineHeight: 19,
                      color: AURA_COLORS.onSurface,
                      marginTop: 5,
                    }}>
                    Your physiological peak focus commences at{' '}
                    <Text
                      style={{
                        fontFamily: AURA_FONTS.sansBold,
                        color: AURA_COLORS.secondaryFixed,
                      }}>
                      19:30
                    </Text>
                    . Aura has pre-cached your daily task schedule and silenced incoming background
                    batch jobs.
                  </Text>

                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      marginTop: 14,
                    }}>
                    <TouchableOpacity
                      activeOpacity={0.82}
                      onPress={() =>
                        router.push({
                          pathname: '/(tabs)/assistant',
                          params: { prompt: 'Optimize my 19:30 focus window schedule' },
                        })
                      }
                      style={{
                        flex: 1,
                        borderRadius: 999,
                        overflow: 'hidden',
                      }}>
                      <LinearGradient
                        colors={[
                          AURA_COLORS.primaryContainer,
                          AURA_COLORS.tertiaryContainer,
                          AURA_COLORS.secondaryContainer,
                        ]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={{
                          paddingVertical: 10,
                          paddingHorizontal: 14,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}>
                        <MaterialIcon name="tune" size={16} color={AURA_COLORS.onPrimary} />
                        <Text
                          style={{
                            fontFamily: AURA_FONTS.sansSemiBold,
                            fontSize: 13,
                            color: AURA_COLORS.onPrimary,
                          }}>
                          Optimize Schedule
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.78}
                      onPress={() => setShowInsight(false)}
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 15,
                        borderRadius: 999,
                        backgroundColor: 'rgba(52, 52, 62, 0.85)',
                      }}>
                      <Text
                        style={{
                          fontFamily: AURA_FONTS.sansSemiBold,
                          fontSize: 13,
                          color: AURA_COLORS.onSurfaceVariant,
                        }}>
                        Dismiss
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
