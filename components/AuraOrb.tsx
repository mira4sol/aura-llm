import React, { useEffect } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient as SvgLinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

import { useScreenActive } from '@/lib/hooks/useScreenActive';
import { MaterialIcon } from './MaterialIcon';
import { AURA_COLORS } from './theme';

interface AuraOrbProps {
  variant?: 'home' | 'voice' | 'compact';
  isListening?: boolean;
  onPress?: () => void;
}

export const AuraOrb = React.memo<AuraOrbProps>(function AuraOrb({
  variant = 'home',
  isListening = true,
  onPress,
}) {
  const active = useScreenActive();
  const orbit1 = useSharedValue(0);
  const orbit2 = useSharedValue(0);
  const floatY = useSharedValue(0);
  const breathe = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      cancelAnimation(orbit1);
      cancelAnimation(orbit2);
      cancelAnimation(floatY);
      cancelAnimation(breathe);
      return;
    }
    orbit1.value = withRepeat(
      withTiming(360, { duration: variant === 'voice' ? 12000 : 18000, easing: Easing.linear }),
      -1,
      false
    );
    orbit2.value = withRepeat(
      withTiming(-360, { duration: 14000, easing: Easing.linear }),
      -1,
      false
    );
    floatY.value = withRepeat(
      withSequence(
        withTiming(-3.5, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    return () => {
      cancelAnimation(orbit1);
      cancelAnimation(orbit2);
      cancelAnimation(floatY);
      cancelAnimation(breathe);
    };
  }, [active, breathe, floatY, orbit1, orbit2, variant]);

  const orbit1Style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${orbit1.value}deg` }],
  }));

  const orbit2Style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${orbit2.value}deg` }],
  }));

  const coreFloatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }, { scale: 1 + breathe.value * 0.025 }],
  }));

  const breatheHaloStyle = useAnimatedStyle(() => ({
    opacity: isListening ? 0.78 + breathe.value * 0.22 : 0.35,
    transform: [{ scale: isListening ? 0.95 + breathe.value * 0.1 : 0.86 }],
  }));

  const rippleOuterStyle = useAnimatedStyle(() => ({
    opacity: isListening ? 0.22 + breathe.value * 0.14 : 0.08,
    transform: [{ scale: isListening ? 0.96 + breathe.value * 0.1 : 0.84 }],
  }));

  if (variant === 'voice') {
    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onPress}
        style={{
          width: 276,
          height: 276,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              width: 276,
              height: 276,
              borderRadius: 138,
              backgroundColor: 'rgba(0, 241, 253, 0.06)',
              borderWidth: 1,
              borderColor: 'rgba(0, 241, 253, 0.12)',
            },
            rippleOuterStyle,
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              width: 244,
              height: 244,
              borderRadius: 122,
              backgroundColor: 'rgba(108, 60, 233, 0.14)',
              borderWidth: 1,
              borderColor: 'rgba(205, 189, 255, 0.16)',
            },
            breatheHaloStyle,
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              width: 220,
              height: 220,
              borderRadius: 110,
              backgroundColor: 'rgba(0, 241, 253, 0.1)',
            },
            breatheHaloStyle,
          ]}
        />

        <Animated.View
          style={[
            {
              width: 204,
              height: 204,
              borderRadius: 102,
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#0d0d16',
              borderWidth: 1.5,
              borderColor: 'rgba(255, 255, 255, 0.25)',
              shadowColor: AURA_COLORS.secondaryContainer,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: isListening ? 0.55 : 0.2,
              shadowRadius: 36,
              elevation: 18,
            },
            coreFloatStyle,
          ]}>
          <LinearGradient
            colors={['#0d0d16', '#21154a', '#5532c5', '#00f1fd']}
            start={{ x: 0.1, y: 0.9 }}
            end={{ x: 0.9, y: 0.1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <Animated.View style={[{ position: 'absolute', width: 204, height: 204 }, orbit1Style]}>
            <Svg width={204} height={204} viewBox="0 0 200 200">
              <Defs>
                <RadialGradient id="voicePlasma1" cx="40%" cy="30%" r="70%">
                  <Stop offset="0%" stopColor="#00f1fd" stopOpacity="0.92" />
                  <Stop offset="50%" stopColor="#7240db" stopOpacity="0.6" />
                  <Stop offset="100%" stopColor="#0d0d16" stopOpacity="0" />
                </RadialGradient>
                <SvgLinearGradient id="voicePlasma2" x1="0%" y1="100%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor="#cdbdff" stopOpacity="0.82" />
                  <Stop offset="70%" stopColor="#00f1fd" stopOpacity="0.32" />
                  <Stop offset="100%" stopColor="#00373a" stopOpacity="0" />
                </SvgLinearGradient>
              </Defs>
              <Circle cx="100" cy="100" r="96" fill="url(#voicePlasma1)" />
              <Path
                d="M 30,100 Q 60,30 110,60 T 170,110 Q 140,170 90,140 Z"
                fill="url(#voicePlasma2)"
              />
              <Path
                d="M 50,70 Q 100,10 150,70 T 130,150 Q 80,180 50,120 Z"
                fill="#00f1fd"
                opacity={0.32}
              />
            </Svg>
          </Animated.View>

          <Svg
            width={204}
            height={204}
            viewBox="0 0 204 204"
            style={{ position: 'absolute' }}
            pointerEvents="none">
            <Defs>
              <RadialGradient id="voiceSpec" cx="35%" cy="22%" r="42%">
                <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
                <Stop offset="60%" stopColor="#dcfdff" stopOpacity="0.16" />
                <Stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Ellipse cx="78" cy="48" rx="58" ry="28" fill="url(#voiceSpec)" />
          </Svg>

          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: 'rgba(111, 246, 255, 0.22)',
              borderWidth: 1,
              borderColor: 'rgba(0, 241, 253, 0.4)',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: 'rgba(0, 241, 253, 0.72)',
                shadowColor: '#00f1fd',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 1,
                shadowRadius: 18,
              }}
            />
          </View>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  if (variant === 'compact') {
    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onPress}
        style={{
          width: 140,
          height: 140,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              width: 136,
              height: 136,
              borderRadius: 68,
            },
            breatheHaloStyle,
          ]}>
          <Svg width={136} height={136} viewBox="0 0 136 136">
            <Defs>
              <RadialGradient id="compactHalo" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor="#00f1fd" stopOpacity="0.48" />
                <Stop offset="50%" stopColor="#6c3ce9" stopOpacity="0.34" />
                <Stop offset="100%" stopColor="#7240db" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle cx="68" cy="68" r="68" fill="url(#compactHalo)" />
          </Svg>
        </Animated.View>

        <Animated.View style={[coreFloatStyle]}>
          <LinearGradient
            colors={[
              AURA_COLORS.secondaryContainer,
              AURA_COLORS.tertiary,
              AURA_COLORS.primaryContainer,
            ]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{
              width: 112,
              height: 112,
              borderRadius: 56,
              padding: 2.5,
              shadowColor: AURA_COLORS.secondaryContainer,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.45,
              shadowRadius: 20,
              elevation: 12,
            }}>
            <View
              style={{
                flex: 1,
                borderRadius: 54,
                backgroundColor: AURA_COLORS.surfaceContainerLowest,
                overflow: 'hidden',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    width: 110,
                    height: 110,
                  },
                  orbit1Style,
                ]}>
                <Svg width={110} height={110} viewBox="0 0 110 110">
                  <Defs>
                    <RadialGradient id="compactSwirl1" cx="30%" cy="30%" r="55%">
                      <Stop offset="0%" stopColor="#00f1fd" stopOpacity="0.52" />
                      <Stop offset="100%" stopColor="#00f1fd" stopOpacity="0" />
                    </RadialGradient>
                    <RadialGradient id="compactSwirl2" cx="72%" cy="75%" r="55%">
                      <Stop offset="0%" stopColor="#7240db" stopOpacity="0.65" />
                      <Stop offset="100%" stopColor="#7240db" stopOpacity="0" />
                    </RadialGradient>
                  </Defs>
                  <Circle cx="55" cy="55" r="55" fill="url(#compactSwirl1)" />
                  <Circle cx="55" cy="55" r="55" fill="url(#compactSwirl2)" />
                </Svg>
              </Animated.View>
              <MaterialIcon name="graphic_eq" size={32} color={AURA_COLORS.secondary} />
            </View>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  // Default: 'home' — matches the original Stitch Home Dashboard orb pixel-for-pixel
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={{
        width: 168,
        height: 168,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {/* 1. Soft Volumetric Cyan-Violet Aura Glow */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            width: 210,
            height: 210,
          },
          breatheHaloStyle,
        ]}>
        <Svg width={210} height={210} viewBox="0 0 210 210">
          <Defs>
            <RadialGradient id="homeAuraGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#00f1fd" stopOpacity="0.6" />
              <Stop offset="34%" stopColor="#4f6ef7" stopOpacity="0.42" />
              <Stop offset="62%" stopColor="#6c3ce9" stopOpacity="0.22" />
              <Stop offset="100%" stopColor="#13121c" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx="105" cy="105" r="105" fill="url(#homeAuraGlow)" />
        </Svg>
      </Animated.View>

      {/* 2. Outer Orbital Gyro Ring with 4 Soft Glowing Cardinal Satellites */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            width: 158,
            height: 158,
            borderRadius: 79,
            borderWidth: 1,
            borderColor: 'rgba(0, 241, 253, 0.32)',
          },
          orbit1Style,
        ]}>
        <View
          style={{
            position: 'absolute',
            top: -4,
            left: '50%',
            marginLeft: -4,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: AURA_COLORS.secondaryContainer,
            shadowColor: AURA_COLORS.secondaryContainer,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            shadowRadius: 8,
          }}
        />
        <View
          style={{
            position: 'absolute',
            bottom: -3,
            left: '50%',
            marginLeft: -3,
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: AURA_COLORS.primary,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: '50%',
            left: -3,
            marginTop: -3,
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: AURA_COLORS.tertiary,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: '50%',
            right: -3,
            marginTop: -3,
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: AURA_COLORS.secondaryFixed,
          }}
        />
      </Animated.View>

      {/* 3. Subtle Inner Dashed Orbit */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            width: 132,
            height: 132,
            borderRadius: 66,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: 'rgba(205, 189, 255, 0.2)',
          },
          orbit2Style,
        ]}
      />

      {/* 4. Luminous Glassmorphic Cosmic Sphere */}
      <Animated.View
        style={[
          {
            width: 112,
            height: 112,
            borderRadius: 56,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#2d3796',
            borderWidth: 1.2,
            borderColor: 'rgba(130, 240, 255, 0.45)',
            shadowColor: '#00f1fd',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.55,
            shadowRadius: 24,
            elevation: 14,
          },
          coreFloatStyle,
        ]}>
        {/* Smooth multi-stop sphere plasma + feathered specular highlight in SVG */}
        <Svg width={112} height={112} viewBox="0 0 112 112" style={{ position: 'absolute' }}>
          <Defs>
            <RadialGradient id="homeSphereBase" cx="34%" cy="30%" r="76%">
              <Stop offset="0%" stopColor="#5ff9ff" stopOpacity="1" />
              <Stop offset="34%" stopColor="#4c84ff" stopOpacity="1" />
              <Stop offset="66%" stopColor="#6c45f2" stopOpacity="1" />
              <Stop offset="100%" stopColor="#262c78" stopOpacity="1" />
            </RadialGradient>
            <RadialGradient id="homeCyanRim" cx="68%" cy="80%" r="55%">
              <Stop offset="0%" stopColor="#00f1fd" stopOpacity="0.48" />
              <Stop offset="60%" stopColor="#38bdf8" stopOpacity="0.16" />
              <Stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="homeSoftSpec" cx="44%" cy="38%" r="52%">
              <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.72" />
              <Stop offset="55%" stopColor="#dcfdff" stopOpacity="0.24" />
              <Stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx="56" cy="56" r="56" fill="url(#homeSphereBase)" />
          <Circle cx="56" cy="56" r="56" fill="url(#homeCyanRim)" />
          {/* Soft feathered upper-left glass highlight */}
          <Ellipse cx="44" cy="24" rx="34" ry="16" fill="url(#homeSoftSpec)" />
        </Svg>

        {/* Central Iris Neural Aperture */}
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            backgroundColor: 'rgba(13, 15, 28, 0.84)',
            borderWidth: 1.5,
            borderColor: 'rgba(0, 241, 253, 0.72)',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: AURA_COLORS.secondaryContainer,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.9,
            shadowRadius: 12,
          }}>
          <LinearGradient
            colors={['#00f1fd', '#7240db', '#ec4899']}
            start={{ x: 0, y: 1 }}
            end={{ x: 1, y: 0 }}
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.92,
            }}>
            <View
              style={{
                width: 15,
                height: 15,
                borderRadius: 7.5,
                backgroundColor: '#ffffff',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#00f1fd',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 1,
                shadowRadius: 8,
              }}>
              <View
                style={{
                  width: 5.5,
                  height: 5.5,
                  borderRadius: 2.75,
                  backgroundColor: AURA_COLORS.secondaryContainer,
                }}
              />
            </View>
          </LinearGradient>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
});
