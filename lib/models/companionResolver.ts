import type { RemoteFile } from '@/lib/types';
import { extractQuantFromFilename } from './quantization';

/**
 * Classifies a repository file into its artifact role (weights, mmproj, vocoder, etc.).
 */
export function classifyArtifactRole(path: string): RemoteFile['role'] | null {
  const lower = path.toLowerCase();
  const base = lower.split('/').pop() ?? lower;

  if (base.endsWith('.gguf')) {
    // Exclude non-standalone auxiliary GGUF sidecars (MTP draft heads, imatrix, LoRA/adapters, vocab)
    if (
      lower.includes('/mtp/') ||
      base.startsWith('mtp-') ||
      base.startsWith('mtp_') ||
      base.includes('imatrix') ||
      base.includes('lora') ||
      base.includes('adapter') ||
      base.includes('control-vector') ||
      base.includes('control_vector') ||
      base.startsWith('vocab-') ||
      base.startsWith('draft-')
    ) {
      return null;
    }
    if (base.includes('mmproj') || base.includes('projector')) return 'mmproj';
    if (base.includes('wavtokenizer') || base.includes('codec') || base.includes('vocoder')) {
      return 'vocoder';
    }
    return 'weights';
  }

  if (base.endsWith('.bin')) {
    if (base.includes('silero') && base.includes('vad')) return 'vad';
    if (base.startsWith('ggml-') || base.includes('whisper')) return 'weights';
    if (base === 'voices.bin' || base.includes('voices')) return 'voices';
  }

  if (base.endsWith('.onnx')) {
    return 'weights';
  }

  if (base.includes('mlmodelc') && (base.endsWith('.zip') || base.endsWith('.tar.gz'))) {
    return 'coreml_encoder';
  }

  if (base === 'tokens.txt' || base.endsWith('-tokens.txt')) {
    return 'tokens';
  }

  if (base.endsWith('.tar.bz2') && (base.includes('kokoro') || base.includes('sherpa') || base.includes('parakeet') || base.includes('espeak'))) {
    return 'aux';
  }

  return null;
}

/**
 * Picks the best matching mmproj file for a VLM weights quantization.
 * Prefers F16/BF16, then Q8_0, then closest precision.
 */
export function selectBestMmproj(mmprojFiles: RemoteFile[], targetQuant?: string): RemoteFile | null {
  if (mmprojFiles.length === 0) return null;
  if (mmprojFiles.length === 1) return mmprojFiles[0];

  const scored = mmprojFiles.map((f) => {
    const q = (f.quant ?? extractQuantFromFilename(f.path)).toUpperCase();
    let score = 10;
    if (q === 'F16' || q === 'FP16') score = 100;
    else if (q === 'BF16') score = 95;
    else if (q === 'Q8_0') score = 90;
    else if (targetQuant && q === targetQuant.toUpperCase()) score = 85;
    else if (q === 'F32') score = 70;
    return { file: f, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].file;
}

/**
 * Picks the matching Core ML encoder archive for a given whisper ggml-*.bin file (iOS ANE).
 */
export function selectMatchingCoreMlEncoder(
  weightFile: RemoteFile,
  coreMlFiles: RemoteFile[]
): RemoteFile | null {
  if (coreMlFiles.length === 0) return null;
  const stem = (weightFile.path.split('/').pop() ?? '')
    .replace(/^ggml-/i, '')
    .replace(/\.bin$/i, '')
    .replace(/-q\d_[a-z0-9]+$/i, '')
    .toLowerCase();

  const exact = coreMlFiles.find((f) => f.path.toLowerCase().includes(stem));
  return exact ?? null;
}
