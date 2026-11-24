import React from 'react';
import { Text, View } from 'react-native';

import { AURA_COLORS, AURA_FONTS } from '@/components/theme';
import type { AcceleratorBackend, GenerationTelemetry } from '@/lib/types';

interface TelemetryPillProps {
  telemetry?: GenerationTelemetry;
  liveTokensPerSec?: number;
  liveBackend?: AcceleratorBackend | null;
}

function backendLabel(backend: AcceleratorBackend | null | undefined): string {
  switch (backend) {
    case 'metal':
      return 'Metal';
    case 'opencl':
      return 'OpenCL';
    case 'hexagon':
      return 'Hexagon NPU';
    case 'cpu':
      return 'CPU NEON';
    default:
      return 'On-Device';
  }
}

export const TelemetryPill = React.memo<TelemetryPillProps>(function TelemetryPill({
  telemetry,
  liveTokensPerSec,
  liveBackend,
}) {
  const tps = telemetry ? telemetry.tokensPerSec : liveTokensPerSec;
  const backend = telemetry ? telemetry.backend : liveBackend;
  const ttft = telemetry?.ttftMs;

  if (!tps && !backend) return null;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 999,
        backgroundColor: 'rgba(41, 41, 51, 0.85)',
      }}>
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: AURA_COLORS.secondaryFixed,
        }}
      />
      <Text
        style={{
          fontFamily: AURA_FONTS.monoMedium,
          fontSize: 10.5,
          color: AURA_COLORS.secondaryFixed,
        }}>
        {tps ? `${tps.toFixed(1)} t/s` : 'Streaming'} · {backendLabel(backend)}
        {ttft ? ` · ${ttft}ms` : ''}
      </Text>
    </View>
  );
});
