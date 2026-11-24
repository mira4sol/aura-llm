import React from 'react';
import { ScrollView, View } from 'react-native';

import { AURA_COLORS, AURA_FONTS } from '@/components/theme';
import { InlineText } from './InlineText';

interface MarkdownTableProps {
  headers: string[];
  rows: string[][];
}

export const MarkdownTable = React.memo<MarkdownTableProps>(function MarkdownTable({
  headers,
  rows,
}) {
  const colWidth = headers.length <= 2 ? 150 : 128;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        backgroundColor: 'rgba(13, 13, 22, 0.72)',
      }}>
      <View>
        {/* Header Row */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: 'rgba(41, 41, 51, 0.7)',
            borderBottomWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)',
          }}>
          {headers.map((h, i) => (
            <View
              key={i}
              style={{
                width: colWidth,
                paddingHorizontal: 10,
                paddingVertical: 8,
                borderRightWidth: i < headers.length - 1 ? 1 : 0,
                borderColor: 'rgba(255,255,255,0.05)',
              }}>
              <InlineText
                text={h}
                baseStyle={{
                  fontFamily: AURA_FONTS.sansSemiBold,
                  fontSize: 12,
                  lineHeight: 17,
                  color: AURA_COLORS.secondaryFixed,
                }}
              />
            </View>
          ))}
        </View>

        {/* Body Rows */}
        {rows.map((row, rIdx) => (
          <View
            key={rIdx}
            style={{
              flexDirection: 'row',
              borderBottomWidth: rIdx < rows.length - 1 ? 1 : 0,
              borderColor: 'rgba(255,255,255,0.05)',
              backgroundColor: rIdx % 2 === 1 ? 'rgba(31, 31, 40, 0.45)' : 'transparent',
            }}>
            {headers.map((_, cIdx) => (
              <View
                key={cIdx}
                style={{
                  width: colWidth,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  borderRightWidth: cIdx < headers.length - 1 ? 1 : 0,
                  borderColor: 'rgba(255,255,255,0.04)',
                }}>
                <InlineText
                  text={row[cIdx] ?? ''}
                  baseStyle={{
                    fontFamily: AURA_FONTS.sansRegular,
                    fontSize: 12.5,
                    lineHeight: 18,
                    color: AURA_COLORS.onSurface,
                  }}
                />
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
});
