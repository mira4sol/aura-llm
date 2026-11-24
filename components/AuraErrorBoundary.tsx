import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { crashLogger } from '@/lib/diagnostics/crashLogger';
import { MaterialIcon } from './MaterialIcon';
import { AURA_COLORS, AURA_FONTS } from './theme';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class AuraErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message || 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    crashLogger.record({
      source: 'react_boundary',
      fatal: true,
      message: error?.message || 'React render boundary error',
      stack: (error?.stack || info?.componentStack || '').slice(0, 1500),
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View
        style={{
          flex: 1,
          backgroundColor: AURA_COLORS.surface,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 28,
          gap: 14,
        }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: 'rgba(147, 0, 10, 0.28)',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <MaterialIcon name="flag" size={26} color={AURA_COLORS.error} />
        </View>
        <Text
          style={{
            fontFamily: AURA_FONTS.sansBold,
            fontSize: 20,
            color: AURA_COLORS.onSurface,
            textAlign: 'center',
          }}>
          Aura Recovered From an Error
        </Text>
        <Text
          style={{
            fontFamily: AURA_FONTS.sansRegular,
            fontSize: 13.5,
            lineHeight: 20,
            color: AURA_COLORS.onSurfaceVariant,
            textAlign: 'center',
          }}>
          {this.state.message}
        </Text>
        <TouchableOpacity
          activeOpacity={0.82}
          onPress={this.handleReset}
          style={{
            marginTop: 8,
            paddingHorizontal: 22,
            paddingVertical: 11,
            borderRadius: 999,
            backgroundColor: AURA_COLORS.primaryContainer,
          }}>
          <Text
            style={{
              fontFamily: AURA_FONTS.sansSemiBold,
              fontSize: 14,
              color: AURA_COLORS.onPrimaryContainer,
            }}>
            Reload Interface
          </Text>
        </TouchableOpacity>
      </View>
    );
  }
}
