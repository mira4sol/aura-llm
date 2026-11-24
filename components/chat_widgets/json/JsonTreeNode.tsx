import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { AURA_COLORS, AURA_FONTS } from '@/components/theme';

interface JsonTreeNodeProps {
  label?: string;
  value: unknown;
  depth?: number;
}

export const JsonTreeNode = React.memo<JsonTreeNodeProps>(function JsonTreeNode({
  label,
  value,
  depth = 0,
}) {
  const [expanded, setExpanded] = useState(depth < 2);

  if (value === null || typeof value !== 'object') {
    const color =
      typeof value === 'string'
        ? '#7dd3fc'
        : typeof value === 'number'
          ? '#f472b6'
          : typeof value === 'boolean'
            ? '#6ff6ff'
            : AURA_COLORS.outline;

    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingLeft: depth * 12, paddingVertical: 1.5 }}>
        {label !== undefined && (
          <Text style={{ fontFamily: AURA_FONTS.monoMedium, fontSize: 11.5, color: AURA_COLORS.primary }}>
            &quot;{label}&quot;:{' '}
          </Text>
        )}
        <Text selectable style={{ fontFamily: AURA_FONTS.monoRegular, fontSize: 11.5, color }}>
          {typeof value === 'string' ? `"${value}"` : String(value)}
        </Text>
      </View>
    );
  }

  const isArray = Array.isArray(value);
  const entries = isArray
    ? value.map((v, i) => [String(i), v] as const)
    : Object.entries(value as Record<string, unknown>);
  const openChar = isArray ? '[' : '{';
  const closeChar = isArray ? ']' : '}';

  return (
    <View style={{ paddingLeft: depth * 12, paddingVertical: 1.5 }}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setExpanded((e) => !e)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={{ fontFamily: AURA_FONTS.monoMedium, fontSize: 11, color: AURA_COLORS.outline }}>
          {expanded ? '▾' : '▸'}
        </Text>
        {label !== undefined && (
          <Text style={{ fontFamily: AURA_FONTS.monoMedium, fontSize: 11.5, color: AURA_COLORS.primary }}>
            &quot;{label}&quot;:{' '}
          </Text>
        )}
        <Text style={{ fontFamily: AURA_FONTS.monoRegular, fontSize: 11.5, color: AURA_COLORS.onSurfaceVariant }}>
          {expanded ? openChar : `${openChar} ${entries.length} ${isArray ? 'items' : 'keys'} ${closeChar}`}
        </Text>
      </TouchableOpacity>

      {expanded && (
        <View>
          {entries.map(([k, v]) => (
            <JsonTreeNode
              key={k}
              label={isArray ? undefined : k}
              value={v}
              depth={depth + 1}
            />
          ))}
          <Text
            style={{
              fontFamily: AURA_FONTS.monoRegular,
              fontSize: 11.5,
              color: AURA_COLORS.onSurfaceVariant,
              paddingLeft: 12,
            }}>
            {closeChar}
          </Text>
        </View>
      )}
    </View>
  );
});
