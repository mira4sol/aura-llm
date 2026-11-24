import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useScreenActive } from '@/lib/hooks/useScreenActive';
import { AURA_COLORS } from './theme';

interface PulsingDotProps {
  size?: number;
  color?: string;
  ring?: boolean;
}

export const PulsingDot = React.memo<PulsingDotProps>(function PulsingDot({
  size = 6,
  color = AURA_COLORS.secondaryContainer,
  ring = false,
}) {
  const active = useScreenActive();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      cancelAnimation(pulse);
      pulse.value = 0;
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    return () => cancelAnimation(pulse);
  }, [active, pulse]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: ring ? (1 - pulse.value) * 0.65 : 0.35 + pulse.value * 0.45,
    transform: [{ scale: ring ? 1 + pulse.value * 1.4 : 1 + pulse.value * 0.35 }],
  }));

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
          haloStyle,
        ]}
      />
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.9,
          shadowRadius: 6,
        }}
      />
    </View>
  );
});
