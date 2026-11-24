import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmbientGlow } from './AmbientGlow';
import { MaterialIcon, type MaterialIconName } from './MaterialIcon';
import { PulsingDot } from './PulsingDot';
import { AURA_COLORS, AURA_FONTS, getTabBarTotalHeight } from './theme';

const UPCOMING_FEATURES: {
  title: string;
  desc: string;
  icon: MaterialIconName;
  tint: string;
  iconColor: string;
}[] = [
  {
    title: 'Smart Tasks & Focus',
    desc: 'Turn notes & voice memos into prioritized tasks locally.',
    icon: 'task_alt',
    tint: 'rgba(0, 241, 253, 0.14)',
    iconColor: AURA_COLORS.secondaryFixed,
  },
  {
    title: 'Secure Offline Notes',
    desc: 'Encrypted local notes with instant on-device takeaways.',
    icon: 'description',
    tint: 'rgba(205, 189, 255, 0.15)',
    iconColor: AURA_COLORS.primary,
  },
  {
    title: 'Private Budget & Expenses',
    desc: 'Track spending & cross-reference receipts with zero cloud.',
    icon: 'account_balance_wallet',
    tint: 'rgba(0, 241, 253, 0.14)',
    iconColor: AURA_COLORS.secondaryFixed,
  },
  {
    title: 'Smart Grocery & Vault',
    desc: 'Meal-plan lists & airgapped personal records on-device.',
    icon: 'lock',
    tint: 'rgba(114, 64, 219, 0.22)',
    iconColor: AURA_COLORS.tertiaryFixed,
  },
];

/**
 * Full-screen non-interactive frosted overlay for Utilities Hub.
 * Blocks all touch/scroll interaction on underlying content while keeping
 * the screen's visual depth subtly visible beneath dark frosted glass.
 */
export const UtilitiesComingSoonOverlay: React.FC = () => {
  const insets = useSafeAreaInsets();
  const tabBarSpace = getTabBarTotalHeight(insets.bottom);

  return (
    <View
      pointerEvents="auto"
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: tabBarSpace,
        zIndex: 80,
        elevation: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: insets.top + 16,
        paddingBottom: 16,
        paddingHorizontal: 20,
      }}>
      {/* Frosted glass backdrop */}
      {Platform.OS !== 'web' && (
        <BlurView
          intensity={Platform.OS === 'ios' ? 42 : 28}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Deep obsidian scrim */}
      <LinearGradient
        colors={['rgba(10, 10, 18, 0.72)', 'rgba(13, 12, 22, 0.84)', 'rgba(8, 8, 15, 0.9)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Ambient accent glows */}
      <AmbientGlow
        id="comingSoonGlow1"
        color={AURA_COLORS.primaryContainer}
        size={300}
        opacity={0.28}
        style={{ top: '18%', alignSelf: 'center' }}
      />
      <AmbientGlow
        id="comingSoonGlow2"
        color={AURA_COLORS.secondaryContainer}
        size={220}
        opacity={0.14}
        style={{ bottom: '20%', right: -40 }}
      />

      {/* Premium Gradient Border Card */}
      <LinearGradient
        colors={[
          'rgba(111, 246, 255, 0.34)',
          'rgba(108, 60, 233, 0.36)',
          'rgba(255, 255, 255, 0.08)',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: '100%',
          maxWidth: 380,
          borderRadius: 30,
          padding: 1.2,
          shadowColor: AURA_COLORS.primaryContainer,
          shadowOffset: { width: 0, height: 18 },
          shadowOpacity: 0.35,
          shadowRadius: 32,
          elevation: 20,
        }}>
        <View
          style={{
            borderRadius: 29,
            backgroundColor: 'rgba(18, 17, 28, 0.94)',
            paddingHorizontal: 20,
            paddingVertical: 22,
            gap: 16,
          }}>
          {/* Status Pill + Icon */}
          <View style={{ alignItems: 'center', gap: 12 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 7,
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: 999,
                backgroundColor: 'rgba(41, 41, 51, 0.85)',
                borderWidth: 1,
                borderColor: 'rgba(0, 241, 253, 0.24)',
              }}>
              <PulsingDot size={6} color={AURA_COLORS.secondaryContainer} />
              <Text
                style={{
                  fontFamily: AURA_FONTS.monoSemiBold,
                  fontSize: 10,
                  letterSpacing: 0.9,
                  color: AURA_COLORS.secondaryFixed,
                }}>
                COMING SOON · ZERO-CLOUD SUITE
              </Text>
            </View>

            <LinearGradient
              colors={[
                AURA_COLORS.primaryContainer,
                AURA_COLORS.tertiaryContainer,
                AURA_COLORS.secondaryContainer,
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 54,
                height: 54,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: AURA_COLORS.secondaryContainer,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.35,
                shadowRadius: 16,
              }}>
              <MaterialIcon name="auto_awesome" size={26} color={AURA_COLORS.onPrimary} />
            </LinearGradient>

            <View style={{ alignItems: 'center', gap: 5 }}>
              <Text
                style={{
                  fontFamily: AURA_FONTS.sansBold,
                  fontSize: 22,
                  letterSpacing: -0.4,
                  color: AURA_COLORS.onSurface,
                  textAlign: 'center',
                }}>
                Aura Utilities Hub
              </Text>
              <Text
                style={{
                  fontFamily: AURA_FONTS.sansRegular,
                  fontSize: 13,
                  lineHeight: 19,
                  color: AURA_COLORS.onSurfaceVariant,
                  textAlign: 'center',
                  paddingHorizontal: 6,
                }}>
                Your private on-device productivity workspace — powered directly by your local AI
                models.
              </Text>
            </View>
          </View>

          {/* Feature Preview List */}
          <View style={{ gap: 9 }}>
            {UPCOMING_FEATURES.map((feat) => (
              <View
                key={feat.title}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 11,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 16,
                  backgroundColor: 'rgba(31, 31, 42, 0.78)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.05)',
                }}>
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 12,
                    backgroundColor: feat.tint,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <MaterialIcon name={feat.icon} size={17} color={feat.iconColor} />
                </View>
                <View style={{ flex: 1, gap: 1.5 }}>
                  <Text
                    style={{
                      fontFamily: AURA_FONTS.sansSemiBold,
                      fontSize: 13,
                      color: AURA_COLORS.onSurface,
                    }}>
                    {feat.title}
                  </Text>
                  <Text
                    numberOfLines={2}
                    style={{
                      fontFamily: AURA_FONTS.sansRegular,
                      fontSize: 11.5,
                      lineHeight: 15.5,
                      color: AURA_COLORS.onSurfaceVariant,
                    }}>
                    {feat.desc}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Footer Badge */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingTop: 2,
            }}>
            <MaterialIcon name="verified_user" size={13} color={AURA_COLORS.secondaryFixed} />
            <Text
              style={{
                fontFamily: AURA_FONTS.monoMedium,
                fontSize: 10.5,
                color: AURA_COLORS.outline,
              }}>
              100% On-Device · Arriving in an upcoming release
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};
