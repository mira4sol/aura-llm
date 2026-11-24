import React, { useState } from 'react';
import {
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type NativeSyntheticEvent,
  type TextInputContentSizeChangeEventData,
  type TextInputKeyPressEventData,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { MaterialIcon } from '@/components/MaterialIcon';
import { PulsingDot } from '@/components/PulsingDot';
import { AURA_COLORS, AURA_FONTS } from '@/components/theme';
import type { PendingAttachment } from '@/lib/types';
import { AttachmentTray } from './AttachmentTray';

const MIN_INPUT_HEIGHT = 36;
const MAX_INPUT_HEIGHT = 160;

interface ChatComposerProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onStop: () => void;
  onPickDocument: () => void;
  onPickImage: () => void;
  onToggleMic: () => void;
  isGenerating: boolean;
  isListening: boolean;
  attachments: PendingAttachment[];
  onRemoveAttachment: (id: string) => void;
  statusBanner?: string | null;
  bottomOffset: number;
  keyboardVisible?: boolean;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  value,
  onChangeText,
  onSend,
  onStop,
  onPickDocument,
  onPickImage,
  onToggleMic,
  isGenerating,
  isListening,
  attachments,
  onRemoveAttachment,
  statusBanner,
  bottomOffset,
  keyboardVisible = false,
}) => {
  const [measuredHeight, setMeasuredHeight] = useState(MIN_INPUT_HEIGHT);

  const hasSendable =
    value.trim().length > 0 ||
    attachments.some((a) => a.status === 'ready' || a.status === 'truncated');

  const effectiveHeight =
    value.length === 0
      ? MIN_INPUT_HEIGHT
      : Math.max(MIN_INPUT_HEIGHT, Math.min(MAX_INPUT_HEIGHT, measuredHeight));

  const isExpanded = effectiveHeight > MIN_INPUT_HEIGHT + 4;

  const handleContentSizeChange = (e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
    const next = Math.ceil(e.nativeEvent.contentSize.height);
    const clamped = Math.max(MIN_INPUT_HEIGHT, Math.min(MAX_INPUT_HEIGHT, next));
    if (clamped !== measuredHeight) {
      setMeasuredHeight(clamped);
    }
  };

  const handleTriggerSend = () => {
    if (isGenerating || !hasSendable) return;
    setMeasuredHeight(MIN_INPUT_HEIGHT);
    onSend();
  };

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (Platform.OS !== 'web') return;
    const native = e.nativeEvent as TextInputKeyPressEventData & { shiftKey?: boolean };
    if (native.key === 'Enter' && !native.shiftKey) {
      e.preventDefault?.();
      handleTriggerSend();
    }
  };

  return (
    <View
      style={{
        backgroundColor: '#0d0d16',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.06)',
        paddingTop: 8,
        paddingBottom: keyboardVisible ? 10 : bottomOffset + 10,
        paddingHorizontal: 16,
        gap: 6,
      }}>
      <AttachmentTray attachments={attachments} onRemove={onRemoveAttachment} />

      {statusBanner && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
            paddingHorizontal: 12,
            paddingVertical: 5,
            borderRadius: 999,
            backgroundColor: '#12121d',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.08)',
          }}>
          <PulsingDot size={6} color={AURA_COLORS.secondary} ring />
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              fontFamily: AURA_FONTS.monoMedium,
              fontSize: 10.5,
              color: AURA_COLORS.onSurfaceVariant,
            }}>
            {statusBanner}
          </Text>
        </View>
      )}

      {/* Main Input Glass Capsule (auto-expands cleanly from pill to rounded multiline card) */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: 7,
          padding: 6,
          paddingLeft: 8,
          borderRadius: 24,
          backgroundColor: '#191924',
          borderWidth: 1,
          borderColor: isListening
            ? 'rgba(0, 241, 253, 0.55)'
            : 'rgba(0, 241, 253, 0.2)',
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.55,
          shadowRadius: 20,
          elevation: 14,
        }}>
        <TouchableOpacity
          onPress={onPickDocument}
          activeOpacity={0.78}
          accessibilityLabel="Attach document"
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            marginBottom: 2,
            backgroundColor: 'rgba(41, 41, 51, 0.85)',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <MaterialIcon name="add" size={19} color={AURA_COLORS.onSurfaceVariant} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onPickImage}
          activeOpacity={0.78}
          accessibilityLabel="Attach photo"
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            marginBottom: 2,
            backgroundColor: 'rgba(41, 41, 51, 0.85)',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <MaterialIcon name="photo_camera" size={18} color={AURA_COLORS.onSurfaceVariant} />
        </TouchableOpacity>

        <TextInput
          value={value}
          onChangeText={onChangeText}
          onContentSizeChange={handleContentSizeChange}
          onKeyPress={handleKeyPress}
          multiline
          scrollEnabled={effectiveHeight >= MAX_INPUT_HEIGHT}
          submitBehavior="newline"
          textAlignVertical={isExpanded ? 'top' : 'center'}
          placeholder={isListening ? 'Listening offline…' : 'Message Aura (Offline)...'}
          placeholderTextColor={isListening ? AURA_COLORS.secondaryFixed : AURA_COLORS.outline}
          style={{
            flex: 1,
            height: effectiveHeight,
            maxHeight: MAX_INPUT_HEIGHT,
            fontFamily: AURA_FONTS.sansRegular,
            fontSize: 14,
            lineHeight: 20,
            color: AURA_COLORS.onSurface,
            paddingHorizontal: 4,
            paddingTop: Platform.OS === 'ios' ? 8 : 6,
            paddingBottom: Platform.OS === 'ios' ? 8 : 6,
          }}
        />

        <TouchableOpacity
          onPress={onToggleMic}
          activeOpacity={0.78}
          accessibilityLabel={isListening ? 'Stop voice dictation' : 'Start voice dictation'}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            marginBottom: 2,
            backgroundColor: isListening
              ? 'rgba(0, 241, 253, 0.24)'
              : 'rgba(41, 41, 51, 0.85)',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <MaterialIcon
            name={isListening ? 'mic_off' : 'mic'}
            size={19}
            color={isListening ? AURA_COLORS.secondaryContainer : AURA_COLORS.secondary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={isGenerating ? onStop : handleTriggerSend}
          disabled={!isGenerating && !hasSendable}
          activeOpacity={0.78}
          accessibilityLabel={isGenerating ? 'Stop generation' : 'Send message'}
          style={{
            borderRadius: 999,
            overflow: 'hidden',
            opacity: isGenerating || hasSendable ? 1 : 0.45,
            shadowColor: AURA_COLORS.primaryContainer,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.6,
            shadowRadius: 12,
          }}>
          <LinearGradient
            colors={
              isGenerating
                ? [AURA_COLORS.errorContainer, AURA_COLORS.error]
                : [
                    AURA_COLORS.primaryContainer,
                    AURA_COLORS.primary,
                    AURA_COLORS.secondaryContainer,
                  ]
            }
            start={{ x: 0, y: 1 }}
            end={{ x: 1, y: 0 }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <MaterialIcon
              name={isGenerating ? 'close' : 'arrow_upward'}
              size={20}
              color={AURA_COLORS.surfaceContainerLowest}
            />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};
