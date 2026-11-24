import React from 'react';
import { Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaterialIcon } from '@/components/MaterialIcon';
import { PulsingDot } from '@/components/PulsingDot';
import { AURA_COLORS, AURA_FONTS, HEADER_CONTENT_HEIGHT } from '@/components/theme';
import type { InstalledModel } from '@/lib/types';

export const TUNING_PRESETS = [
  { label: 'Precise', temp: 0.2, desc: 'Focused & deterministic' },
  { label: 'Balanced', temp: 0.7, desc: 'Everyday reasoning' },
  { label: 'Creative', temp: 1.0, desc: 'Expressive & varied' },
] as const;

export function getTuningLabel(temperature: number): string {
  if (temperature <= 0.35) return 'Precise';
  if (temperature >= 0.85) return 'Creative';
  return 'Balanced';
}

interface ModelTuningSheetProps {
  visible: boolean;
  installedModels: InstalledModel[];
  activeModelId: string | null;
  temperature: number;
  topP: number;
  enableThinking: boolean;
  onClose: () => void;
  onSelectModel: (modelId: string) => void;
  onSelectTemperature: (temperature: number) => void;
  onToggleThinking: (enabled: boolean) => void;
  onOpenModelsVault: () => void;
}

export const ModelTuningSheet: React.FC<ModelTuningSheetProps> = ({
  visible,
  installedModels,
  activeModelId,
  temperature,
  topP,
  enableThinking,
  onClose,
  onSelectModel,
  onSelectTemperature,
  onToggleThinking,
  onOpenModelsVault,
}) => {
  const insets = useSafeAreaInsets();
  const chatModels = installedModels.filter((m) => m.capabilities.includes('text'));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: 'rgba(6, 6, 12, 0.56)',
          paddingTop: insets.top + HEADER_CONTENT_HEIGHT + 6,
          paddingHorizontal: 14,
        }}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            borderRadius: 20,
            backgroundColor: 'rgba(24, 24, 34, 0.98)',
            borderWidth: 1,
            borderColor: 'rgba(205, 189, 255, 0.16)',
            padding: 14,
            gap: 14,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.55,
            shadowRadius: 24,
            elevation: 18,
          }}>
          {/* Section 1: Response Tuning */}
          <View style={{ gap: 8 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialIcon name="tune" size={14} color={AURA_COLORS.secondaryFixed} />
                <Text
                  style={{
                    fontFamily: AURA_FONTS.sansSemiBold,
                    fontSize: 12.5,
                    color: AURA_COLORS.onSurface,
                  }}>
                  Response Tuning
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: AURA_FONTS.monoMedium,
                  fontSize: 10.5,
                  color: AURA_COLORS.outline,
                }}>
                Temp{' '}
                <Text style={{ color: AURA_COLORS.secondaryFixed }}>
                  {temperature.toFixed(1)}
                </Text>{' '}
                · Top_P{' '}
                <Text style={{ color: AURA_COLORS.secondaryFixed }}>{topP.toFixed(1)}</Text>
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 6 }}>
              {TUNING_PRESETS.map((preset) => {
                const selected = Math.abs(temperature - preset.temp) < 0.15;
                return (
                  <TouchableOpacity
                    key={preset.label}
                    activeOpacity={0.78}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      onSelectTemperature(preset.temp);
                    }}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      paddingHorizontal: 6,
                      borderRadius: 12,
                      alignItems: 'center',
                      backgroundColor: selected
                        ? 'rgba(108, 60, 233, 0.34)'
                        : 'rgba(41, 41, 51, 0.65)',
                      borderWidth: 1,
                      borderColor: selected
                        ? 'rgba(111, 246, 255, 0.42)'
                        : 'rgba(255, 255, 255, 0.06)',
                    }}>
                    <Text
                      style={{
                        fontFamily: selected ? AURA_FONTS.sansSemiBold : AURA_FONTS.sansMedium,
                        fontSize: 12,
                        color: selected ? AURA_COLORS.secondary : AURA_COLORS.onSurfaceVariant,
                      }}>
                      {preset.label}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={{
                        fontFamily: AURA_FONTS.monoMedium,
                        fontSize: 9.5,
                        color: selected ? AURA_COLORS.secondaryFixed : AURA_COLORS.outline,
                        marginTop: 2,
                      }}>
                      {preset.temp.toFixed(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Deep Thinking Toggle (default OFF for fast direct answers) */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                void Haptics.selectionAsync();
                onToggleThinking(!enableThinking);
              }}
              style={{
                marginTop: 2,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                paddingHorizontal: 11,
                paddingVertical: 9,
                borderRadius: 12,
                backgroundColor: enableThinking
                  ? 'rgba(108, 60, 233, 0.24)'
                  : 'rgba(41, 41, 51, 0.5)',
                borderWidth: 1,
                borderColor: enableThinking
                  ? 'rgba(205, 189, 255, 0.34)'
                  : 'rgba(255, 255, 255, 0.05)',
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <MaterialIcon
                  name="neurology"
                  size={15}
                  color={enableThinking ? AURA_COLORS.secondaryFixed : AURA_COLORS.outline}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: AURA_FONTS.sansSemiBold,
                      fontSize: 12,
                      color: AURA_COLORS.onSurface,
                    }}>
                    Deep Thinking
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: AURA_FONTS.sansRegular,
                      fontSize: 10.5,
                      color: AURA_COLORS.outline,
                    }}>
                    {enableThinking
                      ? 'Shows collapsible reasoning (slower)'
                      : 'Off · Fast direct answers'}
                  </Text>
                </View>
              </View>
              <View
                style={{
                  width: 38,
                  height: 22,
                  borderRadius: 11,
                  padding: 2,
                  justifyContent: 'center',
                  alignItems: enableThinking ? 'flex-end' : 'flex-start',
                  backgroundColor: enableThinking
                    ? AURA_COLORS.secondaryContainer
                    : AURA_COLORS.surfaceContainerHighest,
                }}>
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: '#ffffff',
                  }}
                />
              </View>
            </TouchableOpacity>
          </View>

          <View style={{ height: 1, backgroundColor: 'rgba(255, 255, 255, 0.06)' }} />

          {/* Section 2: Installed Models */}
          <View style={{ gap: 8 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialIcon name="memory" size={14} color={AURA_COLORS.primary} />
                <Text
                  style={{
                    fontFamily: AURA_FONTS.sansSemiBold,
                    fontSize: 12.5,
                    color: AURA_COLORS.onSurface,
                  }}>
                  On-Device Models
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: AURA_FONTS.monoMedium,
                  fontSize: 10.5,
                  color: AURA_COLORS.outline,
                }}>
                {chatModels.length} installed
              </Text>
            </View>

            {chatModels.length === 0 ? (
              <Text
                style={{
                  fontFamily: AURA_FONTS.sansRegular,
                  fontSize: 12.5,
                  color: AURA_COLORS.onSurfaceVariant,
                  paddingVertical: 6,
                }}>
                No chat models installed yet. Open Models Vault to download one.
              </Text>
            ) : (
              <ScrollView
                style={{ maxHeight: 210 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ gap: 6 }}>
                {chatModels.map((model) => {
                  const isActive = model.id === activeModelId;
                  return (
                    <TouchableOpacity
                      key={model.id}
                      activeOpacity={0.78}
                      onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onSelectModel(model.id);
                        onClose();
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                        paddingHorizontal: 11,
                        paddingVertical: 9,
                        borderRadius: 12,
                        backgroundColor: isActive
                          ? 'rgba(0, 241, 253, 0.1)'
                          : 'rgba(41, 41, 51, 0.5)',
                        borderWidth: 1,
                        borderColor: isActive
                          ? 'rgba(0, 241, 253, 0.34)'
                          : 'rgba(255, 255, 255, 0.05)',
                      }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                          flex: 1,
                          minWidth: 0,
                        }}>
                        <PulsingDot
                          size={7}
                          color={isActive ? AURA_COLORS.secondaryContainer : AURA_COLORS.outlineVariant}
                        />
                        <Text
                          numberOfLines={1}
                          style={{
                            fontFamily: isActive ? AURA_FONTS.sansSemiBold : AURA_FONTS.sansMedium,
                            fontSize: 13,
                            color: isActive ? AURA_COLORS.onSurface : AURA_COLORS.onSurfaceVariant,
                            flexShrink: 1,
                          }}>
                          {model.displayName}
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View
                          style={{
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 6,
                            backgroundColor: 'rgba(13, 13, 22, 0.85)',
                          }}>
                          <Text
                            style={{
                              fontFamily: AURA_FONTS.monoMedium,
                              fontSize: 10,
                              color: isActive
                                ? AURA_COLORS.secondaryFixed
                                : AURA_COLORS.onSurfaceVariant,
                            }}>
                            {model.quant}
                          </Text>
                        </View>
                        {isActive && (
                          <MaterialIcon name="check" size={15} color={AURA_COLORS.secondaryFixed} />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* Open Models Vault */}
            <TouchableOpacity
              activeOpacity={0.78}
              onPress={() => {
                onClose();
                onOpenModelsVault();
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingVertical: 9,
                borderRadius: 12,
                backgroundColor: 'rgba(108, 60, 233, 0.2)',
                borderWidth: 1,
                borderColor: 'rgba(205, 189, 255, 0.2)',
                marginTop: 2,
              }}>
              <MaterialIcon name="auto_awesome" size={14} color={AURA_COLORS.secondaryFixed} />
              <Text
                style={{
                  fontFamily: AURA_FONTS.sansSemiBold,
                  fontSize: 12.5,
                  color: AURA_COLORS.onPrimaryContainer,
                }}>
                Manage Models Vault
              </Text>
              <MaterialIcon name="chevron_right" size={15} color={AURA_COLORS.primary} />
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
