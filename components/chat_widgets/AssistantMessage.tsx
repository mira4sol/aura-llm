import React from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { PulsingDot } from '@/components/PulsingDot';
import { AURA_COLORS, AURA_FONTS } from '@/components/theme';
import type { ChatMessage, MessageBlock, ModelCapability } from '@/lib/types';
import { useChatStore } from '@/store/chat.store';
import { useRuntimeStore } from '@/store/runtime.store';
import { BlockRenderer } from './BlockRenderer';
import { MessageActionBar } from './MessageActionBar';
import { TelemetryPill } from './TelemetryPill';

interface AssistantMessageProps {
  message: ChatMessage;
  isLast: boolean;
  onRegenerate?: () => void;
  onReadAloud?: (text: string, messageId: string) => void;
  onFeedback?: (val: 'up' | 'down' | null) => void;
  onSwitchModel?: (modelId: string) => void;
  onOpenModels?: (capability: ModelCapability) => void;
}

export const AssistantMessage = React.memo<AssistantMessageProps>(function AssistantMessage({
  message,
  isLast,
  onRegenerate,
  onReadAloud,
  onFeedback,
  onSwitchModel,
  onOpenModels,
}) {
  // Only the actively streaming message subscribes to the live streaming buffer
  const liveStream = useChatStore((s) =>
    s.streaming?.messageId === message.id ? s.streaming : null
  );
  const activeBackend = useRuntimeStore((s) => s.activeBackend);
  const isThisMessageSpeaking = useRuntimeStore(
    (s) => s.voiceSpeaking && s.speakingMessageId === message.id
  );

  const isStreaming = Boolean(liveStream);
  const blocks: MessageBlock[] = liveStream ? liveStream.blocks : message.blocks;
  const rawText = liveStream ? liveStream.rawText : message.rawText;

  return (
    <View style={{ gap: 10 }}>
      {/* Agent Metadata Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <LinearGradient
            colors={[
              AURA_COLORS.secondaryContainer,
              AURA_COLORS.primaryContainer,
              AURA_COLORS.tertiaryContainer,
            ]}
            start={{ x: 0, y: 1 }}
            end={{ x: 1, y: 0 }}
            style={{
              width: 26,
              height: 26,
              borderRadius: 13,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <View
              style={{
                width: 13,
                height: 13,
                borderRadius: 6.5,
                backgroundColor: AURA_COLORS.surfaceContainerLowest,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <View
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 2.5,
                  backgroundColor: AURA_COLORS.secondary,
                }}
              />
            </View>
          </LinearGradient>
          <Text
            style={{
              fontFamily: AURA_FONTS.sansSemiBold,
              fontSize: 15,
              color: AURA_COLORS.onSurface,
            }}>
            Aura Intelligence
          </Text>
        </View>

        <TelemetryPill
          telemetry={message.telemetry}
          liveTokensPerSec={liveStream?.tokensPerSec}
          liveBackend={isStreaming ? activeBackend : undefined}
        />
      </View>

      {/* Content Glass Container */}
      <View
        style={{
          borderRadius: 22,
          padding: 15,
          backgroundColor: 'rgba(31, 31, 40, 0.92)',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.06)',
          gap: 12,
        }}>
        {blocks.length === 0 && isStreaming ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
            <PulsingDot size={7} color={AURA_COLORS.secondaryContainer} ring />
            <Text
              style={{
                fontFamily: AURA_FONTS.monoMedium,
                fontSize: 12,
                color: AURA_COLORS.onSurfaceVariant,
              }}>
              Running on-device inference…
            </Text>
          </View>
        ) : (
          blocks.map((block) => (
            <BlockRenderer
              key={block.id}
              block={block}
              onRetry={onRegenerate}
              onSwitchModel={onSwitchModel}
              onOpenModels={onOpenModels}
            />
          ))
        )}

        {message.status === 'stopped' && (
          <Text
            style={{
              fontFamily: AURA_FONTS.monoMedium,
              fontSize: 10.5,
              color: AURA_COLORS.outline,
            }}>
            Generation stopped
          </Text>
        )}

        {!isStreaming && (rawText.trim().length > 0 || message.status === 'stopped') && (
          <MessageActionBar
            rawText={rawText}
            isSpeaking={isThisMessageSpeaking}
            feedback={message.feedback}
            onRegenerate={isLast || message.status === 'stopped' ? onRegenerate : undefined}
            onReadAloud={onReadAloud ? () => onReadAloud(rawText, message.id) : undefined}
            onFeedback={rawText.trim().length > 0 ? onFeedback : undefined}
          />
        )}
      </View>
    </View>
  );
});
