import React, { useCallback, useEffect, useRef } from 'react';
import { View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { FlashList, type FlashListRef } from '@shopify/flash-list';

import type { ChatMessage, ModelCapability } from '@/lib/types';
import { useChatStore } from '@/store/chat.store';
import { MessageRow } from './MessageRow';

interface MessageListProps {
  messages: ChatMessage[];
  topPadding: number;
  bottomPadding: number;
  canEdit?: boolean;
  ListHeaderComponent?: React.ReactElement | null;
  ListEmptyComponent?: React.ReactElement | null;
  onEditMessage?: (messageId: string, newText: string) => void;
  onRegenerate?: () => void;
  onReadAloud?: (text: string, messageId: string) => void;
  onFeedback?: (messageId: string, val: 'up' | 'down' | null) => void;
  onSwitchModel?: (modelId: string) => void;
  onOpenModels?: (capability: ModelCapability) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  topPadding,
  bottomPadding,
  canEdit = true,
  ListHeaderComponent,
  ListEmptyComponent,
  onEditMessage,
  onRegenerate,
  onReadAloud,
  onFeedback,
  onSwitchModel,
  onOpenModels,
}) => {
  const listRef = useRef<FlashListRef<ChatMessage>>(null);
  const nearBottomRef = useRef(true);
  const isUserDraggingRef = useRef(false);
  const lastScrollTsRef = useRef(0);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scroll to bottom when a new message is appended (if user hasn't scrolled up)
  useEffect(() => {
    if (messages.length === 0 || !nearBottomRef.current || isUserDraggingRef.current) return;
    const id = setTimeout(() => {
      if (nearBottomRef.current && !isUserDraggingRef.current) {
        listRef.current?.scrollToEnd({ animated: true });
      }
    }, 40);
    return () => clearTimeout(id);
  }, [messages.length]);

  // Imperative zero-re-render subscription for streaming auto-scroll:
  // keeps MessageList from re-rendering on every token flush, yields to user drags,
  // and scrolls once more when streaming finishes so the Copy/Speak/Retry bar is visible.
  useEffect(() => {
    let prevVersion = useChatStore.getState().streaming?.version ?? 0;
    let wasStreaming = Boolean(useChatStore.getState().streaming);
    const unsub = useChatStore.subscribe((state) => {
      const isNowStreaming = Boolean(state.streaming);
      const nextVersion = state.streaming?.version ?? 0;

      // Streaming just completed or stopped -> nudge to reveal newly mounted action bar
      if (wasStreaming && !isNowStreaming) {
        wasStreaming = false;
        prevVersion = 0;
        if (nearBottomRef.current && !isUserDraggingRef.current) {
          setTimeout(() => {
            if (nearBottomRef.current && !isUserDraggingRef.current) {
              listRef.current?.scrollToEnd({ animated: true });
            }
          }, 80);
        }
        return;
      }

      wasStreaming = isNowStreaming;
      if (nextVersion === prevVersion) return;
      prevVersion = nextVersion;

      if (!nearBottomRef.current || isUserDraggingRef.current) return;
      const now = Date.now();
      const elapsed = now - lastScrollTsRef.current;
      if (elapsed >= 250) {
        lastScrollTsRef.current = now;
        listRef.current?.scrollToEnd({ animated: false });
      } else if (!scrollTimerRef.current) {
        scrollTimerRef.current = setTimeout(() => {
          scrollTimerRef.current = null;
          if (nearBottomRef.current && !isUserDraggingRef.current) {
            lastScrollTsRef.current = Date.now();
            listRef.current?.scrollToEnd({ animated: false });
          }
        }, 250 - elapsed);
      }
    });

    return () => {
      unsub();
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
        scrollTimerRef.current = null;
      }
    };
  }, []);

  const handleScrollBeginDrag = useCallback(() => {
    isUserDraggingRef.current = true;
    nearBottomRef.current = false;
  }, []);

  const handleScrollEndDrag = useCallback(() => {
    isUserDraggingRef.current = false;
  }, []);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    if (!isUserDraggingRef.current) {
      nearBottomRef.current = distanceFromBottom < 80;
    }
  }, []);

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  const renderItem = useCallback(
    ({ item, index }: { item: ChatMessage; index: number }) => (
      <MessageRow
        message={item}
        isLast={index === messages.length - 1}
        canEdit={canEdit}
        onEditMessage={onEditMessage}
        onRegenerate={onRegenerate}
        onReadAloud={onReadAloud}
        onFeedback={onFeedback}
        onSwitchModel={onSwitchModel}
        onOpenModels={onOpenModels}
      />
    ),
    [
      messages.length,
      canEdit,
      onEditMessage,
      onRegenerate,
      onReadAloud,
      onFeedback,
      onSwitchModel,
      onOpenModels,
    ]
  );

  return (
    <View style={{ flex: 1 }}>
      <FlashList
        ref={listRef}
        data={messages}
        keyExtractor={keyExtractor}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollEnd={handleScrollEndDrag}
        scrollEventThrottle={120}
        contentContainerStyle={{
          paddingTop: topPadding,
          paddingBottom: bottomPadding,
          paddingHorizontal: 20,
        }}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        renderItem={renderItem}
      />
    </View>
  );
};
