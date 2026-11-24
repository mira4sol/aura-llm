import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import { MaterialIcon } from '@/components/MaterialIcon';
import { AURA_COLORS, AURA_FONTS } from '@/components/theme';

interface MessageActionBarProps {
  rawText: string;
  isSpeaking: boolean;
  feedback?: 'up' | 'down' | null;
  onRegenerate?: () => void;
  onReadAloud?: () => void;
  onFeedback?: (val: 'up' | 'down' | null) => void;
}

export const MessageActionBar = React.memo<MessageActionBarProps>(function MessageActionBar({
  rawText,
  isSpeaking,
  feedback,
  onRegenerate,
  onReadAloud,
  onFeedback,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(rawText);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 6,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {rawText.trim().length > 0 && (
          <TouchableOpacity
            activeOpacity={0.78}
            onPress={handleCopy}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 999,
              backgroundColor: 'rgba(41, 41, 51, 0.65)',
            }}>
            <MaterialIcon
              name={copied ? 'check' : 'content_copy'}
              size={14}
              color={copied ? AURA_COLORS.secondaryFixed : AURA_COLORS.onSurfaceVariant}
            />
            <Text
              style={{
                fontFamily: AURA_FONTS.sansSemiBold,
                fontSize: 11.5,
                color: copied ? AURA_COLORS.secondaryFixed : AURA_COLORS.onSurfaceVariant,
              }}>
              {copied ? 'Copied' : 'Copy'}
            </Text>
          </TouchableOpacity>
        )}

        {onReadAloud && rawText.trim().length > 0 && (
          <TouchableOpacity
            activeOpacity={0.78}
            onPress={onReadAloud}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 999,
              backgroundColor: isSpeaking
                ? 'rgba(0, 241, 253, 0.18)'
                : 'rgba(41, 41, 51, 0.65)',
            }}>
            <MaterialIcon
              name={isSpeaking ? 'pause' : 'volume_up'}
              size={14}
              color={isSpeaking ? AURA_COLORS.secondaryFixed : AURA_COLORS.onSurfaceVariant}
            />
            <Text
              style={{
                fontFamily: AURA_FONTS.sansSemiBold,
                fontSize: 11.5,
                color: isSpeaking ? AURA_COLORS.secondaryFixed : AURA_COLORS.onSurfaceVariant,
              }}>
              {isSpeaking ? 'Stop' : 'Speak'}
            </Text>
          </TouchableOpacity>
        )}

        {onRegenerate && (
          <TouchableOpacity
            activeOpacity={0.78}
            onPress={onRegenerate}
            accessibilityLabel="Retry response"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 999,
              backgroundColor: 'rgba(108, 60, 233, 0.24)',
              borderWidth: 1,
              borderColor: 'rgba(205, 189, 255, 0.22)',
            }}>
            <MaterialIcon name="refresh" size={14} color={AURA_COLORS.primary} />
            <Text
              style={{
                fontFamily: AURA_FONTS.sansSemiBold,
                fontSize: 11.5,
                color: AURA_COLORS.primary,
              }}>
              Retry
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {onFeedback && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <TouchableOpacity
            onPress={() => onFeedback(feedback === 'up' ? null : 'up')}
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: 'rgba(41, 41, 51, 0.65)',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <MaterialIcon
              name="thumb_up"
              size={15}
              color={
                feedback === 'up' ? AURA_COLORS.secondaryFixed : AURA_COLORS.onSurfaceVariant
              }
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onFeedback(feedback === 'down' ? null : 'down')}
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: 'rgba(41, 41, 51, 0.65)',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <MaterialIcon
              name="thumb_down"
              size={15}
              color={feedback === 'down' ? AURA_COLORS.error : AURA_COLORS.onSurfaceVariant}
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});
