import type { LlamaChatMessage } from '@/lib/chat/promptBuilder';
import type {
  AccelerationPlan,
  AcceleratorBackend,
  GenerationTelemetry,
  InstalledModel,
  ModelCapability,
} from '@/lib/types';

export interface LoadedModelHandle {
  modelId: string;
  backend: AcceleratorBackend;
  nCtx: number;
  capabilities: ModelCapability[];
  gpuActive: boolean;
  reasonNoGPU?: string;
  devices?: string[];
}

export interface GenerateRequest {
  messages: LlamaChatMessage[];
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  enableThinking?: boolean;
  stop?: string[];
}

export interface TokenEvent {
  token: string;
  accumulated: string;
  tokenCount: number;
}

export interface InferenceEngine {
  load(
    model: InstalledModel,
    plan: AccelerationPlan,
    opts?: { nCtx?: number }
  ): Promise<LoadedModelHandle>;
  unload(): Promise<void>;
  generate(
    req: GenerateRequest,
    onToken: (ev: TokenEvent) => void
  ): Promise<GenerationTelemetry>;
  stop(): Promise<void>;
  tokenize(text: string): Promise<number[]>;
  readonly loadedHandle: LoadedModelHandle | null;
}
