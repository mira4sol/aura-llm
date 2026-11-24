import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmbientGlow } from '../../components/AmbientGlow';
import { MaterialIcon } from '../../components/MaterialIcon';
import { ONBOARDING_HEADER_HEIGHT, OnboardingHeader } from '../../components/OnboardingHeader';
import { PulsingDot } from '../../components/PulsingDot';
import { AURA_COLORS, AURA_FONTS } from '../../components/theme';
import { useAppStore } from '../../store/app.store';

function validateUserName(raw: string): string | null {
  const value = raw.trim();
  if (value.length === 0) {
    return 'Please enter your name to continue.';
  }
  if (value.length < 2) {
    return 'Name must be at least 2 characters.';
  }
  if (!/^[a-zA-Z0-9 _'-]+$/.test(value)) {
    return 'Use only letters, numbers, spaces, hyphens, or apostrophes.';
  }
  if (!/[a-zA-Z]/.test(value)) {
    return 'Name must include at least one letter.';
  }
  return null;
}

export default function OnboardingNameSetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const storedName = useAppStore((state) => state.userName);
  const setUserName = useAppStore((state) => state.setUserName);

  const [nameInput, setNameInput] = useState(storedName);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const validationError = validateUserName(nameInput);
  const showError = Boolean(validationError) && (hasAttemptedSubmit || nameInput.length > 0);

  const spin = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    spin.value = withRepeat(withTiming(360, { duration: 9000, easing: Easing.linear }), -1, false);
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [pulse, spin]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.45 + pulse.value * 0.45,
    transform: [{ scale: 0.96 + pulse.value * 0.06 }],
  }));

  const handleContinue = () => {
    setHasAttemptedSubmit(true);
    const error = validateUserName(nameInput);
    if (error) return;
    setUserName(nameInput.trim());
    router.push('/onboarding/model');
  };

  const topPadding = insets.top + ONBOARDING_HEADER_HEIGHT + 10;
  const bottomPadding = Math.max(insets.bottom, 16) + 18;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: AURA_COLORS.surface }}>
      <OnboardingHeader
        variant="step"
        title="Identity Setup"
        activeStep={2}
        onBack={() => router.back()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: topPadding,
          paddingBottom: bottomPadding,
          paddingHorizontal: 20,
        }}>
        {/* Step Navigation & Status Pill */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}>
          <TouchableOpacity
            activeOpacity={0.76}
            onPress={() => router.back()}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              paddingHorizontal: 11,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: AURA_COLORS.surfaceContainerLow,
            }}>
            <MaterialIcon name="arrow_back" size={16} color={AURA_COLORS.onSurfaceVariant} />
            <Text
              style={{
                fontFamily: AURA_FONTS.sansSemiBold,
                fontSize: 13,
                color: AURA_COLORS.onSurfaceVariant,
              }}>
              Back
            </Text>
          </TouchableOpacity>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: AURA_COLORS.surfaceContainerHigh,
            }}>
            <PulsingDot size={6} color={AURA_COLORS.secondaryFixed} ring />
            <Text
              style={{
                fontFamily: AURA_FONTS.monoMedium,
                fontSize: 10.5,
                letterSpacing: 0.7,
                color: AURA_COLORS.onSurfaceVariant,
              }}>
              STEP 2 OF 3 • IDENTITY
            </Text>
          </View>
        </View>

        {/* Visual Anchor: Pulsing Neural Ring Orb with Violet Aura */}
        <View
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 18,
            marginBottom: 6,
          }}>
          <AmbientGlow
            id="step2Glow1"
            color={AURA_COLORS.primaryContainer}
            size={200}
            opacity={0.32}
          />
          <AmbientGlow
            id="step2Glow2"
            color={AURA_COLORS.secondaryContainer}
            size={130}
            opacity={0.22}
          />

          <View
            style={{
              width: 114,
              height: 114,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            {/* Spinning Outer Gradient Ring */}
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: 'absolute',
                  width: 114,
                  height: 114,
                  borderRadius: 57,
                  overflow: 'hidden',
                },
                spinStyle,
              ]}>
              <LinearGradient
                colors={[
                  AURA_COLORS.primaryContainer,
                  AURA_COLORS.tertiary,
                  AURA_COLORS.secondaryContainer,
                ]}
                start={{ x: 0, y: 1 }}
                end={{ x: 1, y: 0 }}
                style={{ flex: 1, opacity: 0.45 }}
              />
            </Animated.View>

            {/* Dark Mask Ring */}
            <View
              style={{
                width: 106,
                height: 106,
                borderRadius: 53,
                backgroundColor: AURA_COLORS.surfaceDim,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              {/* Pulsing Inner Synaptic Ring */}
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    width: 88,
                    height: 88,
                    borderRadius: 44,
                    overflow: 'hidden',
                  },
                  pulseStyle,
                ]}>
                <LinearGradient
                  colors={[
                    'rgba(0, 220, 230, 0.45)',
                    'rgba(205, 189, 255, 0.35)',
                    'rgba(114, 64, 219, 0.55)',
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ flex: 1 }}
                />
              </Animated.View>

              {/* Center Core */}
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: AURA_COLORS.surfaceContainerLowest,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <MaterialIcon name="graphic_eq" size={30} color={AURA_COLORS.primary} />
                <View
                  style={{
                    position: 'absolute',
                    top: 14,
                    right: 14,
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: AURA_COLORS.secondaryFixed,
                    shadowColor: AURA_COLORS.secondaryContainer,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 1,
                    shadowRadius: 8,
                  }}
                />
              </View>
            </View>

            {/* Orbiting Particle Nodes */}
            <View
              style={{
                position: 'absolute',
                top: 4,
                right: 12,
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: AURA_COLORS.secondaryFixed,
              }}
            />
            <View
              style={{
                position: 'absolute',
                bottom: 8,
                left: 16,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: AURA_COLORS.tertiaryFixed,
              }}
            />
          </View>
        </View>

        {/* Headline & Subtext */}
        <View style={{ alignItems: 'center', paddingHorizontal: 8, marginBottom: 22 }}>
          <Text
            style={{
              fontFamily: AURA_FONTS.sansBold,
              fontSize: 30,
              lineHeight: 36,
              letterSpacing: -0.6,
              color: AURA_COLORS.onSurface,
              textAlign: 'center',
            }}>
            What should Aura call you?
          </Text>
          <Text
            style={{
              marginTop: 8,
              fontFamily: AURA_FONTS.sansRegular,
              fontSize: 14,
              lineHeight: 20,
              color: AURA_COLORS.onSurfaceVariant,
              textAlign: 'center',
              maxWidth: 330,
            }}>
            Aura uses your preferred name solely for offline conversational voice synthesis and
            daily personalized briefings.
          </Text>
        </View>

        {/* Input Container & Custom Identity Form */}
        <View
          style={{
            width: '100%',
            backgroundColor: AURA_COLORS.surfaceContainerLow,
            borderRadius: 28,
            padding: 16,
            marginBottom: 16,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.05)',
          }}>
          {/* Top Surface Highlight Reflection */}
          <LinearGradient
            colors={['transparent', 'rgba(205, 189, 255, 0.42)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1 }}
          />

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
              gap: 8,
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialIcon name="badge" size={18} color={AURA_COLORS.primary} />
              <Text
                style={{
                  fontFamily: AURA_FONTS.sansSemiBold,
                  fontSize: 13.5,
                  color: AURA_COLORS.onSurfaceVariant,
                }}>
                Preferred Name
              </Text>
            </View>
            <Text
              numberOfLines={1}
              style={{
                fontFamily: AURA_FONTS.monoMedium,
                fontSize: 10,
                letterSpacing: 0.4,
                color: showError ? '#ff5a6e' : AURA_COLORS.secondaryFixedDim,
              }}>
              {showError ? 'INVALID_IDENTITY' : 'LOCAL_ENCLAVE_READY'}
            </Text>
          </View>

          {/* Glowing Interactive Pill Field */}
          <View
            style={{
              borderRadius: 999,
              overflow: 'hidden',
              backgroundColor: AURA_COLORS.surfaceContainerLowest,
              borderWidth: showError ? 1.5 : 1,
              borderColor: showError ? '#ff5a6e' : 'rgba(0, 241, 253, 0.2)',
            }}>
            <LinearGradient
              colors={
                showError
                  ? [
                      'rgba(255, 90, 110, 0.2)',
                      'rgba(147, 0, 10, 0.22)',
                      'rgba(255, 90, 110, 0.14)',
                    ]
                  : [
                      'rgba(0, 241, 253, 0.16)',
                      'rgba(108, 60, 233, 0.14)',
                      'rgba(114, 64, 219, 0.18)',
                    ]
              }
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 14,
                paddingVertical: 10,
                gap: 10,
              }}>
              <MaterialIcon
                name="face"
                size={22}
                color={showError ? '#ff5a6e' : AURA_COLORS.onSurfaceVariant}
              />
              <TextInput
                value={nameInput}
                onChangeText={setNameInput}
                placeholder="Enter your name..."
                placeholderTextColor={AURA_COLORS.outline}
                maxLength={28}
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleContinue}
                style={{
                  flex: 1,
                  fontFamily: AURA_FONTS.sansSemiBold,
                  fontSize: 19,
                  lineHeight: 24,
                  color: showError ? AURA_COLORS.error : AURA_COLORS.onSurface,
                  paddingVertical: 2,
                }}
              />
              {nameInput.length > 0 && (
                <TouchableOpacity
                  activeOpacity={0.75}
                  accessibilityLabel="Clear name"
                  onPress={() => setNameInput('')}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: showError
                      ? 'rgba(255, 90, 110, 0.22)'
                      : AURA_COLORS.surfaceVariant,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <MaterialIcon
                    name="close"
                    size={15}
                    color={showError ? '#ff5a6e' : AURA_COLORS.onSurfaceVariant}
                  />
                </TouchableOpacity>
              )}
            </LinearGradient>
          </View>

          {showError && validationError && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                marginTop: 8,
                paddingHorizontal: 6,
              }}>
              <MaterialIcon name="close" size={14} color="#ff5a6e" />
              <Text
                style={{
                  flex: 1,
                  fontFamily: AURA_FONTS.sansMedium,
                  fontSize: 12,
                  color: '#ff5a6e',
                }}>
                {validationError}
              </Text>
            </View>
          )}

          {/* Privacy Verification Assurance Tag */}
          <View
            style={{
              marginTop: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              backgroundColor: AURA_COLORS.surfaceContainer,
              borderRadius: 16,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: 'rgba(0, 241, 253, 0.18)',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <MaterialIcon name="lock" size={13} color={AURA_COLORS.secondaryFixed} />
            </View>
            <Text
              style={{
                flex: 1,
                fontFamily: AURA_FONTS.sansRegular,
                fontSize: 12,
                lineHeight: 17.5,
                color: AURA_COLORS.onSurfaceVariant,
              }}>
              <Text style={{ fontFamily: AURA_FONTS.sansSemiBold, color: AURA_COLORS.onSurface }}>
                Stored only on this phone.
              </Text>{' '}
              Zero network calls • 100% Offline execution enclaved in local storage.
            </Text>
          </View>
        </View>

        {/* Live Greeting Preview */}
        <View
          style={{
            width: '100%',
            backgroundColor: 'rgba(31, 31, 40, 0.72)',
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 14,
            marginBottom: 22,
            borderWidth: 1,
            borderColor: 'rgba(205, 189, 255, 0.08)',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}>
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: 'rgba(108, 60, 233, 0.28)',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <MaterialIcon name="auto_awesome" size={17} color={AURA_COLORS.secondaryFixed} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: AURA_FONTS.monoMedium,
                fontSize: 10,
                letterSpacing: 0.8,
                color: AURA_COLORS.outline,
              }}>
              GREETING PREVIEW
            </Text>
            <Text
              numberOfLines={1}
              style={{
                fontFamily: AURA_FONTS.sansSemiBold,
                fontSize: 15,
                color:
                  !validationError && nameInput.trim().length > 0
                    ? AURA_COLORS.onSurface
                    : AURA_COLORS.onSurfaceVariant,
                marginTop: 2,
              }}>
              {!validationError && nameInput.trim().length > 0
                ? `“Good evening, ${nameInput.trim()}”`
                : '“Good evening, your name”'}
            </Text>
          </View>
        </View>

        {/* Bottom Action Bar / Primary CTA */}
        <View style={{ marginTop: 'auto', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={handleContinue}
            style={{
              width: '100%',
              borderRadius: 999,
              overflow: 'hidden',
              shadowColor: AURA_COLORS.primaryContainer,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.38,
              shadowRadius: 20,
              elevation: 10,
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
                  fontSize: 16,
                  color: AURA_COLORS.onPrimary,
                }}>
                Continue to Model Setup
              </Text>
              <MaterialIcon name="arrow_forward" size={19} color={AURA_COLORS.onPrimary} />
            </LinearGradient>
          </TouchableOpacity>

          <View
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8 }}>
            <MaterialIcon name="verified_user" size={15} color={AURA_COLORS.outline} />
            <Text
              style={{
                fontFamily: AURA_FONTS.sansRegular,
                fontSize: 12,
                color: AURA_COLORS.outline,
                textAlign: 'center',
              }}>
              You can change or reset your identity anytime in Vault Settings
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
