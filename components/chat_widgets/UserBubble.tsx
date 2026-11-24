import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { MaterialIcon } from '@/components/MaterialIcon';
import { AURA_COLORS, AURA_FONTS } from '@/components/theme';
import { formatTimeShort } from '@/lib/format';
import type { ChatMessage } from '@/lib/types';
import { AudioMessage } from './AudioMessage';
import { DocumentCard } from './DocumentCard';
import { ImageGrid } from './ImageGrid';

interface UserBubbleProps {
  message: ChatMessage;
  canEdit?: boolean;
  onEdit?: (messageId: string, newText: string) => void;
}

export const UserBubble = React.memo<UserBubbleProps>(function UserBubble({
  message,
  canEdit = true,
  onEdit,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(message.rawText);

  const mediaBlocks = message.blocks.filter((b) => b.type !== 'markdown');

  const handleOpenEdit = () => {
    if (!canEdit || !onEdit) return;
    setDraft(message.rawText);
    setIsEditing(true);
  };

  const handleSave = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setIsEditing(false);
    if (trimmed !== message.rawText.trim()) {
      onEdit?.(message.id, trimmed);
    }
  };

  return (
    <View style={{ alignItems: 'flex-end', paddingLeft: 32, gap: 8 }}>
      {mediaBlocks.map((block) => {
        if (block.type === 'image') {
          return (
            <View key={block.id} style={{ width: '85%' }}>
              <ImageGrid images={block.images} />
            </View>
          );
        }
        if (block.type === 'document') {
          return (
            <View key={block.id} style={{ width: '92%' }}>
              <DocumentCard
                name={block.name}
                mime={block.mime}
                sizeBytes={block.sizeBytes}
                status={block.status}
                tokenCount={block.tokenCount}
                chunks={block.chunks}
                totalChunks={block.totalChunks}
                errorMessage={block.errorMessage}
              />
            </View>
          );
        }
        if (block.type === 'audio') {
          return (
            <View key={block.id} style={{ width: '92%' }}>
              <AudioMessage
                durationMs={block.durationMs}
                waveform={block.waveform}
                transcript={block.transcript}
              />
            </View>
          );
        }
        return null;
      })}

      {isEditing ? (
        <View
          style={{
            width: '100%',
            borderRadius: 20,
            padding: 12,
            backgroundColor: 'rgba(31, 31, 44, 0.96)',
            borderWidth: 1,
            borderColor: 'rgba(0, 241, 253, 0.35)',
            gap: 10,
          }}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            multiline
            autoFocus
            placeholder="Edit your prompt…"
            placeholderTextColor={AURA_COLORS.outline}
            style={{
              fontFamily: AURA_FONTS.sansRegular,
              fontSize: 14,
              lineHeight: 20,
              color: AURA_COLORS.onSurface,
              maxHeight: 160,
            }}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
            <TouchableOpacity
              activeOpacity={0.78}
              onPress={() => setIsEditing(false)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: AURA_COLORS.surfaceContainerHigh,
              }}>
              <Text
                style={{
                  fontFamily: AURA_FONTS.sansSemiBold,
                  fontSize: 12,
                  color: AURA_COLORS.onSurfaceVariant,
                }}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.82}
              disabled={!draft.trim()}
              onPress={handleSave}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: AURA_COLORS.primaryContainer,
                opacity: draft.trim() ? 1 : 0.45,
              }}>
              <Text
                style={{
                  fontFamily: AURA_FONTS.sansSemiBold,
                  fontSize: 12,
                  color: AURA_COLORS.onPrimaryContainer,
                }}>
                Save & Resend
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        message.rawText.length > 0 && (
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <TouchableOpacity
              activeOpacity={0.92}
              onLongPress={handleOpenEdit}
              disabled={!canEdit || !onEdit}>
              <LinearGradient
                colors={[
                  AURA_COLORS.primaryContainer,
                  AURA_COLORS.tertiaryContainer,
                  AURA_COLORS.surfaceContainerHighest,
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  borderRadius: 20,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  shadowColor: AURA_COLORS.primaryContainer,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.32,
                  shadowRadius: 14,
                  elevation: 6,
                }}>
                <Text
                  selectable
                  style={{
                    fontFamily: AURA_FONTS.sansMedium,
                    fontSize: 14,
                    lineHeight: 21,
                    color: '#ffffff',
                  }}>
                  {message.rawText}
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 5,
                    marginTop: 5,
                  }}>
                  <Text
                    style={{
                      fontFamily: AURA_FONTS.monoMedium,
                      fontSize: 10.5,
                      color: 'rgba(255, 255, 255, 0.78)',
                    }}>
                    {formatTimeShort(message.createdAt)}
                  </Text>
                  <MaterialIcon name="done_all" size={14} color="rgba(255, 255, 255, 0.8)" />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {canEdit && onEdit && (
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={handleOpenEdit}
                accessibilityLabel="Edit prompt"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 999,
                  backgroundColor: 'rgba(41, 41, 51, 0.55)',
                }}>
                <MaterialIcon name="edit_note" size={13} color={AURA_COLORS.outline} />
                <Text
                  style={{
                    fontFamily: AURA_FONTS.monoMedium,
                    fontSize: 10,
                    color: AURA_COLORS.outline,
                  }}>
                  Edit
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )
      )}
    </View>
  );
});
