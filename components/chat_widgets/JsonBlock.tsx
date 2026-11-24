import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import { MaterialIcon } from '@/components/MaterialIcon';
import { AURA_COLORS, AURA_FONTS } from '@/components/theme';
import { JsonTreeNode } from './json/JsonTreeNode';

interface JsonBlockProps {
  raw: string;
  parsed?: unknown;
  valid: boolean;
  closed: boolean;
}

export const JsonBlock = React.memo<JsonBlockProps>(
  function JsonBlock({ raw, parsed, valid }) {
    const [mode, setMode] = useState<'tree' | 'raw'>(valid ? 'tree' : 'raw');
    const [copied, setCopied] = useState(false);

    const prettyRaw = valid ? JSON.stringify(parsed, null, 2) : raw;

    const handleCopy = async () => {
      await Clipboard.setStringAsync(prettyRaw);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    };

    return (
      <View
        style={{
          borderRadius: 16,
          backgroundColor: 'rgba(13, 13, 22, 0.94)',
          borderWidth: 1,
          borderColor: 'rgba(0, 241, 253, 0.16)',
          overflow: 'hidden',
        }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 12,
            paddingVertical: 7,
            backgroundColor: 'rgba(41, 41, 51, 0.55)',
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MaterialIcon name="dataset" size={14} color={AURA_COLORS.secondaryFixed} />
            <Text
              style={{
                fontFamily: AURA_FONTS.monoMedium,
                fontSize: 11,
                color: AURA_COLORS.secondaryFixed,
              }}>
              JSON
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {valid && (
              <TouchableOpacity
                onPress={() => setMode((m) => (m === 'tree' ? 'raw' : 'tree'))}
                activeOpacity={0.75}
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 999,
                  backgroundColor: 'rgba(52, 52, 62, 0.75)',
                }}>
                <Text
                  style={{
                    fontFamily: AURA_FONTS.monoMedium,
                    fontSize: 10.5,
                    color: AURA_COLORS.onSurfaceVariant,
                  }}>
                  {mode === 'tree' ? 'Raw' : 'Tree'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleCopy}
              activeOpacity={0.75}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 999,
                backgroundColor: copied ? 'rgba(0, 241, 253, 0.16)' : 'rgba(52, 52, 62, 0.75)',
              }}>
              <MaterialIcon
                name={copied ? 'check' : 'content_copy'}
                size={13}
                color={copied ? AURA_COLORS.secondaryFixed : AURA_COLORS.onSurfaceVariant}
              />
              <Text
                style={{
                  fontFamily: AURA_FONTS.monoMedium,
                  fontSize: 10.5,
                  color: copied ? AURA_COLORS.secondaryFixed : AURA_COLORS.onSurfaceVariant,
                }}>
                {copied ? 'Copied' : 'Copy'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 12 }}>
          {valid && mode === 'tree' ? (
            <JsonTreeNode value={parsed} />
          ) : (
            <Text
              selectable
              style={{
                fontFamily: AURA_FONTS.monoRegular,
                fontSize: 11.5,
                lineHeight: 17,
                color: AURA_COLORS.secondary,
              }}>
              {prettyRaw}
            </Text>
          )}
        </ScrollView>
      </View>
    );
  },
  (prev, next) => prev.raw === next.raw && prev.valid === next.valid && prev.closed === next.closed
);
