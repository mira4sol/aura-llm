import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';

import { MaterialIcon } from '@/components/MaterialIcon';
import { AURA_COLORS, AURA_FONTS } from '@/components/theme';
import type { PendingAttachment } from '@/lib/types';

interface AttachmentTrayProps {
  attachments: PendingAttachment[];
  onRemove: (id: string) => void;
}

export const AttachmentTray: React.FC<AttachmentTrayProps> = ({ attachments, onRemove }) => {
  if (attachments.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
      {attachments.map((att) => (
        <View
          key={att.id}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 14,
            backgroundColor: '#1b1b26',
            borderWidth: 1,
            borderColor:
              att.status === 'unsupported' || att.status === 'error'
                ? 'rgba(255, 180, 171, 0.4)'
                : 'rgba(0, 241, 253, 0.2)',
            maxWidth: 220,
          }}>
          {att.kind === 'image' ? (
            <Image
              source={{ uri: att.uri }}
              contentFit="cover"
              style={{ width: 28, height: 28, borderRadius: 6 }}
            />
          ) : (
            <MaterialIcon
              name={att.kind === 'audio' ? 'graphic_eq' : 'description'}
              size={18}
              color={
                att.status === 'unsupported' || att.status === 'error'
                  ? AURA_COLORS.error
                  : AURA_COLORS.secondaryFixed
              }
            />
          )}

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              numberOfLines={1}
              style={{
                fontFamily: AURA_FONTS.sansSemiBold,
                fontSize: 11.5,
                color: AURA_COLORS.onSurface,
              }}>
              {att.name}
            </Text>
            <Text
              numberOfLines={1}
              style={{
                fontFamily: AURA_FONTS.monoRegular,
                fontSize: 9.5,
                color:
                  att.status === 'unsupported' || att.status === 'error'
                    ? AURA_COLORS.error
                    : AURA_COLORS.secondaryFixed,
              }}>
              {att.status === 'parsing'
                ? 'Parsing locally…'
                : att.status === 'ready'
                  ? att.kind === 'image'
                    ? 'Image ready'
                    : `${att.tokenCount ?? 0} tokens`
                  : att.status === 'truncated'
                    ? `${att.chunks}/${att.totalChunks} chunks`
                    : att.errorMessage || 'Unsupported'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => onRemove(att.id)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <MaterialIcon name="close" size={15} color={AURA_COLORS.outline} />
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
};
