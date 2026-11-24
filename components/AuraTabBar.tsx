import React from 'react';
import {
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useKeyboardVisible } from '@/lib/hooks/useKeyboardVisible';
import { MaterialIcon, MaterialIconName } from './MaterialIcon';
import { AURA_COLORS, AURA_FONTS, getTabBarBottomInset, TAB_BAR_CONTENT_HEIGHT } from './theme';

interface TabRoute {
  key: string;
  name: string;
}

interface TabDescriptor {
  options: {
    title?: string;
    href?: string | null;
    tabBarItemStyle?: StyleProp<ViewStyle>;
  };
}

export interface AuraTabBarProps {
  state: {
    index: number;
    routes: TabRoute[];
  };
  descriptors: Record<string, TabDescriptor>;
  navigation: {
    emit: (event: { type: 'tabPress'; target: string; canPreventDefault: true }) => {
      defaultPrevented: boolean;
    };
    navigate: (name: string) => void;
  };
}

interface TabMeta {
  label: string;
  icon: MaterialIconName;
  isVoice?: boolean;
}

const TAB_META: Record<string, TabMeta> = {
  index: { label: 'Home', icon: 'dashboard' },
  assistant: { label: 'Assistant', icon: 'forum' },
  voice: { label: 'Voice', icon: 'graphic_eq', isVoice: true },
  utilities: { label: 'Utilities', icon: 'grid_view' },
  unified: { label: 'Unified', icon: 'auto_awesome' },
  models: { label: 'Models', icon: 'memory' },
};

export const AuraTabBar: React.FC<AuraTabBarProps> = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const { keyboardVisible } = useKeyboardVisible();
  const currentRouteName = state.routes[state.index]?.name ?? 'index';
  const bottomInset = getTabBarBottomInset(insets.bottom);

  if (keyboardVisible) {
    return null;
  }

  const visibleRoutes = state.routes.filter((route) => {
    const options = descriptors?.[route.key]?.options;
    if (options?.href === null) return false;
    const itemStyle = StyleSheet.flatten(options?.tabBarItemStyle);
    if (itemStyle?.display === 'none') return false;
    return true;
  });

  const isCompact = visibleRoutes.length >= 6;

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        paddingBottom: bottomInset,
        backgroundColor: Platform.OS === 'ios' ? 'rgba(13, 13, 22, 0.88)' : 'rgba(13, 13, 22, 0.96)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.06)',
        shadowColor: '#07070d',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.65,
        shadowRadius: 18,
        elevation: 20,
      }}>
      {Platform.OS === 'ios' && (
        <BlurView
          intensity={50}
          tint="dark"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      )}

      <View
        style={{
          height: TAB_BAR_CONTENT_HEIGHT,
          paddingTop: 5,
          paddingHorizontal: 10,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
        {visibleRoutes.map((route) => {
          const meta = TAB_META[route.name] ?? {
            label: descriptors?.[route.key]?.options?.title ?? route.name,
            icon: 'apps' as MaterialIconName,
          };
          const label = descriptors?.[route.key]?.options?.title ?? meta.label;
          const isFocused = currentRouteName === route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!event.defaultPrevented && !isFocused) {
              navigation.navigate(route.name);
            }
          };

          const iconColor = isFocused
            ? AURA_COLORS.secondaryFixed
            : meta.isVoice
              ? AURA_COLORS.secondary
              : AURA_COLORS.onSurfaceVariant;

          const labelColor = isFocused ? AURA_COLORS.secondaryFixed : AURA_COLORS.onSurfaceVariant;

          return (
            <TouchableOpacity
              key={route.key}
              activeOpacity={0.76}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={label}
              onPress={onPress}
              style={{
                flex: 1,
                height: 46,
                borderRadius: 999,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                marginHorizontal: 3,
                paddingHorizontal: 4,
                overflow: 'visible',
                backgroundColor: isFocused ? 'rgba(41, 41, 51, 0.72)' : 'transparent',
                borderWidth: isFocused ? 1 : 0,
                borderColor: isFocused ? 'rgba(0, 241, 253, 0.16)' : 'transparent',
                shadowColor: isFocused ? AURA_COLORS.secondaryContainer : 'transparent',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: isFocused ? 0.25 : 0,
                shadowRadius: 10,
              }}>
              {isFocused && (
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    width: 76,
                    height: 54,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Svg width={76} height={54} viewBox="0 0 76 54">
                    <Defs>
                      <RadialGradient id={`tabGlow-${route.name}`} cx="50%" cy="50%" r="50%">
                        <Stop offset="0%" stopColor="#00f1fd" stopOpacity="0.22" />
                        <Stop offset="100%" stopColor="#00f1fd" stopOpacity="0" />
                      </RadialGradient>
                    </Defs>
                    <Rect x="0" y="0" width="76" height="54" fill={`url(#tabGlow-${route.name})`} />
                  </Svg>
                </View>
              )}

              {meta.isVoice && (
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    top: 2,
                    width: 5.5,
                    height: 5.5,
                    borderRadius: 2.75,
                    backgroundColor: AURA_COLORS.secondaryContainer,
                    shadowColor: AURA_COLORS.secondaryContainer,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.95,
                    shadowRadius: 5,
                  }}
                />
              )}

              <MaterialIcon
                name={meta.icon}
                size={meta.isVoice ? (isCompact ? 21 : 23) : isCompact ? 19 : 21}
                color={iconColor}
              />
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
                style={{
                  fontFamily: isFocused ? AURA_FONTS.sansSemiBold : AURA_FONTS.sansMedium,
                  fontSize: isCompact ? 10 : 11,
                  lineHeight: 14,
                  color: labelColor,
                  letterSpacing: -0.1,
                }}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};
