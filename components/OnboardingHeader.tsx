import React from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaterialIcon } from './MaterialIcon';
import { AURA_COLORS, AURA_FONTS } from './theme';

export const ONBOARDING_HEADER_HEIGHT = 58;

interface OnboardingHeaderProps {
  variant: 'welcome' | 'step';
  title?: string;
  activeStep?: 1 | 2 | 3;
  onBack?: () => void;
}

export const OnboardingHeader: React.FC<OnboardingHeaderProps> = ({
  variant,
  title,
  activeStep = 2,
  onBack,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        paddingTop: insets.top,
        backgroundColor:
          Platform.OS === 'web' ? 'rgba(19, 18, 28, 0.88)' : 'rgba(19, 18, 28, 0.72)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.04)',
      }}>
      {Platform.OS !== 'web' && (
        <BlurView
          intensity={40}
          tint="dark"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      )}

      {variant === 'welcome' ? (
        <View
          style={{
            height: ONBOARDING_HEADER_HEIGHT,
            paddingHorizontal: 20,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 7,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: 'rgba(41, 41, 51, 0.7)',
            }}>
            <MaterialIcon name="lock" size={14} color={AURA_COLORS.secondary} />
            <Text
              style={{
                fontFamily: AURA_FONTS.monoMedium,
                fontSize: 11,
                letterSpacing: 0.7,
                color: AURA_COLORS.secondary,
              }}>
              100% ON-DEVICE
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: AURA_COLORS.secondary,
                shadowColor: AURA_COLORS.secondaryContainer,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.95,
                shadowRadius: 8,
              }}
            />
            <Text
              style={{
                fontFamily: AURA_FONTS.monoMedium,
                fontSize: 11,
                letterSpacing: 0.8,
                color: AURA_COLORS.onSurfaceVariant,
              }}>
              AIR-GAPPED
            </Text>
          </View>
        </View>
      ) : (
        <View
          style={{
            height: ONBOARDING_HEADER_HEIGHT,
            paddingHorizontal: 20,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
          <TouchableOpacity
            activeOpacity={0.75}
            accessibilityLabel="Go back"
            onPress={onBack}
            style={{
              width: 40,
              height: 40,
              marginLeft: -8,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <MaterialIcon name="arrow_back_ios_new" size={20} color={AURA_COLORS.onSurface} />
          </TouchableOpacity>

          <View style={{ alignItems: 'center' }}>
            <Text
              style={{
                fontFamily: AURA_FONTS.monoMedium,
                fontSize: 11,
                letterSpacing: 1.2,
                color: AURA_COLORS.primary,
                textTransform: 'uppercase',
              }}>
              {title}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 }}>
              {[1, 2, 3].map((step) => {
                const isActive = step === activeStep;
                const isCompleted = step < activeStep;
                return (
                  <View
                    key={step}
                    style={{
                      width: isActive ? 22 : 7,
                      height: 4,
                      borderRadius: 999,
                      backgroundColor: isActive
                        ? AURA_COLORS.primary
                        : isCompleted
                          ? AURA_COLORS.secondaryContainer
                          : AURA_COLORS.surfaceVariant,
                    }}
                  />
                );
              })}
            </View>
          </View>

          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: AURA_COLORS.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <MaterialIcon name="person" size={18} color={AURA_COLORS.onPrimary} />
          </View>
        </View>
      )}
    </View>
  );
};
