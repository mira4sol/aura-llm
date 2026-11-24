import React, { useEffect } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { AmbientGlow } from '../../components/AmbientGlow';
import { MaterialIcon, MaterialIconName } from '../../components/MaterialIcon';
import { ONBOARDING_HEADER_HEIGHT, OnboardingHeader } from '../../components/OnboardingHeader';
import { PulsingDot } from '../../components/PulsingDot';
import { AURA_COLORS, AURA_FONTS } from '../../components/theme';

interface PillarItem {
  title: string;
  tag: string;
  tagColor: string;
  description: string;
  icon: MaterialIconName;
  iconColor: string;
  iconBg: string;
}

const PILLARS: PillarItem[] = [
  {
    title: 'Neural Hardware Native',
    tag: 'NPU / METAL',
    tagColor: AURA_COLORS.secondary,
    description:
      'Direct tensor core acceleration. Zero server queue, instant latency, zero battery heat bleed.',
    icon: 'developer_board',
    iconColor: AURA_COLORS.primary,
    iconBg: 'rgba(108, 60, 233, 0.22)',
  },
  {
    title: 'True Zero Knowledge',
    tag: 'ISOLATED',
    tagColor: AURA_COLORS.primary,
    description:
      'Prompts, voice, notes, and vector memory stay strictly encrypted in hardware enclave storage.',
    icon: 'shield_locked',
    iconColor: AURA_COLORS.secondaryContainer,
    iconBg: 'rgba(0, 241, 253, 0.15)',
  },
  {
    title: 'Offline Multi-Tool',
    tag: 'SQLITE 3',
    tagColor: AURA_COLORS.onSurfaceVariant,
    description:
      'Embedded vector sandbox for autonomous notes, tasks, finance, and voice routines in Airplane Mode.',
    icon: 'dataset',
    iconColor: AURA_COLORS.primaryFixed,
    iconBg: AURA_COLORS.surfaceContainerHighest,
  },
];

const CORE_WAVE_BARS = [
  { min: 14, max: 24, color: AURA_COLORS.secondaryContainer, duration: 580, delay: 0 },
  { min: 22, max: 36, color: AURA_COLORS.primary, duration: 720, delay: 140 },
  { min: 34, max: 50, color: '#ffffff', duration: 520, delay: 260 },
  { min: 20, max: 34, color: AURA_COLORS.primary, duration: 680, delay: 80 },
  { min: 12, max: 22, color: AURA_COLORS.secondaryContainer, duration: 620, delay: 200 },
];

const CoreWaveBar: React.FC<{
  min: number;
  max: number;
  color: string;
  duration: number;
  delay: number;
}> = ({ min, max, color, duration, delay }) => {
  const height = useSharedValue(min);

  useEffect(() => {
    height.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(max, { duration, easing: Easing.inOut(Easing.ease) }),
          withTiming(min, { duration, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    );
  }, [delay, duration, height, max, min]);

  const animStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: 4,
          borderRadius: 999,
          backgroundColor: color,
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: color === '#ffffff' ? 0.9 : 0.4,
          shadowRadius: 6,
        },
        animStyle,
      ]}
    />
  );
};

export default function OnboardingWelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const outerSpin = useSharedValue(0);
  const innerSpin = useSharedValue(0);

  useEffect(() => {
    outerSpin.value = withRepeat(
      withTiming(360, { duration: 18000, easing: Easing.linear }),
      -1,
      false
    );
    innerSpin.value = withRepeat(
      withTiming(-360, { duration: 12000, easing: Easing.linear }),
      -1,
      false
    );
  }, [innerSpin, outerSpin]);

  const outerSpinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${outerSpin.value}deg` }],
  }));

  const innerSpinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${innerSpin.value}deg` }],
  }));

  const topPadding = insets.top + ONBOARDING_HEADER_HEIGHT + 10;
  const bottomPadding = Math.max(insets.bottom, 16) + 18;

  return (
    <View style={{ flex: 1, backgroundColor: AURA_COLORS.surface }}>
      <OnboardingHeader variant="welcome" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: topPadding,
          paddingBottom: bottomPadding,
          paddingHorizontal: 20,
          alignItems: 'center',
        }}>
        {/* Atmospheric Radial Backdrops */}
        <AmbientGlow
          id="onb1Glow1"
          color={AURA_COLORS.primaryContainer}
          size={340}
          opacity={0.24}
          style={{ top: 10, alignSelf: 'center' }}
        />
        <AmbientGlow
          id="onb1Glow2"
          color={AURA_COLORS.secondaryContainer}
          size={240}
          opacity={0.18}
          style={{ top: 110, alignSelf: 'center' }}
        />

        {/* Security Micro-Badge */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: 'rgba(41, 41, 51, 0.78)',
            marginTop: 6,
          }}>
          <PulsingDot size={7} color={AURA_COLORS.secondaryContainer} ring />
          <Text
            style={{
              fontFamily: AURA_FONTS.monoMedium,
              fontSize: 10.5,
              letterSpacing: 0.7,
              color: AURA_COLORS.secondary,
            }}>
            100% AIR-GAPPED • ZERO TELEMETRY
          </Text>
        </View>

        {/* Hero Interactive Neural Core Orb */}
        <View
          style={{
            marginTop: 22,
            width: 248,
            height: 248,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          {/* Soft Outer Volumetric Aura */}
          <View pointerEvents="none" style={{ position: 'absolute', width: 256, height: 256 }}>
            <Svg width={256} height={256} viewBox="0 0 256 256">
              <Defs>
                <RadialGradient id="welcomeOrbAura" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor="#00f1fd" stopOpacity="0.34" />
                  <Stop offset="45%" stopColor="#6c3ce9" stopOpacity="0.22" />
                  <Stop offset="100%" stopColor="#13121c" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Circle cx="128" cy="128" r="128" fill="url(#welcomeOrbAura)" />
            </Svg>
          </View>

          {/* Outer Orbital Ring + Cyan Satellite */}
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                width: 218,
                height: 218,
                borderRadius: 109,
                backgroundColor: 'rgba(41, 41, 51, 0.24)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.05)',
              },
              outerSpinStyle,
            ]}>
            <View
              style={{
                position: 'absolute',
                top: -3.5,
                left: '50%',
                marginLeft: -3.5,
                width: 7,
                height: 7,
                borderRadius: 3.5,
                backgroundColor: AURA_COLORS.secondaryContainer,
                shadowColor: AURA_COLORS.secondaryContainer,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 1,
                shadowRadius: 8,
              }}
            />
          </Animated.View>

          {/* Inner Reverse Orbital Ring + Violet Satellite */}
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                width: 178,
                height: 178,
                borderRadius: 89,
                backgroundColor: 'rgba(52, 52, 62, 0.16)',
                borderWidth: 1,
                borderColor: 'rgba(205, 189, 255, 0.08)',
              },
              innerSpinStyle,
            ]}>
            <View
              style={{
                position: 'absolute',
                bottom: -3.5,
                left: '50%',
                marginLeft: -3.5,
                width: 7,
                height: 7,
                borderRadius: 3.5,
                backgroundColor: AURA_COLORS.primary,
                shadowColor: AURA_COLORS.primary,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 1,
                shadowRadius: 8,
              }}
            />
          </Animated.View>

          {/* Central Fluid Glowing Orb Sphere */}
          <LinearGradient
            colors={[
              AURA_COLORS.primaryContainer,
              AURA_COLORS.secondaryContainer,
              AURA_COLORS.primary,
            ]}
            start={{ x: 0, y: 1 }}
            end={{ x: 1, y: 0 }}
            style={{
              width: 144,
              height: 144,
              borderRadius: 72,
              padding: 2,
              shadowColor: AURA_COLORS.secondaryContainer,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.42,
              shadowRadius: 26,
              elevation: 14,
            }}>
            <View
              style={{
                flex: 1,
                borderRadius: 70,
                backgroundColor: '#0e101c',
                overflow: 'hidden',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Svg
                width={140}
                height={140}
                viewBox="0 0 140 140"
                style={{ position: 'absolute' }}
                pointerEvents="none">
                <Defs>
                  <RadialGradient id="causticTL" cx="22%" cy="22%" r="55%">
                    <Stop offset="0%" stopColor="#00f1fd" stopOpacity="0.34" />
                    <Stop offset="100%" stopColor="#00f1fd" stopOpacity="0" />
                  </RadialGradient>
                  <RadialGradient id="causticBR" cx="80%" cy="80%" r="55%">
                    <Stop offset="0%" stopColor="#6c3ce9" stopOpacity="0.52" />
                    <Stop offset="100%" stopColor="#6c3ce9" stopOpacity="0" />
                  </RadialGradient>
                </Defs>
                <Circle cx="70" cy="70" r="70" fill="url(#causticTL)" />
                <Circle cx="70" cy="70" r="70" fill="url(#causticBR)" />
              </Svg>

              {/* Center Waveform Pulse */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  height: 50,
                }}>
                {CORE_WAVE_BARS.map((bar, idx) => (
                  <CoreWaveBar key={idx} {...bar} />
                ))}
              </View>

              <Text
                style={{
                  fontFamily: AURA_FONTS.monoMedium,
                  fontSize: 11,
                  letterSpacing: 1.4,
                  color: 'rgba(111, 246, 255, 0.9)',
                  marginTop: 6,
                }}>
                4.1B INT4
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Live Telemetry Pill Under Orb */}
        <View
          style={{
            marginTop: 8,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: 'rgba(41, 41, 51, 0.58)',
          }}>
          <MaterialIcon name="memory" size={15} color={AURA_COLORS.secondaryFixed} />
          <Text
            style={{
              fontFamily: AURA_FONTS.monoMedium,
              fontSize: 11,
              color: AURA_COLORS.onSurfaceVariant,
            }}>
            <Text
              style={{
                color: AURA_COLORS.secondaryContainer,
                fontFamily: AURA_FONTS.monoSemiBold,
              }}>
              0 B
            </Text>{' '}
            Outbound • Pure Silicon Execution
          </Text>
        </View>

        {/* Brand Typography Section */}
        <View style={{ marginTop: 22, alignItems: 'center' }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 5,
              borderRadius: 999,
              backgroundColor: AURA_COLORS.surfaceContainerHigh,
            }}>
            <MaterialIcon name="auto_awesome" size={14} color={AURA_COLORS.primary} />
            <Text
              style={{
                fontFamily: AURA_FONTS.monoSemiBold,
                fontSize: 10.5,
                letterSpacing: 1.3,
                color: AURA_COLORS.primary,
              }}>
              AURA OS V2.4
            </Text>
          </View>

          <Text
            style={{
              marginTop: 12,
              fontFamily: AURA_FONTS.sansBold,
              fontSize: 30,
              lineHeight: 37,
              letterSpacing: -0.6,
              color: AURA_COLORS.onSurface,
              textAlign: 'center',
              maxWidth: 336,
            }}>
            Sovereign Intelligence. <Text style={{ color: AURA_COLORS.primary }}>Built for </Text>
            <Text style={{ color: AURA_COLORS.secondaryFixed }}>Your Silicon.</Text>
          </Text>

          <Text
            style={{
              marginTop: 10,
              fontFamily: AURA_FONTS.sansRegular,
              fontSize: 14,
              lineHeight: 21,
              color: AURA_COLORS.onSurfaceVariant,
              textAlign: 'center',
              maxWidth: 325,
            }}>
            An offline AI companion that runs 100% on your device hardware with zero accounts, no
            cloud relays, and absolute mathematical privacy.
          </Text>
        </View>

        {/* Core Architecture Pillar Cards */}
        <View style={{ marginTop: 28, width: '100%', gap: 10 }}>
          {PILLARS.map((pillar) => (
            <View
              key={pillar.title}
              style={{
                width: '100%',
                padding: 16,
                borderRadius: 18,
                backgroundColor: 'rgba(27, 27, 36, 0.8)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.05)',
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 14,
              }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: pillar.iconBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <MaterialIcon name={pillar.icon} size={20} color={pillar.iconColor} filled />
              </View>

              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}>
                  <Text
                    style={{
                      fontFamily: AURA_FONTS.sansSemiBold,
                      fontSize: 16,
                      color: AURA_COLORS.onSurface,
                      flexShrink: 1,
                    }}>
                    {pillar.title}
                  </Text>
                  <Text
                    style={{
                      fontFamily: AURA_FONTS.monoMedium,
                      fontSize: 10,
                      letterSpacing: 1,
                      color: pillar.tagColor,
                    }}>
                    {pillar.tag}
                  </Text>
                </View>

                <Text
                  style={{
                    marginTop: 4,
                    fontFamily: AURA_FONTS.sansRegular,
                    fontSize: 12.5,
                    lineHeight: 18,
                    color: AURA_COLORS.onSurfaceVariant,
                  }}>
                  {pillar.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Bottom Action Area */}
        <View style={{ marginTop: 28, width: '100%', alignItems: 'center', gap: 14 }}>
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => router.push('/onboarding/name')}
            style={{
              width: '100%',
              borderRadius: 999,
              overflow: 'hidden',
              shadowColor: AURA_COLORS.primaryContainer,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.45,
              shadowRadius: 22,
              elevation: 12,
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
                paddingVertical: 16,
                paddingHorizontal: 24,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}>
              <Text
                style={{
                  fontFamily: AURA_FONTS.sansBold,
                  fontSize: 13.5,
                  letterSpacing: 1,
                  color: '#ffffff',
                }}>
                CONTINUE
              </Text>
              <MaterialIcon name="arrow_forward" size={19} color="#ffffff" />
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MaterialIcon name="encrypted" size={15} color={AURA_COLORS.secondary} />
            <Text
              style={{
                fontFamily: AURA_FONTS.sansRegular,
                fontSize: 12,
                color: 'rgba(202, 195, 216, 0.82)',
              }}>
              No email or phone required • AES-256 local encrypted vault
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
