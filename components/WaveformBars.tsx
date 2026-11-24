import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { AURA_COLORS } from './theme';

interface BarConfig {
  minHeight: number;
  maxHeight: number;
  color: string;
  duration: number;
  delay: number;
}

const VOICE_BARS: BarConfig[] = [
  { minHeight: 8, maxHeight: 16, color: AURA_COLORS.secondaryContainer, duration: 480, delay: 0 },
  { minHeight: 10, maxHeight: 26, color: AURA_COLORS.secondaryFixed, duration: 380, delay: 90 },
  { minHeight: 8, maxHeight: 20, color: AURA_COLORS.primaryFixedDim, duration: 540, delay: 180 },
  {
    minHeight: 12,
    maxHeight: 30,
    color: AURA_COLORS.secondaryContainer,
    duration: 340,
    delay: 120,
  },
  { minHeight: 14, maxHeight: 32, color: AURA_COLORS.secondary, duration: 440, delay: 240 },
  { minHeight: 10, maxHeight: 24, color: AURA_COLORS.primary, duration: 400, delay: 50 },
  {
    minHeight: 10,
    maxHeight: 26,
    color: AURA_COLORS.secondaryContainer,
    duration: 500,
    delay: 200,
  },
  { minHeight: 6, maxHeight: 16, color: AURA_COLORS.primaryFixedDim, duration: 360, delay: 140 },
  { minHeight: 5, maxHeight: 12, color: AURA_COLORS.secondary, duration: 460, delay: 280 },
];

const COMPACT_BARS: BarConfig[] = [
  { minHeight: 6, maxHeight: 12, color: AURA_COLORS.secondaryContainer, duration: 420, delay: 0 },
  { minHeight: 8, maxHeight: 18, color: AURA_COLORS.secondary, duration: 520, delay: 80 },
  { minHeight: 10, maxHeight: 26, color: AURA_COLORS.primary, duration: 350, delay: 140 },
  { minHeight: 7, maxHeight: 16, color: AURA_COLORS.secondaryFixed, duration: 600, delay: 200 },
  { minHeight: 9, maxHeight: 22, color: AURA_COLORS.tertiary, duration: 460, delay: 100 },
  { minHeight: 6, maxHeight: 14, color: AURA_COLORS.secondaryContainer, duration: 390, delay: 160 },
  { minHeight: 8, maxHeight: 19, color: AURA_COLORS.primaryContainer, duration: 540, delay: 60 },
  { minHeight: 6, maxHeight: 14, color: AURA_COLORS.secondary, duration: 450, delay: 220 },
];

const EqBar: React.FC<{ config: BarConfig; active: boolean }> = ({ config, active }) => {
  const height = useSharedValue(config.minHeight);

  useEffect(() => {
    if (active) {
      height.value = withDelay(
        config.delay,
        withRepeat(
          withSequence(
            withTiming(config.maxHeight, {
              duration: config.duration,
              easing: Easing.inOut(Easing.ease),
            }),
            withTiming(config.minHeight, {
              duration: config.duration,
              easing: Easing.inOut(Easing.ease),
            })
          ),
          -1,
          false
        )
      );
    } else {
      height.value = withTiming(4, { duration: 250 });
    }
  }, [active, config, height]);

  const animStyle = useAnimatedStyle(() => ({
    height: height.value,
    opacity: active ? 0.95 : 0.35,
  }));

  return (
    <Animated.View
      style={[
        {
          width: 4,
          borderRadius: 999,
          backgroundColor: config.color,
        },
        animStyle,
      ]}
    />
  );
};

interface WaveformBarsProps {
  active?: boolean;
  variant?: 'voice' | 'compact';
}

export const WaveformBars: React.FC<WaveformBarsProps> = ({ active = true, variant = 'voice' }) => {
  const bars = variant === 'voice' ? VOICE_BARS : COMPACT_BARS;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: variant === 'voice' ? 6 : 5,
        height: variant === 'voice' ? 34 : 28,
      }}>
      {bars.map((bar, idx) => (
        <EqBar key={idx} config={bar} active={active} />
      ))}
    </View>
  );
};
