import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

import { MaterialIcon } from '@/components/MaterialIcon';
import { AURA_COLORS, AURA_FONTS } from '@/components/theme';
import { formatBytes } from '@/lib/format';
import type { DiscoveredModel, QuantVariant } from '@/lib/types';
import { downloadService } from '@/services/downloads/downloadService';
import { useDownloadsStore } from '@/store/downloads.store';

interface ModelDownloadActionsProps {
  bundleId: string;
  model: DiscoveredModel;
  variant: QuantVariant;
  isInstalled: boolean;
  isResolving: boolean;
  onStartDownload: (model: DiscoveredModel, variant: QuantVariant) => void;
  onCancelDownload: (id: string, name: string, bytesDone: number) => void;
}

/**
 * Per-card download action row subscribed strictly to `tasks[bundleId]`.
 * Prevents progress ticks on one model from re-rendering any other catalog card.
 */
export const ModelDownloadActions = React.memo<ModelDownloadActionsProps>(
  function ModelDownloadActions({
    bundleId,
    model,
    variant,
    isInstalled,
    isResolving,
    onStartDownload,
    onCancelDownload,
  }) {
    const activeTask = useDownloadsStore((s) => s.tasks[bundleId]);
    const isInQueue = Boolean(
      activeTask && activeTask.status !== 'completed' && activeTask.status !== 'cancelled'
    );
    const isPaused =
      activeTask?.status === 'paused_user' ||
      activeTask?.status === 'waiting_wifi' ||
      activeTask?.status === 'failed';

    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TouchableOpacity
          disabled={isInstalled || isResolving || Boolean(model.incompleteBundle)}
          onPress={() => {
            if (activeTask && isInQueue) {
              if (isPaused) {
                void downloadService.resume(bundleId, activeTask.status === 'waiting_wifi');
              } else {
                void downloadService.pause(bundleId);
              }
              return;
            }
            onStartDownload(model, variant);
          }}
          activeOpacity={0.82}
          style={{
            flex: 1,
            height: 40,
            borderRadius: 999,
            backgroundColor: isInstalled
              ? AURA_COLORS.surfaceContainerHigh
              : isInQueue
                ? 'rgba(0, 241, 253, 0.16)'
                : AURA_COLORS.primaryContainer,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            opacity: model.incompleteBundle ? 0.5 : 1,
          }}>
          {isResolving ? (
            <ActivityIndicator size="small" color={AURA_COLORS.onPrimaryContainer} />
          ) : (
            <MaterialIcon
              name={
                isInstalled
                  ? 'check'
                  : isInQueue
                    ? isPaused
                      ? 'play_arrow'
                      : 'pause'
                    : 'arrow_downward'
              }
              size={16}
              color={isInstalled || isInQueue ? AURA_COLORS.secondaryFixed : AURA_COLORS.onPrimaryContainer}
            />
          )}
          <Text
            style={{
              fontFamily: AURA_FONTS.sansSemiBold,
              fontSize: 13,
              color:
                isInstalled || isInQueue
                  ? AURA_COLORS.secondaryFixed
                  : AURA_COLORS.onPrimaryContainer,
            }}>
            {isInstalled
              ? 'Installed in Vault'
              : isResolving
                ? 'Inspecting GGUF & SHA-256…'
                : activeTask && isInQueue
                  ? `In Queue (${activeTask.status.replace('_', ' ')})`
                  : `Install ${variant.quant}${variant.totalBytes > 0 ? ` · ${formatBytes(variant.totalBytes)}` : ''}`}
          </Text>
        </TouchableOpacity>

        {!isInstalled && activeTask && isInQueue && (
          <TouchableOpacity
            onPress={() => onCancelDownload(bundleId, model.displayName, activeTask.bytesDone)}
            activeOpacity={0.8}
            accessibilityLabel={`Cancel ${model.displayName} download`}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(147, 0, 10, 0.22)',
              borderWidth: 1,
              borderColor: 'rgba(255, 180, 171, 0.25)',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <MaterialIcon name="close" size={18} color={AURA_COLORS.error} />
          </TouchableOpacity>
        )}
      </View>
    );
  }
);
