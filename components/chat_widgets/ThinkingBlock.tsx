import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { MaterialIcon } from '@/components/MaterialIcon';
import { PulsingDot } from '@/components/PulsingDot';
import { AURA_COLORS, AURA_FONTS } from '@/components/theme';

interface ThinkingBlockProps {
  text: string;
  startedAt: number;
  endedAt?: number;
  closed: boolean;
}

export const ThinkingBlock = React.memo<ThinkingBlockProps>(function ThinkingBlock({
  text,
  startedAt,
  endedAt,
  closed,
}) {
  const [expanded, setExpanded] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(() =>
    Math.max(0.1, ((endedAt ?? Date.now()) - startedAt) / 1000)
  );

  useEffect(() => {
    if (closed) {
      if (endedAt) setElapsedSec(Math.max(0.1, (endedAt - startedAt) / 1000));
      return;
    }
    const id = setInterval(() => {
      setElapsedSec(Math.max(0.1, (Date.now() - startedAt) / 1000));
    }, 200);
    return () => clearInterval(id);
  }, [closed, startedAt, endedAt]);

  return (
    <View
      style={{
        borderRadius: 14,
        backgroundColor: 'rgba(27, 27, 36, 0.85)',
        borderWidth: 1,
        borderColor: 'rgba(205, 189, 255, 0.16)',
        overflow: 'hidden',
      }}>
      <TouchableOpacity
        activeOpacity={0.78}
        onPress={() => setExpanded((e) => !e)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 12,
          paddingVertical: 9,
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {!closed ? (
            <PulsingDot size={7} color={AURA_COLORS.primary} />
          ) : (
            <MaterialIcon name="neurology" size={16} color={AURA_COLORS.primary} />
          )}
          <Text
            style={{
              fontFamily: AURA_FONTS.monoMedium,
              fontSize: 11.5,
              color: AURA_COLORS.primary,
            }}>
            {closed
              ? `Thought for ${elapsedSec.toFixed(1)}s`
              : `Thinking… ${elapsedSec.toFixed(1)}s`}
          </Text>
        </View>
        <MaterialIcon
          name={expanded ? 'unfold_less' : 'expand_more'}
          size={18}
          color={AURA_COLORS.onSurfaceVariant}
        />
      </TouchableOpacity>

      {expanded && text.length > 0 && (
        <View
          style={{
            paddingHorizontal: 12,
            paddingBottom: 10,
            borderTopWidth: 1,
            borderTopColor: 'rgba(255,255,255,0.05)',
            paddingTop: 8,
          }}>
          <Text
            selectable
            style={{
              fontFamily: AURA_FONTS.sansRegular,
              fontSize: 12.5,
              lineHeight: 19,
              color: AURA_COLORS.onSurfaceVariant,
            }}>
            {text}
          </Text>
        </View>
      )}
    </View>
  );
});
