import { BlurView } from 'expo-blur';
import React from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaterialIcon } from '@/components/MaterialIcon';
import { PulsingDot } from '@/components/PulsingDot';
import { AURA_COLORS, AURA_FONTS, HEADER_CONTENT_HEIGHT } from '@/components/theme';

interface ChatHeaderProps {
  modelName: string | null;
  tuningLabel: string;
  conversationTitle?: string | null;
  selectorOpen?: boolean;
  onMenuPress: () => void;
  onModelSelectorPress: () => void;
  onNewChatPress: () => void;
}

/**
 * Gemini-inspired sticky chat header scoped strictly to assistant.tsx:
 * Left menu button (history drawer) | Interactive Model + Tuning selector | Quick New Chat button.
 * Always accessible regardless of scroll position.
 */
export const ChatHeader: React.FC<ChatHeaderProps> = ({
  modelName,
  tuningLabel,
  conversationTitle,
  selectorOpen = false,
  onMenuPress,
  onModelSelectorPress,
  onNewChatPress,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        paddingTop: insets.top,
        backgroundColor: Platform.OS === 'ios' ? 'rgba(19, 18, 28, 0.82)' : 'rgba(19, 18, 28, 0.95)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 18,
        elevation: 10,
      }}>
      {Platform.OS === 'ios' && (
        <BlurView
          intensity={45}
          tint="dark"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      )}

      <View
        style={{
          height: HEADER_CONTENT_HEIGHT,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}>
        {/* Left: History Drawer Trigger */}
        <TouchableOpacity
          activeOpacity={0.78}
          onPress={onMenuPress}
          accessibilityLabel="Open chat history"
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: 'rgba(41, 41, 51, 0.78)',
            borderWidth: 1,
            borderColor: 'rgba(205, 189, 255, 0.14)',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <MaterialIcon name="menu" size={20} color={AURA_COLORS.onSurface} />
        </TouchableOpacity>

        {/* Center: Gemini-style Active Model + Tuning Selector */}
        <TouchableOpacity
          activeOpacity={0.74}
          onPress={onModelSelectorPress}
          accessibilityLabel="Change model or response tuning"
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 0,
            paddingHorizontal: 8,
            paddingVertical: 5,
            borderRadius: 14,
            backgroundColor: selectorOpen ? 'rgba(41, 41, 51, 0.65)' : 'transparent',
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              maxWidth: '100%',
            }}>
            <Text
              numberOfLines={1}
              style={{
                fontFamily: AURA_FONTS.sansSemiBold,
                fontSize: 15,
                lineHeight: 20,
                color: AURA_COLORS.onSurface,
                letterSpacing: -0.2,
                flexShrink: 1,
              }}>
              {modelName ?? 'Select Model'}
            </Text>
            <Text
              numberOfLines={1}
              style={{
                fontFamily: AURA_FONTS.sansMedium,
                fontSize: 13.5,
                lineHeight: 20,
                color: AURA_COLORS.outline,
              }}>
              {tuningLabel}
            </Text>
            <View style={{ marginTop: -7, marginLeft: -1 }}>
              <PulsingDot
                size={6}
                color={modelName ? AURA_COLORS.secondaryContainer : AURA_COLORS.outline}
              />
            </View>
            <View style={{ transform: [{ rotate: selectorOpen ? '180deg' : '0deg' }] }}>
              <MaterialIcon name="expand_more" size={16} color={AURA_COLORS.onSurfaceVariant} />
            </View>
          </View>

          <Text
            numberOfLines={1}
            style={{
              fontFamily: conversationTitle ? AURA_FONTS.sansRegular : AURA_FONTS.monoMedium,
              fontSize: 10,
              lineHeight: 13,
              color: conversationTitle ? AURA_COLORS.onSurfaceVariant : AURA_COLORS.secondary,
              opacity: conversationTitle ? 0.8 : 0.85,
              marginTop: 1,
            }}>
            {conversationTitle || '100% On-Device'}
          </Text>
        </TouchableOpacity>

        {/* Right: Quick New Chat Button */}
        <TouchableOpacity
          activeOpacity={0.78}
          onPress={onNewChatPress}
          accessibilityLabel="Start new chat"
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: 'rgba(108, 60, 233, 0.28)',
            borderWidth: 1,
            borderColor: 'rgba(205, 189, 255, 0.22)',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <MaterialIcon name="edit_note" size={20} color={AURA_COLORS.secondaryFixed} />
        </TouchableOpacity>
      </View>
    </View>
  );
};
