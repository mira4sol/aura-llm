import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { MaterialIcon } from '@/components/MaterialIcon';
import { AURA_COLORS, AURA_FONTS } from '@/components/theme';
import { formatBytes, formatEta, formatSpeed } from '@/lib/format';
import { useDownloads } from '@/lib/hooks/useDownloads';
import { downloadService } from '@/services/downloads/downloadService';

interface ActiveDownloadsSectionProps {
  onCancelDownload: (id: string, name: string, bytesDone: number) => void;
}

/**
 * Isolated download-progress subscriber so 500ms progress ticks only re-render
 * active transfer cards and NEVER re-render the full Models Vault screen or RefreshControl.
 */
export const ActiveDownloadsSection = React.memo<ActiveDownloadsSectionProps>(
  function ActiveDownloadsSection({ onCancelDownload }) {
    const { activeDownloads } = useDownloads();

    if (activeDownloads.length === 0) return null;

    return (
      <View style={{ gap: 10 }}>
        <Text
          style={{
            fontFamily: AURA_FONTS.sansSemiBold,
            fontSize: 16,
            color: AURA_COLORS.onSurface,
          }}>
          Background Transfers ({activeDownloads.length})
        </Text>
        {activeDownloads.map((dl) => {
          const safeDone =
            dl.totalBytes > 0 ? Math.min(dl.bytesDone, dl.totalBytes) : dl.bytesDone;
          const pct =
            dl.totalBytes > 0
              ? Math.min(100, Math.round((safeDone / dl.totalBytes) * 100))
              : 0;
          const isPaused =
            dl.status === 'paused_user' ||
            dl.status === 'waiting_wifi' ||
            dl.status === 'failed';
          const isFinalizing = dl.status === 'assembling' || dl.status === 'verifying';
          return (
            <View
              key={dl.id}
              style={{
                borderRadius: 22,
                backgroundColor: AURA_COLORS.surfaceContainer,
                borderWidth: 1,
                borderColor: 'rgba(0, 241, 253, 0.22)',
                padding: 14,
                gap: 10,
              }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                <View style={{ flex: 1 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: AURA_FONTS.sansBold,
                      fontSize: 15,
                      color: AURA_COLORS.onSurface,
                    }}>
                    {dl.displayName} ({dl.quant})
                  </Text>
                  <Text
                    style={{
                      fontFamily: AURA_FONTS.monoMedium,
                      fontSize: 10.5,
                      color: AURA_COLORS.secondaryFixed,
                      marginTop: 2,
                    }}>
                    {dl.status.replace('_', ' ').toUpperCase()} · {pct}% ·{' '}
                    {formatBytes(safeDone)} / {formatBytes(dl.totalBytes)}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    onPress={() =>
                      isPaused
                        ? void downloadService.resume(dl.id, dl.status === 'waiting_wifi')
                        : void downloadService.pause(dl.id)
                    }
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      backgroundColor: AURA_COLORS.surfaceContainerHigh,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <MaterialIcon
                      name={isPaused ? 'play_arrow' : 'pause'}
                      size={18}
                      color={AURA_COLORS.secondaryFixed}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => onCancelDownload(dl.id, dl.displayName, dl.bytesDone)}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      backgroundColor: AURA_COLORS.surfaceContainerHigh,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <MaterialIcon name="close" size={17} color={AURA_COLORS.error} />
                  </TouchableOpacity>
                </View>
              </View>

              <View
                style={{
                  width: '100%',
                  height: 8,
                  borderRadius: 999,
                  backgroundColor: AURA_COLORS.surfaceContainerHighest,
                  overflow: 'hidden',
                }}>
                <LinearGradient
                  colors={[AURA_COLORS.primaryContainer, AURA_COLORS.secondaryContainer]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={{ width: `${pct}%`, height: '100%' }}
                />
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text
                  style={{
                    fontFamily: AURA_FONTS.monoRegular,
                    fontSize: 10.5,
                    color: AURA_COLORS.primary,
                  }}>
                  {isFinalizing
                    ? dl.status === 'verifying'
                      ? 'Verifying checksum…'
                      : 'Finalizing model file…'
                    : dl.status === 'downloading'
                      ? formatSpeed(dl.speedBps)
                      : (dl.error?.message ?? '')}
                </Text>
                <Text
                  style={{
                    fontFamily: AURA_FONTS.monoRegular,
                    fontSize: 10.5,
                    color: AURA_COLORS.outline,
                  }}>
                  {isFinalizing
                    ? 'Almost ready'
                    : dl.status === 'downloading'
                      ? formatEta(dl.etaSec)
                      : `${dl.files.length} file(s)`}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  }
);
