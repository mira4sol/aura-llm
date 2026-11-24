import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmbientGlow } from '@/components/AmbientGlow';
import {
  ChatComposer,
  ChatHeader,
  ChatHistoryDrawer,
  getTuningLabel,
  MessageList,
  ModelTuningSheet,
} from '@/components/chat_widgets';
import { MaterialIcon } from '@/components/MaterialIcon';
import {
  AURA_COLORS,
  AURA_FONTS,
  getTabBarTotalHeight,
  HEADER_CONTENT_HEIGHT,
} from '@/components/theme';
import { formatBytes } from '@/lib/format';
import { useActiveModel } from '@/lib/hooks/useActiveModel';
import { useHardwareProfile } from '@/lib/hooks/useHardwareProfile';
import { useKeyboardVisible } from '@/lib/hooks/useKeyboardVisible';
import { useVoiceInput } from '@/lib/hooks/useVoiceInput';
import type { ModelCapability } from '@/lib/types';
import { attachmentService } from '@/services/chat/attachmentService';
import { chatService } from '@/services/chat/chatService';
import { modelRegistry } from '@/services/models/modelRegistry';
import { useAppStore } from '@/store/app.store';
import { useChatStore } from '@/store/chat.store';
import { useModelsStore } from '@/store/models.store';

export default function ConversationalAssistantScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ cid?: string; autostart?: string; prompt?: string }>();
  const insets = useSafeAreaInsets();

  const { hardware } = useHardwareProfile();
  const { keyboardVisible } = useKeyboardVisible();
  const { activeModel, engineState, activeBackend, activeContextLength, lastTokensPerSec } =
    useActiveModel();

  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const conversations = useChatStore((s) => s.conversations);
  const activeMessages = useChatStore((s) => s.activeMessages);
  const isGenerating = useChatStore((s) => s.isGenerating);
  const pendingAttachments = useChatStore((s) => s.pendingAttachments);
  const removePendingAttachment = useChatStore((s) => s.removePendingAttachment);

  const preferences = useAppStore((s) => s.preferences);
  const updatePreferences = useAppStore((s) => s.updatePreferences);
  const installedModels = useModelsStore((s) => s.installed);

  const [inputText, setInputText] = useState(
    typeof params.prompt === 'string' ? params.prompt : ''
  );
  const [lastAppliedPrompt, setLastAppliedPrompt] = useState<string | undefined>(
    typeof params.prompt === 'string' ? params.prompt : undefined
  );
  const [showModelSheet, setShowModelSheet] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const autostartHandledRef = useRef<string | null>(null);

  if (typeof params.prompt === 'string' && params.prompt !== lastAppliedPrompt) {
    setLastAppliedPrompt(params.prompt);
    setInputText(params.prompt);
  }

  // Hydrate conversation from route param (e.g. Home -> Assistant)
  useEffect(() => {
    const cid = typeof params.cid === 'string' ? params.cid : undefined;
    if (!cid) return;

    void chatService.loadConversation(cid).then(() => {
      if (params.autostart === '1' && autostartHandledRef.current !== cid) {
        autostartHandledRef.current = cid;
        void chatService.runAssistantTurn(cid);
      }
    });
  }, [params.cid, params.autostart]);

  // Ensure in-flight streams stop cleanly if Assistant unmounts
  useEffect(() => {
    return () => {
      if (useChatStore.getState().isGenerating) {
        void chatService.stopGeneration();
      }
    };
  }, []);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) ?? null,
    [conversations, activeConversationId]
  );

  const handleTranscript = useCallback((text: string) => {
    setInputText(text);
  }, []);

  const { isListening, voiceError, toggleDictation, speak } = useVoiceInput(handleTranscript);

  const handleSend = useCallback(async () => {
    try {
      const textToSend = inputText.trim();
      const atts = useChatStore.getState().pendingAttachments;
      if (!textToSend && atts.length === 0) return;

      setInputText('');
      await chatService.sendMessage(activeConversationId, textToSend, atts);
    } catch (err) {
      Alert.alert(
        'Message Failed',
        err instanceof Error ? err.message : 'Unable to send message locally.'
      );
    }
  }, [activeConversationId, inputText]);

  const handleEditMessage = useCallback(
    async (messageId: string, newText: string) => {
      if (!activeConversationId) return;
      try {
        await chatService.editUserMessage(activeConversationId, messageId, newText);
      } catch (err) {
        Alert.alert(
          'Edit Failed',
          err instanceof Error ? err.message : 'Unable to regenerate edited prompt.'
        );
      }
    },
    [activeConversationId]
  );

  const handlePickImage = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Photo Library', 'Take Photo'],
          cancelButtonIndex: 0,
        },
        (idx) => {
          if (idx === 1) void attachmentService.pickImage('library');
          else if (idx === 2) void attachmentService.pickImage('camera');
        }
      );
    } else {
      Alert.alert('Attach Image', 'Choose an image source for offline analysis', [
        { text: 'Photo Library', onPress: () => void attachmentService.pickImage('library') },
        { text: 'Camera', onPress: () => void attachmentService.pickImage('camera') },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }, []);

  const handleSwitchModelAndRetry = useCallback(
    async (modelId: string) => {
      try {
        await modelRegistry.activateModel(modelId);
        if (activeConversationId) {
          await chatService.regenerateLast(activeConversationId);
        }
      } catch (err) {
        Alert.alert('Model Switch Failed', err instanceof Error ? err.message : String(err));
      }
    },
    [activeConversationId]
  );

  const handleOpenModels = useCallback(
    (cap: ModelCapability) => {
      const cat =
        cap === 'vision'
          ? 'Vision'
          : cap === 'audio_stt' || cap === 'voice_tts'
            ? 'Voice & Audio'
            : 'Chat';
      router.push({ pathname: '/(tabs)/models', params: { category: cat } });
    },
    [router]
  );

  const handleNewChat = useCallback(() => {
    setInputText('');
    void chatService.startNewChat();
  }, []);

  const handleSwitchModelOnly = useCallback(async (modelId: string) => {
    try {
      await modelRegistry.activateModel(modelId);
    } catch (err) {
      Alert.alert('Model Switch Failed', err instanceof Error ? err.message : String(err));
    }
  }, []);

  const handleSelectConversation = useCallback((id: string) => {
    void chatService.loadConversation(id);
  }, []);

  const handleRegenerate = useCallback(() => {
    if (activeConversationId) void chatService.regenerateLast(activeConversationId);
  }, [activeConversationId]);

  const handleReadAloud = useCallback(
    (text: string, messageId: string) => {
      void speak(text, messageId);
    },
    [speak]
  );

  const handleFeedback = useCallback(
    (msgId: string, val: 'up' | 'down' | null) => {
      if (activeConversationId) void chatService.setFeedback(activeConversationId, msgId, val);
    },
    [activeConversationId]
  );

  const handleEditMessageCallback = useCallback(
    (msgId: string, newText: string) => {
      void handleEditMessage(msgId, newText);
    },
    [handleEditMessage]
  );

  const handleSwitchModelCallback = useCallback(
    (modelId: string) => {
      void handleSwitchModelAndRetry(modelId);
    },
    [handleSwitchModelAndRetry]
  );

  const topPadding = insets.top + HEADER_CONTENT_HEIGHT + 8;
  const tabBarSpace = getTabBarTotalHeight(insets.bottom);

  const statusBanner = voiceError
    ? voiceError
    : engineState === 'loading'
      ? `Warming up ${activeModel?.displayName ?? 'local model'}…`
      : isListening
        ? 'Offline Whisper/VAD dictation active — tap mic to stop'
        : null;

  const ramSummary = hardware
    ? `${formatBytes(hardware.memory.safeBudgetBytes)} AI Pool / ${formatBytes(hardware.memory.totalBytes)}`
    : 'Profiling device…';

  const headerComponent = (
    <View style={{ paddingBottom: 10 }}>
      {/* Live Micro Hardware Telemetry Strip */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 999,
          backgroundColor: 'rgba(27, 27, 36, 0.78)',
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
          <MaterialIcon name="memory" size={14} color={AURA_COLORS.outline} />
          <Text
            numberOfLines={1}
            style={{
              fontFamily: AURA_FONTS.monoMedium,
              fontSize: 10.5,
              color: AURA_COLORS.onSurfaceVariant,
            }}>
            {ramSummary}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text
            style={{
              fontFamily: AURA_FONTS.monoMedium,
              fontSize: 10.5,
              color: AURA_COLORS.secondaryFixedDim,
            }}>
            {lastTokensPerSec
              ? `${lastTokensPerSec.toFixed(1)} tok/s`
              : (activeBackend?.toUpperCase() ?? 'OFFLINE')}
          </Text>
          <Text
            style={{
              fontFamily: AURA_FONTS.monoMedium,
              fontSize: 10.5,
              color: AURA_COLORS.onSurfaceVariant,
            }}>
            ctx: {activeContextLength.toLocaleString()}
          </Text>
        </View>
      </View>
    </View>
  );

  const emptyComponent = (
    <View style={{ alignItems: 'center', paddingTop: 56, paddingHorizontal: 12, gap: 12 }}>
      <View
        style={{
          width: 54,
          height: 54,
          borderRadius: 27,
          backgroundColor: 'rgba(108, 60, 233, 0.22)',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <MaterialIcon name="auto_awesome" size={26} color={AURA_COLORS.secondaryFixed} />
      </View>
      <Text
        style={{
          fontFamily: AURA_FONTS.sansBold,
          fontSize: 19,
          color: AURA_COLORS.onSurface,
          textAlign: 'center',
        }}>
        100% On-Device Intelligence
      </Text>
      <Text
        style={{
          fontFamily: AURA_FONTS.sansRegular,
          fontSize: 13.5,
          lineHeight: 20,
          color: AURA_COLORS.onSurfaceVariant,
          textAlign: 'center',
        }}>
        {activeModel
          ? `Running ${activeModel.displayName} (${activeModel.quant}) locally. Ask a question, attach a PDF/code file, or tap the mic.`
          : 'Install an open-source model in the Models Vault to begin private offline inference.'}
      </Text>
      {!activeModel && (
        <TouchableOpacity
          activeOpacity={0.82}
          onPress={() => router.push('/(tabs)/models')}
          style={{
            marginTop: 6,
            paddingHorizontal: 18,
            paddingVertical: 10,
            borderRadius: 999,
            backgroundColor: AURA_COLORS.primaryContainer,
          }}>
          <Text
            style={{
              fontFamily: AURA_FONTS.sansSemiBold,
              fontSize: 13.5,
              color: AURA_COLORS.onPrimaryContainer,
            }}>
            Open Models Vault
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior="padding"
      enabled={Platform.OS === 'ios' || keyboardVisible}
      style={{ flex: 1, backgroundColor: AURA_COLORS.surface }}>
      <ChatHeader
        modelName={activeModel?.displayName ?? null}
        tuningLabel={getTuningLabel(preferences.temperature)}
        conversationTitle={activeConversation?.title ?? null}
        selectorOpen={showModelSheet}
        onMenuPress={() => setDrawerOpen(true)}
        onModelSelectorPress={() => setShowModelSheet((prev) => !prev)}
        onNewChatPress={handleNewChat}
      />

      <AmbientGlow
        id="chatGlow1"
        color={AURA_COLORS.primaryContainer}
        size={340}
        opacity={0.2}
        style={{ top: 70, alignSelf: 'center' }}
      />
      <AmbientGlow
        id="chatGlow2"
        color={AURA_COLORS.tertiaryContainer}
        size={260}
        opacity={0.16}
        style={{ bottom: 130, left: -80 }}
      />

      <MessageList
        messages={activeMessages}
        topPadding={topPadding}
        bottomPadding={16}
        canEdit={!isGenerating}
        ListHeaderComponent={headerComponent}
        ListEmptyComponent={emptyComponent}
        onEditMessage={handleEditMessageCallback}
        onRegenerate={handleRegenerate}
        onReadAloud={handleReadAloud}
        onFeedback={handleFeedback}
        onSwitchModel={handleSwitchModelCallback}
        onOpenModels={handleOpenModels}
      />

      <ChatComposer
        value={inputText}
        onChangeText={setInputText}
        onSend={() => void handleSend()}
        onStop={() => void chatService.stopGeneration()}
        onPickDocument={() =>
          void attachmentService.pickAndParseDocument().catch((err) => {
            Alert.alert('Attachment Error', err instanceof Error ? err.message : String(err));
          })
        }
        onPickImage={handlePickImage}
        onToggleMic={() => void toggleDictation()}
        isGenerating={isGenerating}
        isListening={isListening}
        attachments={pendingAttachments}
        onRemoveAttachment={removePendingAttachment}
        statusBanner={statusBanner}
        bottomOffset={tabBarSpace}
        keyboardVisible={keyboardVisible}
      />

      <ModelTuningSheet
        visible={showModelSheet}
        installedModels={installedModels}
        activeModelId={activeModel?.id ?? null}
        temperature={preferences.temperature}
        topP={preferences.topP}
        enableThinking={Boolean(preferences.enableThinking)}
        onClose={() => setShowModelSheet(false)}
        onSelectModel={(modelId) => void handleSwitchModelOnly(modelId)}
        onSelectTemperature={(temperature) => updatePreferences({ temperature })}
        onToggleThinking={(enableThinking) => updatePreferences({ enableThinking })}
        onOpenModelsVault={() => router.push('/(tabs)/models')}
      />

      <ChatHistoryDrawer
        visible={drawerOpen}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onClose={() => setDrawerOpen(false)}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onTogglePin={(id) => void chatService.togglePin(id)}
        onRenameConversation={(id, title) => void chatService.renameConversation(id, title)}
        onDeleteConversation={(id) => void chatService.deleteConversation(id)}
      />
    </KeyboardAvoidingView>
  );
}
