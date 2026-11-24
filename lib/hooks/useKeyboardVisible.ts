import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

export interface KeyboardVisibilityState {
  keyboardVisible: boolean;
  keyboardHeight: number;
}

/**
 * Tracks live keyboard visibility and height across iOS and Android.
 */
export function useKeyboardVisible(): KeyboardVisibilityState {
  const [state, setState] = useState<KeyboardVisibilityState>({
    keyboardVisible: false,
    keyboardHeight: 0,
  });

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setState({
        keyboardVisible: true,
        keyboardHeight: e.endCoordinates?.height ?? 0,
      });
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setState({
        keyboardVisible: false,
        keyboardHeight: 0,
      });
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return state;
}
