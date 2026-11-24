import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { marked, type Token, type Tokens } from 'marked';

import { AURA_COLORS, AURA_FONTS } from '@/components/theme';
import { protectInlineMathForMarkdown, restoreProtectedMath } from '@/lib/chat/latexMath';
import { InlineText } from './InlineText';
import { MarkdownTable } from './MarkdownTable';

interface MarkdownBlockProps {
  text: string;
  closed: boolean;
}

function renderToken(
  token: Token,
  key: string,
  placeholders: Map<string, string>
): React.ReactNode {
  const restore = (s: string) => restoreProtectedMath(s, placeholders);

  switch (token.type) {
    case 'space':
      return null;

    case 'heading': {
      const h = token as Tokens.Heading;
      const fontSize = h.depth === 1 ? 19 : h.depth === 2 ? 17 : 15;
      return (
        <InlineText
          key={key}
          text={restore(h.text)}
          baseStyle={{
            fontFamily: AURA_FONTS.sansBold,
            fontSize,
            lineHeight: fontSize + 7,
            color: AURA_COLORS.onSurface,
            marginTop: 4,
          }}
        />
      );
    }

    case 'paragraph': {
      const p = token as Tokens.Paragraph;
      return <InlineText key={key} text={restore(p.text)} />;
    }

    case 'blockquote': {
      const bq = token as Tokens.Blockquote;
      return (
        <View
          key={key}
          style={{
            borderLeftWidth: 3,
            borderLeftColor: AURA_COLORS.primary,
            paddingLeft: 12,
            paddingVertical: 4,
            backgroundColor: 'rgba(108, 60, 233, 0.08)',
            borderRadius: 6,
          }}>
          <InlineText
            text={restore(bq.text)}
            baseStyle={{ color: AURA_COLORS.onSurfaceVariant, fontStyle: 'italic' }}
          />
        </View>
      );
    }

    case 'hr':
      return (
        <View
          key={key}
          style={{
            height: 1,
            backgroundColor: 'rgba(255,255,255,0.1)',
            marginVertical: 6,
          }}
        />
      );

    case 'list': {
      const list = token as Tokens.List;
      return (
        <View key={key} style={{ gap: 5, paddingLeft: 4 }}>
          {list.items.map((item, idx) => {
            const nestedLists = item.tokens?.filter((t) => t.type === 'list') ?? [];
            const itemLeadText =
              nestedLists.length > 0
                ? (item.tokens ?? [])
                    .filter((t) => t.type !== 'list')
                    .map((t) => ('text' in t && typeof t.text === 'string' ? t.text : t.raw))
                    .join(' ')
                    .trim()
                : item.text;

            const bulletLabel = item.task
              ? item.checked
                ? '☑'
                : '☐'
              : list.ordered
                ? `${(Number(list.start) || 1) + idx}.`
                : '•';

            return (
              <View key={idx} style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <Text
                    style={{
                      fontFamily: AURA_FONTS.monoMedium,
                      fontSize: 13,
                      lineHeight: 22,
                      color: AURA_COLORS.secondaryFixed,
                      minWidth: 16,
                    }}>
                    {bulletLabel}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <InlineText text={restore(itemLeadText)} />
                  </View>
                </View>
                {nestedLists.length > 0 && (
                  <View style={{ paddingLeft: 16, gap: 4 }}>
                    {nestedLists.map((sub, sIdx) =>
                      renderToken(sub, `${key}-sub-${idx}-${sIdx}`, placeholders)
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      );
    }

    case 'table': {
      const tbl = token as Tokens.Table;
      const headers = tbl.header.map((c) => restore(c.text));
      const rows = tbl.rows.map((r) => r.map((c) => restore(c.text)));
      return <MarkdownTable key={key} headers={headers} rows={rows} />;
    }

    default: {
      const raw = 'text' in token && typeof token.text === 'string' ? token.text : token.raw;
      if (!raw?.trim()) return null;
      return <InlineText key={key} text={restore(raw.trim())} />;
    }
  }
}

export const MarkdownBlock = React.memo<MarkdownBlockProps>(
  function MarkdownBlock({ text }) {
    const parsed = useMemo(() => {
      const { text: safeText, placeholders } = protectInlineMathForMarkdown(text);
      try {
        const tokens = marked.lexer(safeText, { gfm: true, breaks: true });
        return { tokens, placeholders };
      } catch {
        return { tokens: null, placeholders };
      }
    }, [text]);

    if (!parsed.tokens) {
      return <InlineText text={text} />;
    }

    return (
      <View style={{ gap: 8 }}>
        {parsed.tokens.map((tok, i) => renderToken(tok, `tok-${i}`, parsed.placeholders))}
      </View>
    );
  },
  (prev, next) => prev.text === next.text && prev.closed === next.closed
);
