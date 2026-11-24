import React from 'react';
import { View } from 'react-native';

import type { ChatMessage, ModelCapability } from '@/lib/types';
import { AssistantMessage } from './AssistantMessage';
import { UserBubble } from './UserBubble';

interface MessageRowProps {
  message: ChatMessage;
  isLast: boolean;
  canEdit?: boolean;
  onEditMessage?: (messageId: string, newText: string) => void;
  onRegenerate?: () => void;
  onReadAloud?: (text: string, messageId: string) => void;
  onFeedback?: (messageId: string, val: 'up' | 'down' | null) => void;
  onSwitchModel?: (modelId: string) => void;
  onOpenModels?: (capability: ModelCapability) => void;
}

export const MessageRow = React.memo<MessageRowProps>(
  function MessageRow({
    message,
    isLast,
    canEdit,
    onEditMessage,
    onRegenerate,
    onReadAloud,
    onFeedback,
    onSwitchModel,
    onOpenModels,
  }) {
    return (
      <View style={{ paddingVertical: 8 }}>
        {message.role === 'user' ? (
          <UserBubble message={message} canEdit={canEdit} onEdit={onEditMessage} />
        ) : (
          <AssistantMessage
            message={message}
            isLast={isLast}
            onRegenerate={onRegenerate}
            onReadAloud={onReadAloud}
            onFeedback={onFeedback ? (val) => onFeedback(message.id, val) : undefined}
            onSwitchModel={onSwitchModel}
            onOpenModels={onOpenModels}
          />
        )}
      </View>
    );
  },
  (prev, next) =>
    prev.message === next.message &&
    prev.isLast === next.isLast &&
    prev.canEdit === next.canEdit
);
