import React from 'react';
import { Text, View } from 'react-native';

import { MaterialIcon } from '@/components/MaterialIcon';
import { AURA_COLORS, AURA_FONTS } from '@/components/theme';
import { formatBytes } from '@/lib/format';

interface DocumentCardProps {
  name: string;
  mime: string;
  sizeBytes: number;
  status: 'parsing' | 'parsed' | 'truncated' | 'unsupported' | 'error';
  tokenCount?: number;
  chunks?: number;
  totalChunks?: number;
  errorMessage?: string;
}

export const DocumentCard = React.memo<DocumentCardProps>(function DocumentCard({
  name,
  sizeBytes,
  status,
  tokenCount,
  chunks,
  totalChunks,
  errorMessage,
}) {
  const badgeColor =
    status === 'parsed'
      ? AURA_COLORS.secondaryFixed
      : status === 'truncated'
        ? AURA_COLORS.primary
        : status === 'parsing'
          ? AURA_COLORS.onSurfaceVariant
          : AURA_COLORS.error;

  const badgeText =
    status === 'parsing'
      ? 'Parsing…'
      : status === 'parsed'
        ? `${tokenCount ?? 0} tok · Ready`
        : status === 'truncated'
          ? `${chunks ?? 1}/${totalChunks ?? 1} chunks · ${tokenCount ?? 0} tok`
          : status === 'unsupported'
            ? 'Unsupported'
            : 'Parse Error';

  return (
    <View
      style={{
        borderRadius: 16,
        backgroundColor: 'rgba(27, 27, 36, 0.88)',
        borderWidth: 1,
        borderColor:
          status === 'unsupported' || status === 'error'
            ? 'rgba(255, 180, 171, 0.32)'
            : 'rgba(255, 255, 255, 0.08)',
        padding: 11,
        gap: 6,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: AURA_COLORS.surfaceContainerHigh,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <MaterialIcon name="description" size={19} color={badgeColor} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={{
              fontFamily: AURA_FONTS.sansSemiBold,
              fontSize: 13,
              color: AURA_COLORS.onSurface,
            }}>
            {name}
          </Text>
          <Text
            style={{
              fontFamily: AURA_FONTS.monoRegular,
              fontSize: 10.5,
              color: AURA_COLORS.outline,
              marginTop: 2,
            }}>
            {formatBytes(sizeBytes)}
          </Text>
        </View>

        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 999,
            backgroundColor: AURA_COLORS.surfaceContainerLowest,
          }}>
          <Text
            style={{
              fontFamily: AURA_FONTS.monoMedium,
              fontSize: 10,
              color: badgeColor,
            }}>
            {badgeText}
          </Text>
        </View>
      </View>

      {errorMessage && (
        <Text
          style={{
            fontFamily: AURA_FONTS.sansRegular,
            fontSize: 11.5,
            lineHeight: 16,
            color: AURA_COLORS.error,
          }}>
          {errorMessage}
        </Text>
      )}
    </View>
  );
});
