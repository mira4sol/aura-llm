import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { MaterialIcon } from '@/components/MaterialIcon';
import { AURA_COLORS, AURA_FONTS } from '@/components/theme';

interface ErrorStateProps {
  message: string;
  retriable: boolean;
  onRetry?: () => void;
}

export const ErrorState = React.memo<ErrorStateProps>(function ErrorState({
  message,
  retriable,
  onRetry,
}) {
  return (
    <View
      style={{
        borderRadius: 14,
        backgroundColor: 'rgba(147, 0, 10, 0.25)',
        borderWidth: 1,
        borderColor: 'rgba(255, 180, 171, 0.32)',
        padding: 12,
        gap: 8,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
        <MaterialIcon name="flag" size={18} color={AURA_COLORS.error} />
        <Text
          style={{
            flex: 1,
            fontFamily: AURA_FONTS.sansRegular,
            fontSize: 12.5,
            lineHeight: 18,
            color: AURA_COLORS.onErrorContainer,
          }}>
          {message}
        </Text>
      </View>
      {retriable && onRetry && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onRetry}
          style={{
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: AURA_COLORS.surfaceContainerHigh,
          }}>
          <MaterialIcon name="refresh" size={14} color={AURA_COLORS.onSurface} />
          <Text
            style={{
              fontFamily: AURA_FONTS.sansSemiBold,
              fontSize: 12,
              color: AURA_COLORS.onSurface,
            }}>
            Retry
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
});
