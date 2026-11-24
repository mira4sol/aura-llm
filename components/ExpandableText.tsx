import React, { useCallback, useState } from 'react';
import {
  Text,
  TouchableOpacity,
  type NativeSyntheticEvent,
  type StyleProp,
  type TextLayoutEventData,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { AURA_COLORS, AURA_FONTS } from './theme';

interface ExpandableTextProps {
  text: string;
  maxLines?: number;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Renders text clamped to `maxLines` and only displays a "Read more / Show less" toggle
 * when the text actually overflows `maxLines` on the current device width.
 */
export const ExpandableText: React.FC<ExpandableTextProps> = ({
  text,
  maxLines = 3,
  style,
  containerStyle,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);

  const handleTextLayout = useCallback(
    (e: NativeSyntheticEvent<TextLayoutEventData>) => {
      if (expanded) return;
      const lines = e.nativeEvent.lines;
      if (lines.length > maxLines) {
        setIsTruncated(true);
      } else if (lines.length === maxLines) {
        // On iOS, when numberOfLines is set, lines.length is capped at maxLines;
        // detect truncation by checking if rendered characters are shorter than full text
        const renderedLen = lines.reduce((sum, l) => sum + l.text.length, 0);
        setIsTruncated(renderedLen < text.trim().length - 1);
      } else {
        setIsTruncated(false);
      }
    },
    [expanded, maxLines, text]
  );

  return (
    <TouchableOpacity
      activeOpacity={isTruncated || expanded ? 0.75 : 1}
      disabled={!isTruncated && !expanded}
      onPress={() => setExpanded((prev) => !prev)}
      style={containerStyle}>
      <Text
        numberOfLines={expanded ? undefined : maxLines}
        onTextLayout={handleTextLayout}
        style={style}>
        {text}
      </Text>
      {(isTruncated || expanded) && (
        <Text
          style={{
            fontFamily: AURA_FONTS.monoMedium,
            fontSize: 10.5,
            color: AURA_COLORS.primary,
            marginTop: 2,
          }}>
          {expanded ? 'Show less' : 'Read more'}
        </Text>
      )}
    </TouchableOpacity>
  );
};
