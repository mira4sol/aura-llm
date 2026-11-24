import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

/**
 * Tracks whether the app is currently active in the foreground.
 * Combined with `<Tabs screenOptions={{ freezeOnBlur: true }}>`, this ensures
 * infinite animations and timers pause cleanly when backgrounded or blurred.
 */
export function useScreenActive(enabled = true): boolean {
  const [appActive, setAppActive] = useState<boolean>(() => AppState.currentState === 'active');

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      setAppActive(state === 'active');
    });
    return () => sub.remove();
  }, []);

  return enabled && appActive;
}
