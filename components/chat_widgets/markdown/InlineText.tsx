import React from 'react';
import { Alert, Linking, Platform, Text, type TextStyle } from 'react-native';

import { AURA_COLORS, AURA_FONTS } from '@/components/theme';
import { isLikelyInlineDollarMath, latexToReadableUnicode } from '@/lib/chat/latexMath';

interface InlineTextProps {
  text: string;
  baseStyle?: TextStyle;
}

interface InlineSegment {
  kind: 'text' | 'bold' | 'italic' | 'strike' | 'code' | 'math' | 'link';
  content: string;
  href?: string;
}

const MATH_SERIF_FONT = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: AURA_FONTS.sansMedium,
});

const INLINE_REGEX =
  /(`[^`]+`|\\\([\s\S]+?\\\)|\$(?!\$)[^$\n]+?\$|\*\*[^*\n]+\*\*|__[^_\n]+__|~~[^~\n]+~~|\*[^*\n]+\*|(?<![a-zA-Z0-9])_[^_\n]+_(?![a-zA-Z0-9])|\[[^\]]+\]\(https?:\/\/[^)]+\))/g;

function tokenizeInline(input: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  let lastIndex = 0;

  for (const match of input.matchAll(INLINE_REGEX)) {
    const idx = match.index ?? 0;
    if (idx > lastIndex) {
      segments.push({ kind: 'text', content: input.slice(lastIndex, idx) });
    }
    const token = match[0];
    if (token.startsWith('`') && token.endsWith('`')) {
      segments.push({ kind: 'code', content: token.slice(1, -1) });
    } else if (token.startsWith('\\(') && token.endsWith('\\)')) {
      segments.push({ kind: 'math', content: token.slice(2, -2) });
    } else if (token.startsWith('$') && token.endsWith('$')) {
      const inner = token.slice(1, -1);
      if (isLikelyInlineDollarMath(inner)) {
        segments.push({ kind: 'math', content: inner });
      } else {
        segments.push({ kind: 'text', content: token });
      }
    } else if (
      (token.startsWith('**') && token.endsWith('**')) ||
      (token.startsWith('__') && token.endsWith('__'))
    ) {
      segments.push({ kind: 'bold', content: token.slice(2, -2) });
    } else if (token.startsWith('~~') && token.endsWith('~~')) {
      segments.push({ kind: 'strike', content: token.slice(2, -2) });
    } else if (
      (token.startsWith('*') && token.endsWith('*')) ||
      (token.startsWith('_') && token.endsWith('_'))
    ) {
      segments.push({ kind: 'italic', content: token.slice(1, -1) });
    } else if (token.startsWith('[')) {
      const m = token.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
      if (m) {
        segments.push({ kind: 'link', content: m[1], href: m[2] });
      } else {
        segments.push({ kind: 'text', content: token });
      }
    }
    lastIndex = idx + token.length;
  }

  if (lastIndex < input.length) {
    segments.push({ kind: 'text', content: input.slice(lastIndex) });
  }
  return segments;
}

function confirmOpenLink(url: string): void {
  Alert.alert('Open External Link?', url, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Open',
      onPress: () => {
        void Linking.openURL(url).catch(() => {});
      },
    },
  ]);
}

function renderSegments(segments: InlineSegment[], depth = 0): React.ReactNode {
  return segments.map((seg, i) => {
    if (seg.kind === 'math') {
      const formatted = latexToReadableUnicode(seg.content);
      return (
        <Text
          key={i}
          style={{
            fontFamily: MATH_SERIF_FONT,
            fontStyle: 'italic',
            color: AURA_COLORS.secondary,
            backgroundColor: 'rgba(111, 246, 255, 0.08)',
          }}>
          {` ${formatted} `}
        </Text>
      );
    }
    if (seg.kind === 'bold') {
      const nested = depth < 2 ? tokenizeInline(seg.content) : null;
      return (
        <Text key={i} style={{ fontFamily: AURA_FONTS.sansBold, color: AURA_COLORS.onSurface }}>
          {nested && nested.length > 1 ? renderSegments(nested, depth + 1) : seg.content}
        </Text>
      );
    }
    if (seg.kind === 'italic') {
      const nested = depth < 2 ? tokenizeInline(seg.content) : null;
      return (
        <Text key={i} style={{ fontStyle: 'italic', color: AURA_COLORS.onSurfaceVariant }}>
          {nested && nested.length > 1 ? renderSegments(nested, depth + 1) : seg.content}
        </Text>
      );
    }
    if (seg.kind === 'strike') {
      return (
        <Text
          key={i}
          style={{
            textDecorationLine: 'line-through',
            color: AURA_COLORS.outline,
          }}>
          {seg.content}
        </Text>
      );
    }
    if (seg.kind === 'code') {
      return (
        <Text
          key={i}
          style={{
            fontFamily: AURA_FONTS.monoMedium,
            fontSize: 12.5,
            color: AURA_COLORS.secondaryFixed,
            backgroundColor: AURA_COLORS.surfaceContainerHighest,
          }}>
          {` ${seg.content} `}
        </Text>
      );
    }
    if (seg.kind === 'link' && seg.href) {
      return (
        <Text
          key={i}
          onPress={() => confirmOpenLink(seg.href!)}
          style={{
            color: AURA_COLORS.secondaryContainer,
            textDecorationLine: 'underline',
          }}>
          {seg.content}
        </Text>
      );
    }
    return <React.Fragment key={i}>{seg.content}</React.Fragment>;
  });
}

export const InlineText = React.memo<InlineTextProps>(function InlineText({ text, baseStyle }) {
  const segments = tokenizeInline(text);
  return (
    <Text
      selectable
      style={[
        {
          fontFamily: AURA_FONTS.sansRegular,
          fontSize: 14,
          lineHeight: 22,
          color: AURA_COLORS.onSurface,
        },
        baseStyle,
      ]}>
      {renderSegments(segments)}
    </Text>
  );
});
