import type {
  AccelerationPlan,
  DeviceHardwareProfile,
  DiscoveredModel,
  FitClass,
  GgufHeaderMeta,
  QuantVariant,
} from '@/lib/types';
import { getQuantInfo } from './quantization';

const MB = 1024 * 1024;
const DEFAULT_EVAL_CTX = 4096;

function kvBytesPerElement(kvType: AccelerationPlan['kvCacheType']): number {
  switch (kvType) {
    case 'f16':
      return 2;
    case 'q8_0':
      return 1.06;
    case 'q4_0':
      return 0.56;
  }
}

/**
 * Estimates KV cache memory in bytes from GGUF header geometry or parameter-count heuristic.
 */
export function estimateKvCacheBytes(
  header: GgufHeaderMeta | undefined,
  parameterCount: number | undefined,
  nCtx: number,
  kvCacheType: AccelerationPlan['kvCacheType'] = 'q8_0'
): number {
  const bpe = kvBytesPerElement(kvCacheType);
  if (
    header?.blockCount &&
    header?.headCountKv &&
    header?.embeddingLength &&
    header?.headCount
  ) {
    const headDim = header.embeddingLength / header.headCount;
    return Math.round(2 * header.blockCount * nCtx * header.headCountKv * headDim * bpe);
  }

  const paramsB = (parameterCount ?? 3e9) / 1e9;
  const approxLayers = Math.max(16, Math.min(80, Math.round(12 + paramsB * 4)));
  const approxKvDim = paramsB <= 2 ? 512 : paramsB <= 8 ? 1024 : 2048;
  return Math.round(2 * approxLayers * nCtx * approxKvDim * bpe);
}

/**
 * Returns exact byte size if HF tree metadata was resolved, or a physics-based estimate
 * from parameter count and bits-per-weight when only sibling filenames are known.
 */
export function resolveVariantDownloadBytes(
  variant: QuantVariant,
  model: Pick<DiscoveredModel, 'parameterCount' | 'runtime'>
): { bytes: number; isEstimated: boolean } {
  if (variant.totalBytes > 0) {
    return { bytes: variant.totalBytes, isEstimated: false };
  }
  if (model.parameterCount && model.parameterCount > 0) {
    const hasProjector = variant.files.some((f) => f.role === 'mmproj' || f.role === 'vocoder');
    const weightsEst = Math.round((model.parameterCount * variant.bitsPerWeight) / 8);
    const projectorEst = hasProjector ? 450 * MB : 0;
    return { bytes: weightsEst + projectorEst, isEstimated: true };
  }
  return { bytes: 0, isEstimated: true };
}

/**
 * Estimates total runtime RAM required for a variant:
 * modelWeights * 1.25 + KV cache overhead + projector * 1.1 + compute buffers.
 */
export function estimateVariantRuntimeBytes(
  variant: QuantVariant,
  model: Pick<DiscoveredModel, 'ggufHeader' | 'parameterCount' | 'contextLength' | 'runtime'>,
  kvCacheType: AccelerationPlan['kvCacheType'] = 'q8_0'
): number {
  const { bytes: effectiveTotal } = resolveVariantDownloadBytes(variant, model);

  if (model.runtime !== 'llama.rn') {
    return Math.round(effectiveTotal * 1.35 + 64 * MB);
  }

  let weightsBytes = variant.files
    .filter((f) => f.role === 'weights')
    .reduce((s, f) => s + f.sizeBytes, 0);
  let projectorBytes = variant.files
    .filter((f) => f.role === 'mmproj' || f.role === 'vocoder')
    .reduce((s, f) => s + f.sizeBytes, 0);

  if (weightsBytes === 0 && effectiveTotal > 0) {
    const hasProjector = variant.files.some((f) => f.role === 'mmproj' || f.role === 'vocoder');
    projectorBytes = hasProjector ? Math.min(450 * MB, Math.round(effectiveTotal * 0.2)) : 0;
    weightsBytes = Math.max(0, effectiveTotal - projectorBytes);
  }

  const otherBytes = Math.max(0, effectiveTotal - weightsBytes - projectorBytes);
  const evalCtx = Math.min(model.contextLength ?? DEFAULT_EVAL_CTX, DEFAULT_EVAL_CTX);
  const kvBytes = estimateKvCacheBytes(model.ggufHeader, model.parameterCount, evalCtx, kvCacheType);
  return Math.round(weightsBytes * 1.25 + projectorBytes * 1.1 + otherBytes + kvBytes + 64 * MB);
}

export function classifyFitRatio(ratio: number): FitClass {
  if (ratio <= 0.6) return 'optimal';
  if (ratio <= 0.8) return 'compatible';
  if (ratio <= 1.0) return 'tight';
  return 'not_recommended';
}

/**
 * Scores all variants of a DiscoveredModel against real device hardware & storage,
 * and marks the single best recommended quantization for the device's RAM & disk tier.
 */
export function scoreModelForDevice(
  model: DiscoveredModel,
  profile: DeviceHardwareProfile,
  plan?: AccelerationPlan | null
): DiscoveredModel {
  const safeRam = Math.max(512 * MB, profile.memory.safeBudgetBytes);
  const freeDisk = profile.storage.freeBytes;
  const kvType = plan?.kvCacheType ?? 'q8_0';
  const preferQ4_0 = plan?.primary === 'opencl';

  const scoredVariants: QuantVariant[] = model.variants.map((v) => {
    const { bytes: dlBytes } = resolveVariantDownloadBytes(v, model);
    const runtimeBytes = estimateVariantRuntimeBytes(v, model, kvType);
    const ratio = runtimeBytes / safeRam;
    let fit = classifyFitRatio(ratio);
    let fitReason: string | undefined;

    const diskNeeded = Math.round(dlBytes * 1.05 + (dlBytes > 256 * MB ? 256 * MB : 0));
    if (freeDisk > 0 && dlBytes > 0 && diskNeeded > freeDisk) {
      fit = 'not_recommended';
      fitReason = 'Exceeds available device storage';
    } else if (fit === 'optimal') {
      fitReason = `Uses ~${Math.round(ratio * 100)}% of safe AI RAM`;
    } else if (fit === 'compatible') {
      fitReason = `Uses ~${Math.round(ratio * 100)}% of safe AI RAM`;
    } else if (fit === 'tight') {
      fitReason = 'Near memory ceiling — close background apps';
    } else {
      fitReason = 'Exceeds safe device memory ceiling';
    }

    return {
      ...v,
      totalBytes: v.totalBytes > 0 ? v.totalBytes : dlBytes,
      estimatedRuntimeBytes: runtimeBytes,
      fit,
      fitReason,
      recommended: false,
    };
  });

  const eligible = scoredVariants.filter((v) => v.fit === 'optimal' || v.fit === 'compatible');
  const pool =
    eligible.length > 0 ? eligible : scoredVariants.filter((v) => v.fit === 'tight');

  if (pool.length > 0) {
    const best = [...pool].sort((a, b) => {
      const aInfo = getQuantInfo(a.quant);
      const bInfo = getQuantInfo(b.quant);
      const aBoost = preferQ4_0 && a.quant === 'Q4_0' ? 8 : 0;
      const bBoost = preferQ4_0 && b.quant === 'Q4_0' ? 8 : 0;
      const aMobilePenalty = aInfo.bitsPerWeight > 8.5 ? -30 : 0;
      const bMobilePenalty = bInfo.bitsPerWeight > 8.5 ? -30 : 0;
      return bInfo.qualityRank + bBoost + bMobilePenalty - (aInfo.qualityRank + aBoost + aMobilePenalty);
    })[0];

    for (const v of scoredVariants) {
      v.recommended = v.quant === best.quant;
    }
  }

  return {
    ...model,
    variants: scoredVariants,
  };
}

export function getBestVariant(model: DiscoveredModel): QuantVariant | null {
  return model.variants.find((v) => v.recommended) ?? model.variants[0] ?? null;
}

export function fitClassRank(fit: FitClass): number {
  switch (fit) {
    case 'optimal':
      return 3;
    case 'compatible':
      return 2;
    case 'tight':
      return 1;
    case 'not_recommended':
      return 0;
  }
}

const GB = 1024 * 1024 * 1024;

/**
 * Filters out desktop/server-sized models and unquantized BF16/F32 variants so mobile
 * users only see phone-friendly models tailored to mobile RAM tiers (~4-12 GB).
 */
export function filterModelForMobile(
  model: DiscoveredModel,
  profile?: DeviceHardwareProfile | null
): DiscoveredModel | null {
  const isVoiceOnly =
    (model.capabilities.includes('audio_stt') || model.capabilities.includes('voice_tts')) &&
    !model.capabilities.includes('text');

  const totalRamGb = profile ? profile.memory.totalBytes / GB : 8;
  const maxVoiceBytes = 1.6 * GB;
  const maxLlmBytes = totalRamGb >= 12 ? 7.5 * GB : totalRamGb >= 8 ? 5.2 * GB : 3.2 * GB;
  const maxParams = totalRamGb >= 12 ? 14.5e9 : totalRamGb >= 8 ? 9.5e9 : 4.5e9;

  // Reject giant desktop parameter models (e.g. 27B, 35B, 70B, 176B)
  if (!isVoiceOnly && model.parameterCount && model.parameterCount > maxParams) {
    return null;
  }

  const maxAllowedBytes = isVoiceOnly ? maxVoiceBytes : maxLlmBytes;

  const mobileVariants = model.variants.filter((v) => {
    const { bytes } = resolveVariantDownloadBytes(v, model);
    if (bytes > maxAllowedBytes) return false;
    // Drop unquantized desktop weights (F32/BF16/F16) on LLMs unless tiny (< 1.5 GB)
    const q = v.quant.toUpperCase();
    if (!isVoiceOnly && (q === 'F32' || q === 'BF16' || q === 'F16') && bytes > 1.5 * GB) {
      return false;
    }
    return true;
  });

  if (mobileVariants.length === 0) return null;

  return {
    ...model,
    variants: mobileVariants,
  };
}
