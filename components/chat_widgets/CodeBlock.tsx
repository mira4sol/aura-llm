import React, { useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import { MaterialIcon } from '@/components/MaterialIcon';
import { AURA_COLORS, AURA_FONTS } from '@/components/theme';
import { highlightCodeToSpans } from './code/syntaxHighlight';

interface CodeBlockProps {
  language: string | null;
  code: string;
  closed: boolean;
}

export const CodeBlock = React.memo<CodeBlockProps>(
  function CodeBlock({ language, code }) {
    const [copied, setCopied] = useState(false);

    const spans = useMemo(() => highlightCodeToSpans(code, language), [code, language]);

    const handleCopy = async () => {
      await Clipboard.setStringAsync(code);
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
          borderColor: 'rgba(255, 255, 255, 0.08)',
          overflow: 'hidden',
        }}>
        {/* Header Bar */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 12,
            paddingVertical: 7,
            backgroundColor: 'rgba(41, 41, 51, 0.55)',
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255, 255, 255, 0.05)',
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MaterialIcon name="terminal" size={14} color={AURA_COLORS.secondaryFixed} />
            <Text
              style={{
                fontFamily: AURA_FONTS.monoMedium,
                fontSize: 11,
                color: AURA_COLORS.onSurfaceVariant,
                textTransform: 'uppercase',
              }}>
              {language || 'code'}
            </Text>
          </View>

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
              backgroundColor: copied
                ? 'rgba(0, 241, 253, 0.16)'
                : 'rgba(52, 52, 62, 0.75)',
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

        {/* Horizontally scrollable code */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ padding: 12 }}>
          <Text
            selectable
            style={{
              fontFamily: AURA_FONTS.monoRegular,
              fontSize: 12,
              lineHeight: 18,
              color: AURA_COLORS.onSurface,
            }}>
            {spans.map((s, idx) => (
              <Text key={idx} style={{ color: s.color }}>
                {s.text}
              </Text>
            ))}
          </Text>
        </ScrollView>
      </View>
    );
  },
  (prev, next) =>
    prev.code === next.code && prev.language === next.language && prev.closed === next.closed
);
