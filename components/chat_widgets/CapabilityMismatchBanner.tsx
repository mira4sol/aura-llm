import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { MaterialIcon } from '@/components/MaterialIcon';
import { AURA_COLORS, AURA_FONTS } from '@/components/theme';
import type { ModelCapability } from '@/lib/types';

interface CapabilityMismatchBannerProps {
  required: ModelCapability;
  suggestion: 'switch' | 'download';
  candidateModelId?: string;
  candidateModelName?: string;
  onSwitchModel?: (modelId: string) => void;
  onOpenModels?: (capability: ModelCapability) => void;
}

export const CapabilityMismatchBanner = React.memo<CapabilityMismatchBannerProps>(
  function CapabilityMismatchBanner({
    required,
    suggestion,
    candidateModelId,
    candidateModelName,
    onSwitchModel,
    onOpenModels,
  }) {
    const isVision = required === 'vision';
    const title = isVision
      ? 'Active model is text-only'
      : 'No local model installed yet';
    const subtitle =
      suggestion === 'switch' && candidateModelName
        ? `Switch to ${candidateModelName} (already on this device) to analyze your image offline.`
        : isVision
          ? 'Download a Vision model (weights + mmproj projector) from the Models Vault to analyze photos offline.'
          : 'Install an open-source GGUF model from the Models Vault to start chatting 100% offline.';

    return (
      <View
        style={{
          borderRadius: 16,
          backgroundColor: 'rgba(108, 60, 233, 0.16)',
          borderWidth: 1,
          borderColor: 'rgba(205, 189, 255, 0.28)',
          padding: 13,
          gap: 10,
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 9 }}>
          <MaterialIcon
            name={isVision ? 'visibility' : 'memory'}
            size={19}
            color={AURA_COLORS.secondaryFixed}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: AURA_FONTS.sansSemiBold,
                fontSize: 13.5,
                color: AURA_COLORS.onSurface,
              }}>
              {title}
            </Text>
            <Text
              style={{
                fontFamily: AURA_FONTS.sansRegular,
                fontSize: 12.5,
                lineHeight: 18,
                color: AURA_COLORS.onSurfaceVariant,
                marginTop: 2,
              }}>
              {subtitle}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {suggestion === 'switch' && candidateModelId && onSwitchModel ? (
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => onSwitchModel(candidateModelId)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: AURA_COLORS.secondaryContainer,
              }}>
              <MaterialIcon name="swap_horiz" size={16} color={AURA_COLORS.onSecondaryContainer} />
              <Text
                style={{
                  fontFamily: AURA_FONTS.sansSemiBold,
                  fontSize: 12.5,
                  color: AURA_COLORS.onSecondary,
                }}>
                Switch to {candidateModelName ?? 'Vision Model'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => onOpenModels?.(required)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: AURA_COLORS.primaryContainer,
              }}>
              <MaterialIcon name="arrow_downward" size={16} color={AURA_COLORS.onPrimaryContainer} />
              <Text
                style={{
                  fontFamily: AURA_FONTS.sansSemiBold,
                  fontSize: 12.5,
                  color: AURA_COLORS.onPrimaryContainer,
                }}>
                {isVision ? 'Browse Vision Models' : 'Open Models Vault'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }
);
