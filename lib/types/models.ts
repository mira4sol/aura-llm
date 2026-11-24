import type { AcceleratorBackend } from './hardware';

export type ModelCapability =
  | 'text'
  | 'vision'
  | 'audio_stt'
  | 'voice_tts'
  | 'multimodal_audio';

export type ModelRuntime = 'llama.rn' | 'whisper.rn' | 'sherpa-onnx';
export type FitClass = 'optimal' | 'compatible' | 'tight' | 'not_recommended';
export type ArtifactRole =
  | 'weights'
  | 'mmproj'
  | 'vocoder'
  | 'coreml_encoder'
  | 'tokens'
  | 'voices'
  | 'vad'
  | 'aux';

export interface RemoteFile {
  path: string;
  sizeBytes: number;
  sha256: string | null;
  role: ArtifactRole;
  quant?: string;
  isArchive?: boolean;
}

export interface QuantVariant {
  quant: string;
  bitsPerWeight: number;
  files: RemoteFile[];
  totalBytes: number;
  estimatedRuntimeBytes: number;
  fit: FitClass;
  fitReason?: string;
  recommended: boolean;
  incompleteReason?: string;
}

export interface GgufHeaderMeta {
  architecture?: string;
  blockCount?: number;
  headCount?: number;
  headCountKv?: number;
  embeddingLength?: number;
  contextLength?: number;
  hasChatTemplate?: boolean;
  hasVisionEncoder?: boolean;
  hasAudioEncoder?: boolean;
  sizeLabel?: string;
}

export interface DiscoveredModel {
  id: string;
  author: string;
  displayName: string;
  summary?: string;
  runtime: ModelRuntime;
  capabilities: ModelCapability[];
  pipelineTag?: string;
  tags: string[];
  architecture?: string;
  parameterCount?: number;
  contextLength?: number;
  chatTemplate?: boolean;
  ggufHeader?: GgufHeaderMeta;
  license?: string;
  downloads: number;
  likes: number;
  lastModified: string;
  variants: QuantVariant[];
  classifierEvidence: string[];
  incompleteBundle?: string;
  fetchedAt: number;
}

export interface InstalledFile extends RemoteFile {
  localPath: string;
  verified: boolean;
}

export interface ModelBenchmark {
  tokensPerSec: number;
  ttftMs: number;
  backend: AcceleratorBackend;
  measuredAt: number;
}

export interface InstalledModel {
  id: string;
  repoId: string;
  displayName: string;
  runtime: ModelRuntime;
  capabilities: ModelCapability[];
  quant: string;
  files: InstalledFile[];
  totalBytes: number;
  contextLength?: number;
  parameterCount?: number;
  architecture?: string;
  installedAt: number;
  lastUsedAt?: number;
  benchmark?: ModelBenchmark;
}
