import React from 'react';
import { Stack } from 'expo-router';

import { AURA_COLORS } from '../../components/theme';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: AURA_COLORS.surface },
        animation: 'slide_from_right',
      }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="name" />
      <Stack.Screen name="model" />
    </Stack>
  );
}
