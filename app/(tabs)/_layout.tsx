import { Tabs } from 'expo-router';

import { AuraTabBar } from '../../components/AuraTabBar';
import { AURA_COLORS } from '../../components/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        freezeOnBlur: true,
        sceneStyle: { backgroundColor: AURA_COLORS.surface },
      }}
      tabBar={(props) => <AuraTabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="assistant" options={{ title: 'Assistant' }} />
      <Tabs.Screen name="voice" options={{ title: 'Voice', href: null }} />
      <Tabs.Screen name="utilities" options={{ title: 'Utilities' }} />
      <Tabs.Screen name="unified" options={{ title: 'Unified', href: null }} />
      <Tabs.Screen name="models" options={{ title: 'Models' }} />
    </Tabs>
  );
}
