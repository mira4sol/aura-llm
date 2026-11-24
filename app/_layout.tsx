import '../global.css';

import React, { useEffect } from 'react';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
} from '@expo-google-fonts/jetbrains-mono';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuraErrorBoundary } from '../components/AuraErrorBoundary';
import { AURA_COLORS } from '../components/theme';
import { crashLogger } from '../lib/diagnostics/crashLogger';
import { QueryProvider } from '../providers/QueryProvider';
import { bootstrapAuraServices } from '../services/bootstrap';
import { setNotificationOpenHandler } from '../services/notifications/actions';
import { registerBackgroundNotificationHandlers } from '../services/notifications/notificationService';
import { useAppStore } from '../store/app.store';

// Install global JS error/rejection handlers & detect prior unexpected native/OOM kills
crashLogger.installGlobalHandlers();
crashLogger.beginSession();

// Register background notification & Android foreground service handlers at module load
registerBackgroundNotificationHandlers();

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const router = useRouter();
  const hasCompletedOnboarding = useAppStore((state) => state.hasCompletedOnboarding);

  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
  });

  useEffect(() => {
    void bootstrapAuraServices();
  }, []);

  useEffect(() => {
    setNotificationOpenHandler((bundleId) => {
      if (useAppStore.getState().hasCompletedOnboarding) {
        router.push({
          pathname: '/(tabs)/models',
          params: bundleId ? { highlight: bundleId } : undefined,
        });
      }
    });
  }, [router]);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: AURA_COLORS.surface }}>
      <AuraErrorBoundary>
        <QueryProvider>
          <SafeAreaProvider>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: AURA_COLORS.surface },
                animation: 'fade',
              }}>
              <Stack.Protected guard={!hasCompletedOnboarding}>
                <Stack.Screen name="onboarding" />
              </Stack.Protected>
              <Stack.Protected guard={hasCompletedOnboarding}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen
                  name="settings"
                  options={{
                    animation: 'slide_from_right',
                  }}
                />
              </Stack.Protected>
            </Stack>
          </SafeAreaProvider>
        </QueryProvider>
      </AuraErrorBoundary>
    </GestureHandlerRootView>
  );
}
