import React from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { useAppStore } from '@/store/app.store';
import { PulsingDot } from './PulsingDot';
import { AURA_COLORS, AURA_FONTS, HEADER_CONTENT_HEIGHT } from './theme';

interface AuraHeaderProps {
  subtitle: string;
  onProfilePress?: () => void;
}

const AuraLogoMark: React.FC = () => (
  <View
    style={{
      width: 34,
      height: 34,
      borderRadius: 9,
      overflow: 'hidden',
      backgroundColor: '#090812',
      borderWidth: 1,
      borderColor: 'rgba(205, 189, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
    <Svg width={34} height={34} viewBox="0 0 34 34">
      <Defs>
        <RadialGradient id="logoBg" cx="50%" cy="46%" r="55%">
          <Stop offset="0%" stopColor="#6c3ce9" stopOpacity="0.65" />
          <Stop offset="100%" stopColor="#090812" stopOpacity="1" />
        </RadialGradient>
        <LinearGradient id="logoRing" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#00f1fd" />
          <Stop offset="50%" stopColor="#cdbdff" />
          <Stop offset="100%" stopColor="#7240db" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="34" height="34" fill="url(#logoBg)" />
      <Circle cx="17" cy="17" r="9.5" stroke="url(#logoRing)" strokeWidth="2.1" fill="none" />
      <Path
        d="M11 17.2C13 13 20.5 13 23 17.2C20.5 21.4 13.5 21 11 17.2Z"
        stroke="#00f1fd"
        strokeWidth="1.4"
        fill="rgba(108,60,233,0.45)"
      />
      <Circle cx="17" cy="17" r="2.5" fill="#dcfdff" />
    </Svg>
  </View>
);

export const AuraHeader: React.FC<AuraHeaderProps> = ({ subtitle, onProfilePress }) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const userName = useAppStore((s) => s.userName);
  const avatarInitial = userName.trim().charAt(0).toUpperCase() || 'A';
  const handleProfilePress = onProfilePress ?? (() => router.push('/settings'));

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        paddingTop: insets.top,
        backgroundColor: Platform.OS === 'ios' ? 'rgba(19, 18, 28, 0.8)' : 'rgba(19, 18, 28, 0.95)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 18,
        elevation: 10,
      }}>
      {Platform.OS === 'ios' && (
        <BlurView
          intensity={45}
          tint="dark"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      )}
      <View
        style={{
          height: HEADER_CONTENT_HEIGHT,
          paddingHorizontal: 20,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}>
        {/* Left: Logo + Title + Telemetry Pill */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            flex: 1,
            minWidth: 0,
          }}>
          <AuraLogoMark />
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text
                style={{
                  fontFamily: AURA_FONTS.sansSemiBold,
                  fontSize: 17,
                  lineHeight: 22,
                  color: AURA_COLORS.onSurface,
                  letterSpacing: -0.2,
                }}>
                Aura OS
              </Text>
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: AURA_FONTS.sansRegular,
                  fontSize: 12.5,
                  color: AURA_COLORS.onSurfaceVariant,
                  flexShrink: 1,
                }}>
                {subtitle}
              </Text>
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 8,
                paddingVertical: 2.5,
                marginTop: 3,
                borderRadius: 999,
                backgroundColor: 'rgba(41, 41, 51, 0.9)',
                alignSelf: 'flex-start',
              }}>
              <PulsingDot size={6} color={AURA_COLORS.secondaryContainer} />
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: AURA_FONTS.monoMedium,
                  fontSize: 10.5,
                  lineHeight: 14,
                  color: AURA_COLORS.secondary,
                  letterSpacing: -0.1,
                }}>
                100% On-Device · Secure Local NPU
              </Text>
            </View>
          </View>
        </View>

        {/* Right: Profile Avatar Button */}
        <TouchableOpacity
          activeOpacity={0.78}
          accessibilityLabel="Open Profile and Settings"
          onPress={handleProfilePress}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: 'rgba(41, 41, 51, 0.78)',
            borderWidth: 1,
            borderColor: 'rgba(205, 189, 255, 0.14)',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: '#1f1f2b',
              borderWidth: 1,
              borderColor: 'rgba(205, 189, 255, 0.22)',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text
              style={{
                fontFamily: AURA_FONTS.sansSemiBold,
                fontSize: 12,
                color: AURA_COLORS.primary,
              }}>
              {avatarInitial}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};
