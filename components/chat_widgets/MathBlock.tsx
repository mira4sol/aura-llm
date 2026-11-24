import React, { useMemo, useState } from 'react';
import { Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import { MaterialIcon } from '@/components/MaterialIcon';
import { AURA_COLORS, AURA_FONTS } from '@/components/theme';
import { parseLatexToAst, type MathNode } from '@/lib/chat/latexMath';

interface MathBlockProps {
  latex: string;
  closed: boolean;
}

const MATH_SERIF_FONT = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: AURA_FONTS.sansRegular,
});

const COMBINING_ACCENTS: Record<string, string> = {
  hat: '\u0302',
  widehat: '\u0302',
  bar: '\u0304',
  vec: '\u20D7',
  tilde: '\u0303',
  widetilde: '\u0303',
  dot: '\u0307',
  ddot: '\u0308',
};

function renderNodes(nodes: MathNode[], fontSize: number, keyPrefix: string): React.ReactNode {
  return nodes.map((node, idx) => {
    const key = `${keyPrefix}-${idx}`;
    const prev = idx > 0 ? nodes[idx - 1] : null;

    switch (node.type) {
      case 'space':
        return <View key={key} style={{ width: node.size }} />;

      case 'text':
        return (
          <Text
            key={key}
            style={{
              fontFamily: MATH_SERIF_FONT,
              fontSize,
              lineHeight: fontSize * 1.35,
              color: AURA_COLORS.onSurface,
            }}>
            {node.value}
          </Text>
        );

      case 'var':
        return (
          <Text
            key={key}
            style={{
              fontFamily: MATH_SERIF_FONT,
              fontStyle: 'italic',
              fontSize,
              lineHeight: fontSize * 1.35,
              color: '#f3f0ff',
            }}>
            {node.value}
          </Text>
        );

      case 'func':
        return (
          <Text
            key={key}
            style={{
              fontFamily: MATH_SERIF_FONT,
              fontSize,
              lineHeight: fontSize * 1.35,
              color: AURA_COLORS.secondaryFixed,
              marginHorizontal: 2,
            }}>
            {node.value}
          </Text>
        );

      case 'op': {
        const isBig = ['∑', '∏', '∐', '∫', '∬', '∭', '∮'].includes(node.value);
        const isUnaryMinus =
          node.value === '−' &&
          (!prev ||
            prev.type === 'op' ||
            (prev.type === 'text' && ['(', '[', '{', ','].includes(prev.value)));
        return (
          <Text
            key={key}
            style={{
              fontFamily: MATH_SERIF_FONT,
              fontSize: isBig ? fontSize * 1.45 : fontSize,
              lineHeight: (isBig ? fontSize * 1.45 : fontSize) * 1.2,
              color: isBig ? AURA_COLORS.secondaryFixed : AURA_COLORS.primary,
              marginHorizontal: isUnaryMinus ? 1 : isBig ? 3 : 4,
            }}>
            {node.value}
          </Text>
        );
      }

      case 'style': {
        const isBold = node.variant === 'bold';
        return (
          <View key={key} style={{ flexDirection: 'row', alignItems: 'center' }}>
            {node.body.map((child, cIdx) => {
              if (child.type === 'text' || child.type === 'var') {
                return (
                  <Text
                    key={`${key}-s-${cIdx}`}
                    style={{
                      fontFamily:
                        node.variant === 'normal'
                          ? AURA_FONTS.sansRegular
                          : isBold
                            ? AURA_FONTS.sansBold
                            : MATH_SERIF_FONT,
                      fontSize: node.variant === 'normal' ? fontSize * 0.88 : fontSize,
                      lineHeight: fontSize * 1.35,
                      color: node.variant === 'bb' ? AURA_COLORS.secondaryFixed : AURA_COLORS.onSurface,
                    }}>
                    {child.value}
                  </Text>
                );
              }
              return renderNodes([child], fontSize, `${key}-s-${cIdx}`);
            })}
          </View>
        );
      }

      case 'accent': {
        if (node.accent === 'overline' || node.accent === 'underline') {
          const isOver = node.accent === 'overline';
          return (
            <View
              key={key}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderTopWidth: isOver ? 1.2 : 0,
                borderBottomWidth: isOver ? 0 : 1.2,
                borderColor: AURA_COLORS.onSurface,
                paddingTop: isOver ? 1 : 0,
                paddingBottom: isOver ? 0 : 1,
                marginHorizontal: 1,
              }}>
              {renderNodes(node.body, fontSize, `${key}-acc`)}
            </View>
          );
        }
        const comb = COMBINING_ACCENTS[node.accent] ?? '';
        if (node.body.length === 1 && (node.body[0].type === 'var' || node.body[0].type === 'text')) {
          return (
            <Text
              key={key}
              style={{
                fontFamily: MATH_SERIF_FONT,
                fontStyle: node.body[0].type === 'var' ? 'italic' : 'normal',
                fontSize,
                lineHeight: fontSize * 1.35,
                color: '#f3f0ff',
              }}>
              {`${node.body[0].value}${comb}`}
            </Text>
          );
        }
        return (
          <View key={key} style={{ flexDirection: 'row', alignItems: 'center' }}>
            {renderNodes(node.body, fontSize, `${key}-acc`)}
          </View>
        );
      }

      case 'frac': {
        const innerSize = Math.max(11, fontSize * 0.84);
        return (
          <View
            key={key}
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              marginHorizontal: 4,
              paddingHorizontal: 2,
            }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 4,
                paddingBottom: 2,
              }}>
              {renderNodes(node.num, innerSize, `${key}-num`)}
            </View>
            <View
              style={{
                alignSelf: 'stretch',
                height: 1.25,
                backgroundColor: 'rgba(228, 225, 238, 0.78)',
                borderRadius: 1,
              }}
            />
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 4,
                paddingTop: 2,
              }}>
              {renderNodes(node.den, innerSize, `${key}-den`)}
            </View>
          </View>
        );
      }

      case 'sqrt': {
        const innerSize = Math.max(11.5, fontSize * 0.92);
        return (
          <View key={key} style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 2 }}>
            {node.index && node.index.length > 0 && (
              <View style={{ alignSelf: 'flex-start', marginRight: -3, marginTop: -2 }}>
                {renderNodes(node.index, Math.max(9.5, fontSize * 0.58), `${key}-idx`)}
              </View>
            )}
            <Text
              style={{
                fontFamily: MATH_SERIF_FONT,
                fontSize: fontSize * 1.25,
                lineHeight: fontSize * 1.32,
                color: AURA_COLORS.secondaryFixed,
                marginRight: -1,
              }}>
              √
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderTopWidth: 1.25,
                borderTopColor: AURA_COLORS.secondaryFixed,
                paddingTop: 1,
                paddingHorizontal: 4,
                marginTop: 2,
              }}>
              {renderNodes(node.radicand, innerSize, `${key}-rad`)}
            </View>
          </View>
        );
      }

      case 'script': {
        const scriptSize = Math.max(10, fontSize * 0.68);
        if (node.limits) {
          return (
            <View key={key} style={{ alignItems: 'center', marginHorizontal: 4 }}>
              {node.sup && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: -3 }}>
                  {renderNodes(node.sup, scriptSize, `${key}-lsup`)}
                </View>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {renderNodes(node.base, fontSize, `${key}-lbase`)}
              </View>
              {node.sub && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: -3 }}>
                  {renderNodes(node.sub, scriptSize, `${key}-lsub`)}
                </View>
              )}
            </View>
          );
        }

        return (
          <View key={key} style={{ flexDirection: 'row', alignItems: 'center' }}>
            {renderNodes(node.base, fontSize, `${key}-base`)}
            <View style={{ justifyContent: 'space-between', marginLeft: 0.5 }}>
              {node.sup && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: node.sub ? 0 : fontSize * 0.45,
                  }}>
                  {renderNodes(node.sup, scriptSize, `${key}-sup`)}
                </View>
              )}
              {node.sub && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: node.sup ? 0 : fontSize * 0.35,
                  }}>
                  {renderNodes(node.sub, scriptSize, `${key}-sub`)}
                </View>
              )}
            </View>
          </View>
        );
      }

      case 'delim':
        return (
          <View key={key} style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 1 }}>
            {!!node.left && (
              <Text
                style={{
                  fontFamily: MATH_SERIF_FONT,
                  fontSize: fontSize * 1.15,
                  color: AURA_COLORS.onSurfaceVariant,
                  marginRight: 1,
                }}>
                {node.left}
              </Text>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {renderNodes(node.body, fontSize, `${key}-delim`)}
            </View>
            {!!node.right && (
              <Text
                style={{
                  fontFamily: MATH_SERIF_FONT,
                  fontSize: fontSize * 1.15,
                  color: AURA_COLORS.onSurfaceVariant,
                  marginLeft: 1,
                }}>
                {node.right}
              </Text>
            )}
          </View>
        );

      case 'matrix': {
        const isBracket = node.env === 'bmatrix';
        const isParen = node.env === 'pmatrix';
        const isPipe = node.env === 'vmatrix' || node.env === 'Vmatrix';
        const isCases = node.env === 'cases';
        const isBrace = node.env === 'Bmatrix';
        const isAligned = node.env === 'aligned' || node.env === 'align' || node.env === 'align*' || node.env === 'gather';

        const cellSize = Math.max(12, fontSize * 0.88);
        return (
          <View
            key={key}
            style={{
              flexDirection: 'row',
              alignItems: 'stretch',
              marginHorizontal: 4,
              paddingVertical: 2,
            }}>
            {!isAligned && (
              <View
                style={{
                  width: isCases || isBrace ? 8 : 6,
                  borderLeftWidth: isBracket || isParen || isPipe || isCases || isBrace ? 1.5 : 0,
                  borderTopWidth: isBracket ? 1.5 : 0,
                  borderBottomWidth: isBracket ? 1.5 : 0,
                  borderTopLeftRadius: isParen || isCases || isBrace ? 8 : 0,
                  borderBottomLeftRadius: isParen || isCases || isBrace ? 8 : 0,
                  borderColor: AURA_COLORS.secondaryFixed,
                  marginRight: 6,
                }}
              />
            )}

            <View style={{ gap: 6, justifyContent: 'center' }}>
              {node.rows.map((row, rIdx) => (
                <View
                  key={`${key}-r-${rIdx}`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: isAligned ? 6 : 14,
                  }}>
                  {row.map((cell, cIdx) => (
                    <View
                      key={`${key}-r-${rIdx}-c-${cIdx}`}
                      style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {renderNodes(cell, cellSize, `${key}-r${rIdx}-c${cIdx}`)}
                    </View>
                  ))}
                </View>
              ))}
            </View>

            {!isAligned && !isCases && (
              <View
                style={{
                  width: isBrace ? 8 : 6,
                  borderRightWidth: isBracket || isParen || isPipe || isBrace ? 1.5 : 0,
                  borderTopWidth: isBracket ? 1.5 : 0,
                  borderBottomWidth: isBracket ? 1.5 : 0,
                  borderTopRightRadius: isParen || isBrace ? 8 : 0,
                  borderBottomRightRadius: isParen || isBrace ? 8 : 0,
                  borderColor: AURA_COLORS.secondaryFixed,
                  marginLeft: 6,
                }}
              />
            )}
          </View>
        );
      }
    }
  });
}

export const MathBlock = React.memo<MathBlockProps>(
  function MathBlock({ latex }) {
    const [copied, setCopied] = useState(false);

    const ast = useMemo(() => parseLatexToAst(latex), [latex]);

    const handleCopy = async () => {
      await Clipboard.setStringAsync(latex);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    };

    return (
      <View
        style={{
          borderRadius: 16,
          backgroundColor: 'rgba(13, 13, 22, 0.92)',
          borderWidth: 1,
          borderColor: 'rgba(111, 246, 255, 0.16)',
          overflow: 'hidden',
        }}>
        {/* Compact header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 12,
            paddingVertical: 6,
            backgroundColor: 'rgba(41, 41, 51, 0.42)',
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255, 255, 255, 0.05)',
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MaterialIcon name="calculate" size={14} color={AURA_COLORS.secondaryFixed} />
            <Text
              style={{
                fontFamily: AURA_FONTS.monoMedium,
                fontSize: 10.5,
                color: AURA_COLORS.onSurfaceVariant,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}>
              Equation
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
                : 'rgba(52, 52, 62, 0.72)',
            }}>
            <MaterialIcon
              name={copied ? 'check' : 'content_copy'}
              size={12.5}
              color={copied ? AURA_COLORS.secondaryFixed : AURA_COLORS.onSurfaceVariant}
            />
            <Text
              style={{
                fontFamily: AURA_FONTS.monoMedium,
                fontSize: 10.5,
                color: copied ? AURA_COLORS.secondaryFixed : AURA_COLORS.onSurfaceVariant,
              }}>
              {copied ? 'Copied' : 'LaTeX'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Horizontally scrollable 2D math expression */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingVertical: 14,
            minWidth: '100%',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap' }}>
            {renderNodes(ast, 16, 'math')}
          </View>
        </ScrollView>
      </View>
    );
  },
  (prev, next) => prev.latex === next.latex && prev.closed === next.closed
);
