import type { HfModelRaw } from '@/lib/http_requests/hfModelSearch';
import type { HfTreeEntry } from '@/lib/http_requests/hfRepoTree';
import type {
  DiscoveredModel,
  GgufHeaderMeta,
  ModelCapability,
  ModelRuntime,
  QuantVariant,
  RemoteFile,
} from '@/lib/types';
import {
  classifyArtifactRole,
  selectBestMmproj,
  selectMatchingCoreMlEncoder,
} from './companionResolver';
import { extractQuantFromFilename, getQuantInfo, getSplitGroupKey } from './quantization';

const VISION_TAGS = new Set([
  'vision',
  'multimodal',
  'image-text-to-text',
  'visual-question-answering',
  'vlm',
  'llava',
  'qwen2-vl',
  'qwen2_vl',
  'qwen2.5-vl',
  'internvl',
  'minicpm-v',
  'gemma3',
  'smolvlm',
  'pixtral',
]);

const AUDIO_MULTIMODAL_TAGS = new Set([
  'audio-text-to-text',
  'any-to-any',
  'ultravox',
  'qwen2-audio',
  'qwen2.5-omni',
]);

function parseParameterCount(raw: HfModelRaw): number | undefined {
  if (raw.gguf?.total && raw.gguf.total > 0) return raw.gguf.total;
  const match = raw.id.match(/(\d+(?:\.\d+)?)\s*([BM])\b/i);
  if (!match) return undefined;
  const n = Number.parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  if (!Number.isFinite(n)) return undefined;
  return unit === 'B' ? Math.round(n * 1e9) : Math.round(n * 1e6);
}

function buildRemoteFiles(raw: HfModelRaw, tree?: HfTreeEntry[]): RemoteFile[] {
  const files: RemoteFile[] = [];

  if (tree && tree.length > 0) {
    for (const entry of tree) {
      const role = classifyArtifactRole(entry.path);
      if (!role) continue;
      files.push({
        path: entry.path,
        sizeBytes: entry.lfs?.size ?? entry.size ?? 0,
        sha256: entry.lfs?.oid ?? null,
        role,
        quant:
          role === 'weights' || role === 'mmproj' || role === 'vocoder'
            ? extractQuantFromFilename(entry.path)
            : undefined,
        isArchive: /\.(zip|tar\.gz|tar\.bz2)$/i.test(entry.path),
      });
    }
    return files;
  }

  for (const sib of raw.siblings ?? []) {
    const role = classifyArtifactRole(sib.rfilename);
    if (!role) continue;
    files.push({
      path: sib.rfilename,
      sizeBytes: sib.lfs?.size ?? sib.size ?? 0,
      sha256: sib.lfs?.sha256 ?? sib.lfs?.oid ?? null,
      role,
      quant:
        role === 'weights' || role === 'mmproj' || role === 'vocoder'
          ? extractQuantFromFilename(sib.rfilename)
          : undefined,
      isArchive: /\.(zip|tar\.gz|tar\.bz2)$/i.test(sib.rfilename),
    });
  }
  return files;
}

function formatDisplayName(repoId: string): string {
  const name = repoId.split('/').pop() ?? repoId;
  return name.replace(/-GGUF$/i, '').replace(/[_-]+/g, ' ').trim();
}

/**
 * Generates a concise, user-facing description dynamically from Hugging Face metadata
 * (capabilities, tags, architecture, parameter scale, and context window).
 */
export function buildModelSummary(input: {
  id: string;
  capabilities: ModelCapability[];
  tags: string[];
  architecture?: string;
  parameterCount?: number;
  contextLength?: number;
  runtime: ModelRuntime;
}): string {
  const { id, capabilities, tags, parameterCount, contextLength, runtime } = input;
  const lowerId = id.toLowerCase();
  const hasTag = (t: string) => tags.some((x) => x.includes(t));

  if (capabilities.includes('audio_stt')) {
    return runtime === 'whisper.rn'
      ? 'Offline speech-to-text engine for real-time voice dictation and audio transcription with zero cloud calls.'
      : 'Fast streaming ONNX speech-to-text model for accurate offline voice transcription.';
  }

  if (capabilities.includes('voice_tts')) {
    return 'On-device neural text-to-speech engine for natural offline voice playback of assistant replies.';
  }

  const traits: string[] = [];
  if (lowerId.includes('coder') || lowerId.includes('code') || hasTag('code')) {
    traits.push('coding & debugging');
  }
  if (
    lowerId.includes('r1') ||
    lowerId.includes('think') ||
    lowerId.includes('reason') ||
    hasTag('reasoning')
  ) {
    traits.push('step-by-step reasoning');
  }
  if (lowerId.includes('math') || hasTag('math')) {
    traits.push('math & logic');
  }
  if (capabilities.includes('vision')) {
    traits.unshift('photo, screenshot & document analysis');
  }
  if (capabilities.includes('multimodal_audio')) {
    traits.push('native audio understanding');
  }

  const paramsB = parameterCount ? parameterCount / 1e9 : null;
  const tierPrefix =
    paramsB !== null && paramsB <= 2.2
      ? 'Ultra-lightweight model built for instant responses and minimal battery impact'
      : paramsB !== null && paramsB <= 5
        ? 'Balanced mobile model for fast everyday chat, writing, and offline workflows'
        : paramsB !== null && paramsB <= 10
          ? 'High-capability local model for deeper analysis, writing, and complex tasks'
          : paramsB !== null && paramsB > 10
            ? 'Large-scale reasoning model requiring high-RAM hardware'
            : 'On-device open-source language model for private offline chat';

  const ctxNote =
    contextLength && contextLength >= 32768
      ? ` with long ${Math.round(contextLength / 1024)}K context`
      : '';

  if (traits.length > 0) {
    const joined =
      traits.length === 1
        ? traits[0]
        : `${traits.slice(0, -1).join(', ')} and ${traits[traits.length - 1]}`;
    return `${tierPrefix}, specialized in ${joined}${ctxNote}.`;
  }

  return `${tierPrefix}${ctxNote}.`;
}

/**
 * Deterministic Model Capability Classifier.
 * Inspects HF pipeline_tag, tags, gguf.architecture, header hints, and repository files
 * to assign capabilities, runtime, and atomic installable variants with companion files.
 */
export function classifyDiscoveredModel(
  raw: HfModelRaw,
  options: { tree?: HfTreeEntry[]; ggufHeader?: GgufHeaderMeta; mmprojHeader?: GgufHeaderMeta } = {}
): DiscoveredModel | null {
  const id = raw.id || raw.modelId;
  if (!id) return null;

  const files = buildRemoteFiles(raw, options.tree);
  if (files.length === 0) return null;

  const tags = Array.from(
    new Set([...(raw.tags ?? []), ...(raw.cardData?.tags ?? [])].map((t) => t.toLowerCase()))
  );
  const pipelineTag = (raw.pipeline_tag ?? raw.cardData?.pipeline_tag ?? '').toLowerCase();
  const arch = (options.ggufHeader?.architecture ?? raw.gguf?.architecture ?? '').toLowerCase();
  const evidence: string[] = [];
  const capabilities = new Set<ModelCapability>();

  const ggufWeights = files.filter((f) => f.role === 'weights' && f.path.toLowerCase().endsWith('.gguf'));
  const mmprojFiles = files.filter((f) => f.role === 'mmproj');
  const vocoderFiles = files.filter((f) => f.role === 'vocoder');
  const whisperBins = files.filter(
    (f) => f.role === 'weights' && f.path.toLowerCase().endsWith('.bin')
  );
  const coreMlFiles = files.filter((f) => f.role === 'coreml_encoder');
  const onnxFiles = files.filter(
    (f) => f.role === 'weights' && f.path.toLowerCase().endsWith('.onnx')
  );
  const tokensFiles = files.filter((f) => f.role === 'tokens');
  const voicesFiles = files.filter((f) => f.role === 'voices');
  const auxArchives = files.filter((f) => f.role === 'aux');

  let runtime: ModelRuntime = 'llama.rn';
  let incompleteBundle: string | undefined;
  const variants: QuantVariant[] = [];

  // ── 1. Speech-to-Text (Whisper ggml / Parakeet ONNX) ──
  const isAsr =
    pipelineTag === 'automatic-speech-recognition' ||
    tags.includes('whisper') ||
    id.toLowerCase().includes('whisper') ||
    id.toLowerCase().includes('parakeet');

  if (isAsr && whisperBins.length > 0) {
    runtime = 'whisper.rn';
    capabilities.add('audio_stt');
    evidence.push(`ASR repo with ${whisperBins.length} whisper.cpp ggml binary file(s)`);

    const seenBins = new Set<string>();
    for (const bin of whisperBins) {
      const quant = bin.quant ?? extractQuantFromFilename(bin.path);
      const label = (bin.path.split('/').pop() ?? quant).replace(/^ggml-|\.bin$/gi, '');
      if (seenBins.has(label)) continue;
      seenBins.add(label);
      const qInfo = getQuantInfo(quant);
      const bundleFiles: RemoteFile[] = [bin];
      const coreMl = selectMatchingCoreMlEncoder(bin, coreMlFiles);
      if (coreMl) {
        bundleFiles.push(coreMl);
      }
      const totalBytes = bundleFiles.reduce((s, f) => s + f.sizeBytes, 0);
      variants.push({
        quant: label,
        bitsPerWeight: qInfo.bitsPerWeight,
        files: bundleFiles,
        totalBytes,
        estimatedRuntimeBytes: Math.round(totalBytes * 1.35 + 64 * 1024 * 1024),
        fit: 'compatible',
        recommended: false,
      });
    }
  } else if (isAsr && onnxFiles.length > 0) {
    const hasEncoder = onnxFiles.some((f) => f.path.toLowerCase().includes('encoder'));
    const hasDecoder = onnxFiles.some((f) => f.path.toLowerCase().includes('decoder'));
    const hasTokens = tokensFiles.length > 0;
    runtime = 'sherpa-onnx';
    capabilities.add('audio_stt');
    evidence.push('ASR ONNX repository (Parakeet / Sherpa-ONNX transducer)');

    if (!hasEncoder || !hasDecoder || !hasTokens) {
      incompleteBundle = 'Missing required encoder/decoder/tokens.txt files for ONNX ASR';
    } else {
      const bundleFiles = [...onnxFiles.slice(0, 4), tokensFiles[0]];
      const totalBytes = bundleFiles.reduce((s, f) => s + f.sizeBytes, 0);
      variants.push({
        quant: 'INT8',
        bitsPerWeight: 8,
        files: bundleFiles,
        totalBytes,
        estimatedRuntimeBytes: Math.round(totalBytes * 1.4 + 96 * 1024 * 1024),
        fit: 'compatible',
        recommended: true,
      });
    }
  }

  // ── 2. Text-to-Speech (Kokoro ONNX / OuteTTS GGUF) ──
  const isTts =
    pipelineTag === 'text-to-speech' ||
    tags.includes('text-to-speech') ||
    tags.includes('tts') ||
    id.toLowerCase().includes('kokoro') ||
    id.toLowerCase().includes('outetts');

  if (capabilities.size === 0 && isTts) {
    if (onnxFiles.length > 0 || auxArchives.length > 0) {
      runtime = 'sherpa-onnx';
      capabilities.add('voice_tts');
      evidence.push('Neural TTS ONNX bundle (Sherpa-ONNX / Kokoro)');
      const hasVoices = voicesFiles.length > 0 || auxArchives.length > 0;
      const hasTokens = tokensFiles.length > 0 || auxArchives.length > 0;
      if (!hasVoices || !hasTokens) {
        incompleteBundle = 'Missing companion voices.bin or tokens.txt for neural TTS';
      } else {
        const bundleFiles =
          auxArchives.length > 0
            ? [auxArchives[0]]
            : [onnxFiles[0], ...voicesFiles.slice(0, 1), ...tokensFiles.slice(0, 1)];
        const totalBytes = bundleFiles.reduce((s, f) => s + f.sizeBytes, 0);
        variants.push({
          quant: onnxFiles[0]?.quant ?? 'FP16',
          bitsPerWeight: 8,
          files: bundleFiles,
          totalBytes,
          estimatedRuntimeBytes: Math.round(totalBytes * 1.4 + 96 * 1024 * 1024),
          fit: 'compatible',
          recommended: true,
        });
      }
    } else if (ggufWeights.length > 0) {
      runtime = 'llama.rn';
      capabilities.add('voice_tts');
      evidence.push('OuteTTS / neural vocoder GGUF repository');
      if (vocoderFiles.length === 0) {
        incompleteBundle = 'Missing companion vocoder/codec GGUF file';
      } else {
        const seenTtsQuants = new Set<string>();
        for (const w of ggufWeights) {
          const q = w.quant ?? extractQuantFromFilename(w.path);
          if (seenTtsQuants.has(q)) continue;
          seenTtsQuants.add(q);
          const qInfo = getQuantInfo(q);
          const bundleFiles = [w, vocoderFiles[0]];
          const totalBytes = bundleFiles.reduce((s, f) => s + f.sizeBytes, 0);
          variants.push({
            quant: q,
            bitsPerWeight: qInfo.bitsPerWeight,
            files: bundleFiles,
            totalBytes,
            estimatedRuntimeBytes: Math.round(totalBytes * 1.25 + 96 * 1024 * 1024),
            fit: 'compatible',
            recommended: false,
          });
        }
      }
    }
  }

  // ── 3. LLM / VLM / Multimodal Audio (llama.rn GGUF) ──
  if (capabilities.size === 0 && ggufWeights.length > 0) {
    runtime = 'llama.rn';

    const hasVisionSignal =
      pipelineTag === 'image-text-to-text' ||
      options.mmprojHeader?.hasVisionEncoder === true ||
      tags.some((t) => VISION_TAGS.has(t)) ||
      /vl\b|vision|llava|pixtral|smolvlm|internvl|minicpm-v/i.test(id);

    const hasAudioMultimodalSignal =
      pipelineTag === 'audio-text-to-text' ||
      pipelineTag === 'any-to-any' ||
      options.mmprojHeader?.hasAudioEncoder === true ||
      tags.some((t) => AUDIO_MULTIMODAL_TAGS.has(t)) ||
      /omni|audio/i.test(id);

    // Every GGUF decoder supports text generation
    capabilities.add('text');
    evidence.push(
      `GGUF decoder (${arch || 'auto-arch'}${pipelineTag ? `, pipeline=${pipelineTag}` : ''})`
    );

    if (hasVisionSignal || mmprojFiles.length > 0) {
      if (mmprojFiles.length > 0) {
        capabilities.add('vision');
        evidence.push(`Paired vision projector (${mmprojFiles.length} mmproj file(s))`);
      } else if (hasVisionSignal) {
        incompleteBundle = 'Vision model repository is missing an mmproj*.gguf projector file';
        evidence.push('Vision tags detected but no mmproj file found in repo');
      }
    }

    if (hasAudioMultimodalSignal && mmprojFiles.length > 0) {
      capabilities.add('multimodal_audio');
      evidence.push('Audio multimodal projector detected');
    }

    // Group split GGUFs (-00001-of-0000N.gguf) into a single variant
    const grouped = new Map<string, RemoteFile[]>();
    for (const w of ggufWeights) {
      const { key } = getSplitGroupKey(w.path);
      const arr = grouped.get(key) ?? [];
      arr.push(w);
      grouped.set(key, arr);
    }

    const seenQuants = new Set<string>();
    for (const [groupKey, shards] of grouped.entries()) {
      shards.sort((a, b) => a.path.localeCompare(b.path));
      const quant = extractQuantFromFilename(groupKey);
      if (seenQuants.has(quant)) continue;
      seenQuants.add(quant);

      const qInfo = getQuantInfo(quant);
      const bundleFiles: RemoteFile[] = [...shards];
      if (capabilities.has('vision') || capabilities.has('multimodal_audio')) {
        const mmproj = selectBestMmproj(mmprojFiles, quant);
        if (mmproj) bundleFiles.push(mmproj);
      }

      const totalBytes = bundleFiles.reduce((s, f) => s + f.sizeBytes, 0);
      variants.push({
        quant,
        bitsPerWeight: qInfo.bitsPerWeight,
        files: bundleFiles,
        totalBytes,
        estimatedRuntimeBytes: Math.round(totalBytes * 1.25 + 128 * 1024 * 1024),
        fit: 'compatible',
        recommended: false,
      });
    }
  }

  if (capabilities.size === 0) return null;

  const licenseRaw = raw.cardData?.license;
  const license = Array.isArray(licenseRaw) ? licenseRaw[0] : licenseRaw;

  const capsArray = Array.from(capabilities);
  const resolvedArch = options.ggufHeader?.architecture ?? raw.gguf?.architecture;
  const resolvedParams = parseParameterCount(raw);
  const resolvedCtx = options.ggufHeader?.contextLength ?? raw.gguf?.context_length;

  return {
    id,
    author: raw.author ?? id.split('/')[0] ?? 'community',
    displayName: formatDisplayName(id),
    summary: buildModelSummary({
      id,
      capabilities: capsArray,
      tags,
      architecture: resolvedArch,
      parameterCount: resolvedParams,
      contextLength: resolvedCtx,
      runtime,
    }),
    runtime,
    capabilities: capsArray,
    pipelineTag: pipelineTag || undefined,
    tags,
    architecture: resolvedArch,
    parameterCount: resolvedParams,
    contextLength: resolvedCtx,
    chatTemplate: options.ggufHeader?.hasChatTemplate ?? Boolean(raw.gguf?.chat_template),
    ggufHeader: options.ggufHeader,
    license,
    downloads: raw.downloads ?? 0,
    likes: raw.likes ?? 0,
    lastModified: raw.lastModified ?? new Date().toISOString(),
    variants,
    classifierEvidence: evidence,
    incompleteBundle,
    fetchedAt: Date.now(),
  };
}
