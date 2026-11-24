import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaterialIcon } from '@/components/MaterialIcon';
import { AURA_COLORS, AURA_FONTS } from '@/components/theme';
import type { Conversation } from '@/lib/types';

interface ChatHistoryDrawerProps {
  visible: boolean;
  conversations: Conversation[];
  activeConversationId: string | null;
  onClose: () => void;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onTogglePin: (id: string) => void;
  onRenameConversation: (id: string, title: string) => void;
  onDeleteConversation: (id: string) => void;
}

type DrawerListItem =
  | { kind: 'header'; key: string; label: string }
  | { kind: 'chat'; key: string; conversation: Conversation };

const SCREEN_WIDTH = Dimensions.get('window').width;
const DRAWER_WIDTH = Math.min(332, Math.round(SCREEN_WIDTH * 0.83));

function formatRelativeDate(ts: number): string {
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const ChatHistoryDrawer: React.FC<ChatHistoryDrawerProps> = ({
  visible,
  conversations,
  activeConversationId,
  onClose,
  onNewChat,
  onSelectConversation,
  onTogglePin,
  onRenameConversation,
  onDeleteConversation,
}) => {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(visible ? 1 : 0);

  const [renameTarget, setRenameTarget] = useState<Conversation | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [androidMenuTarget, setAndroidMenuTarget] = useState<Conversation | null>(null);

  if (visible && !mounted) {
    setMounted(true);
  }

  useEffect(() => {
    if (visible) {
      progress.value = withTiming(1, {
        duration: 240,
        easing: Easing.out(Easing.cubic),
      });
    } else if (mounted) {
      progress.value = withTiming(
        0,
        {
          duration: 200,
          easing: Easing.in(Easing.cubic),
        },
        (finished) => {
          if (finished) {
            runOnJS(setMounted)(false);
          }
        }
      );
    }
  }, [visible, mounted, progress]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(progress.value, [0, 1], [-DRAWER_WIDTH, 0]) }],
  }));

  const items = useMemo<DrawerListItem[]>(() => {
    const pinned = conversations.filter((c) => c.isPinned);
    const recent = conversations.filter((c) => !c.isPinned);
    const out: DrawerListItem[] = [];
    if (pinned.length > 0) {
      out.push({ kind: 'header', key: 'hdr-pinned', label: 'PINNED' });
      for (const c of pinned) out.push({ kind: 'chat', key: c.id, conversation: c });
    }
    if (recent.length > 0) {
      out.push({ kind: 'header', key: 'hdr-recent', label: 'RECENT' });
      for (const c of recent) out.push({ kind: 'chat', key: c.id, conversation: c });
    }
    return out;
  }, [conversations]);

  const confirmDelete = useCallback(
    (conv: Conversation) => {
      Alert.alert(
        'Delete Conversation?',
        `Permanently remove "${conv.title}" and all its local messages?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => onDeleteConversation(conv.id),
          },
        ]
      );
    },
    [onDeleteConversation]
  );

  const openRename = useCallback((conv: Conversation) => {
    setRenameTarget(conv);
    setRenameInput(conv.title);
  }, []);

  const openItemOptions = useCallback(
    (conv: Conversation) => {
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            title: conv.title,
            options: ['Cancel', conv.isPinned ? 'Unpin' : 'Pin', 'Rename', 'Delete'],
            cancelButtonIndex: 0,
            destructiveButtonIndex: 3,
          },
          (idx) => {
            if (idx === 1) onTogglePin(conv.id);
            else if (idx === 2) openRename(conv);
            else if (idx === 3) confirmDelete(conv);
          }
        );
      } else {
        setAndroidMenuTarget(conv);
      }
    },
    [onTogglePin, openRename, confirmDelete]
  );

  const handleSaveRename = () => {
    if (!renameTarget) return;
    const trimmed = renameInput.trim();
    if (trimmed) {
      onRenameConversation(renameTarget.id, trimmed);
    }
    setRenameTarget(null);
  };

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill}>
        {/* Dimmed Backdrop */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: 'rgba(6, 6, 12, 0.68)' },
            backdropStyle,
          ]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        {/* Left Slide-Out Sheet */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              width: DRAWER_WIDTH,
              backgroundColor: '#13121c',
              borderRightWidth: 1,
              borderRightColor: 'rgba(205, 189, 255, 0.12)',
              paddingTop: insets.top + 14,
              paddingBottom: Math.max(insets.bottom, 16),
              shadowColor: '#000',
              shadowOffset: { width: 8, height: 0 },
              shadowOpacity: 0.55,
              shadowRadius: 24,
              elevation: 20,
            },
            sheetStyle,
          ]}>
          {/* Drawer Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 18,
              marginBottom: 14,
            }}>
            <View>
              <Text
                style={{
                  fontFamily: AURA_FONTS.sansBold,
                  fontSize: 18,
                  color: AURA_COLORS.onSurface,
                  letterSpacing: -0.3,
                }}>
                Conversations
              </Text>
              <Text
                style={{
                  fontFamily: AURA_FONTS.monoRegular,
                  fontSize: 10.5,
                  color: AURA_COLORS.outline,
                  marginTop: 2,
                }}>
                {conversations.length} stored offline
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.78}
              accessibilityLabel="Close history drawer"
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: AURA_COLORS.surfaceContainerHigh,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <MaterialIcon name="close" size={18} color={AURA_COLORS.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          {/* Prominent New Chat CTA */}
          <View style={{ paddingHorizontal: 16, marginBottom: 14 }}>
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => {
                onNewChat();
                onClose();
              }}
              style={{ borderRadius: 999, overflow: 'hidden' }}>
              <LinearGradient
                colors={[
                  AURA_COLORS.primaryContainer,
                  AURA_COLORS.tertiaryContainer,
                  AURA_COLORS.secondaryContainer,
                ]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={{
                  height: 44,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}>
                <MaterialIcon name="edit_note" size={18} color={AURA_COLORS.onPrimary} />
                <Text
                  style={{
                    fontFamily: AURA_FONTS.sansBold,
                    fontSize: 14,
                    color: AURA_COLORS.onPrimary,
                  }}>
                  New Chat
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Saved Conversations List */}
          <FlatList
            data={items}
            keyExtractor={(item) => item.key}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 20, gap: 4 }}
            ListEmptyComponent={
              <View style={{ paddingHorizontal: 12, paddingTop: 32, alignItems: 'center', gap: 6 }}>
                <MaterialIcon name="forum" size={26} color={AURA_COLORS.outline} />
                <Text
                  style={{
                    fontFamily: AURA_FONTS.sansMedium,
                    fontSize: 13.5,
                    color: AURA_COLORS.onSurfaceVariant,
                  }}>
                  No saved chats yet
                </Text>
                <Text
                  style={{
                    fontFamily: AURA_FONTS.sansRegular,
                    fontSize: 12,
                    color: AURA_COLORS.outline,
                    textAlign: 'center',
                  }}>
                  Your offline conversations will appear here automatically.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              if (item.kind === 'header') {
                return (
                  <Text
                    style={{
                      fontFamily: AURA_FONTS.monoMedium,
                      fontSize: 10,
                      letterSpacing: 0.9,
                      color: AURA_COLORS.outline,
                      paddingHorizontal: 10,
                      paddingTop: 10,
                      paddingBottom: 4,
                    }}>
                    {item.label}
                  </Text>
                );
              }

              const conv = item.conversation;
              const isActive = conv.id === activeConversationId;
              return (
                <TouchableOpacity
                  activeOpacity={0.78}
                  onPress={() => {
                    onSelectConversation(conv.id);
                    onClose();
                  }}
                  onLongPress={() => openItemOptions(conv)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    paddingLeft: 12,
                    paddingRight: 6,
                    paddingVertical: 10,
                    borderRadius: 14,
                    backgroundColor: isActive
                      ? 'rgba(108, 60, 233, 0.24)'
                      : 'rgba(31, 31, 40, 0.55)',
                    borderWidth: 1,
                    borderColor: isActive
                      ? 'rgba(0, 241, 253, 0.28)'
                      : 'rgba(255, 255, 255, 0.04)',
                  }}>
                  {conv.isPinned && (
                    <MaterialIcon name="push_pin" size={14} color={AURA_COLORS.secondaryFixed} />
                  )}

                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      numberOfLines={1}
                      style={{
                        fontFamily: isActive ? AURA_FONTS.sansSemiBold : AURA_FONTS.sansMedium,
                        fontSize: 13.5,
                        color: AURA_COLORS.onSurface,
                      }}>
                      {conv.title}
                    </Text>
                    <Text
                      style={{
                        fontFamily: AURA_FONTS.monoRegular,
                        fontSize: 10,
                        color: AURA_COLORS.outline,
                        marginTop: 2,
                      }}>
                      {formatRelativeDate(conv.updatedAt)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => openItemOptions(conv)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel={`Options for ${conv.title}`}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <MaterialIcon name="more_vert" size={16} color={AURA_COLORS.onSurfaceVariant} />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            }}
          />
        </Animated.View>

        {/* Android Options Action Sheet */}
        {androidMenuTarget && (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: 'rgba(6, 6, 12, 0.72)',
                justifyContent: 'flex-end',
                padding: 16,
                paddingBottom: Math.max(insets.bottom, 16) + 8,
              },
            ]}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setAndroidMenuTarget(null)}
            />
            <View
              style={{
                borderRadius: 22,
                backgroundColor: '#1f1f2b',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.08)',
                padding: 14,
                gap: 6,
              }}>
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: AURA_FONTS.sansSemiBold,
                  fontSize: 14,
                  color: AURA_COLORS.onSurfaceVariant,
                  paddingHorizontal: 8,
                  paddingBottom: 6,
                }}>
                {androidMenuTarget.title}
              </Text>

              <TouchableOpacity
                onPress={() => {
                  const target = androidMenuTarget;
                  setAndroidMenuTarget(null);
                  onTogglePin(target.id);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: AURA_COLORS.surfaceContainerHigh,
                }}>
                <MaterialIcon name="push_pin" size={18} color={AURA_COLORS.secondaryFixed} />
                <Text style={{ fontFamily: AURA_FONTS.sansSemiBold, fontSize: 14, color: AURA_COLORS.onSurface }}>
                  {androidMenuTarget.isPinned ? 'Unpin Chat' : 'Pin Chat'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  const target = androidMenuTarget;
                  setAndroidMenuTarget(null);
                  openRename(target);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: AURA_COLORS.surfaceContainerHigh,
                }}>
                <MaterialIcon name="edit_note" size={18} color={AURA_COLORS.primary} />
                <Text style={{ fontFamily: AURA_FONTS.sansSemiBold, fontSize: 14, color: AURA_COLORS.onSurface }}>
                  Rename
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  const target = androidMenuTarget;
                  setAndroidMenuTarget(null);
                  confirmDelete(target);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: 'rgba(147, 0, 10, 0.25)',
                }}>
                <MaterialIcon name="delete" size={18} color={AURA_COLORS.error} />
                <Text style={{ fontFamily: AURA_FONTS.sansSemiBold, fontSize: 14, color: AURA_COLORS.error }}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Rename Modal Overlay */}
        {renameTarget && (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: 'rgba(6, 6, 12, 0.78)',
                justifyContent: 'center',
                paddingHorizontal: 24,
              },
            ]}>
            <View
              style={{
                borderRadius: 24,
                backgroundColor: '#1d1d29',
                borderWidth: 1,
                borderColor: 'rgba(205, 189, 255, 0.18)',
                padding: 18,
                gap: 14,
              }}>
              <Text
                style={{
                  fontFamily: AURA_FONTS.sansBold,
                  fontSize: 16.5,
                  color: AURA_COLORS.onSurface,
                }}>
                Rename Conversation
              </Text>
              <TextInput
                value={renameInput}
                onChangeText={setRenameInput}
                autoFocus
                maxLength={60}
                returnKeyType="done"
                onSubmitEditing={handleSaveRename}
                placeholder="Conversation title"
                placeholderTextColor={AURA_COLORS.outline}
                style={{
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: AURA_COLORS.surfaceContainerLowest,
                  borderWidth: 1,
                  borderColor: 'rgba(0, 241, 253, 0.28)',
                  paddingHorizontal: 14,
                  fontFamily: AURA_FONTS.sansRegular,
                  fontSize: 14,
                  color: AURA_COLORS.onSurface,
                }}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
                <TouchableOpacity
                  onPress={() => setRenameTarget(null)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 9,
                    borderRadius: 999,
                    backgroundColor: AURA_COLORS.surfaceContainerHigh,
                  }}>
                  <Text
                    style={{
                      fontFamily: AURA_FONTS.sansSemiBold,
                      fontSize: 13,
                      color: AURA_COLORS.onSurfaceVariant,
                    }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveRename}
                  disabled={!renameInput.trim()}
                  style={{
                    paddingHorizontal: 18,
                    paddingVertical: 9,
                    borderRadius: 999,
                    backgroundColor: AURA_COLORS.primaryContainer,
                    opacity: renameInput.trim() ? 1 : 0.45,
                  }}>
                  <Text
                    style={{
                      fontFamily: AURA_FONTS.sansSemiBold,
                      fontSize: 13,
                      color: AURA_COLORS.onPrimaryContainer,
                    }}>
                    Save
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        )}
      </View>
    </Modal>
  );
};
