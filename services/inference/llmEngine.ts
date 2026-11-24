import { File } from 'expo-file-system';

import { saveLlamaBackendProbe } from '@/lib/hardware/hardwareProfiler';
import type {
  AccelerationPlan,
  AcceleratorBackend,
  GenerationTelemetry,
  InstalledModel,
  ModelCapability,
} from '@/lib/types';
import { buildInitAttempts } from './hardwareDispatch';
import { modelLoadSentinel } from './modelLoadSentinel';
import { npuSentinel } from './npuSentinel';
import type { GenerateRequest, InferenceEngine, LoadedModelHandle, TokenEvent } from './types';

interface LlamaContextLike {
  gpu?: boolean;
  reasonNoGPU?: string;
  devices?: string[];
  initMultimodal?: (opts: { path: string; use_gpu?: boolean }) => Promise<boolean>;
  getMultimodalSupport?: () => Promise<{ vision?: boolean; audio?: boolean }>;
  completion: (
    params: Record<string, unknown>,
    callback?: (data: {
      token?: string;
      content?: string;
      reasoning_content?: string;
      accumulated_text?: string;
    }) => void
  ) => Promise<{
    text?: string;
    content?: string;
    reasoning_content?: string;
    tokens_predicted?: number;
    tokens_evaluated?: number;
    timings?: {
      predicted_per_second?: number;
      prompt_ms?: number;
      predicted_ms?: number;
    };
    stopped_eos?: boolean;
    stopped_limit?: boolean;
    stopped_word?: boolean;
  }>;
  stopCompletion: () => Promise<void>;
  clearCache?: (clearData?: boolean) => Promise<void>;
  tokenize: (text: string) => Promise<{ tokens: number[] }>;
  release: () => Promise<void>;
}

interface LlamaRnModule {
  initLlama: (params: Record<string, unknown>) => Promise<LlamaContextLike>;
}

let llamaModuleCache: LlamaRnModule | null | undefined;
function getLlamaModule(): LlamaRnModule | null {
  if (llamaModuleCache !== undefined) return llamaModuleCache;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    llamaModuleCache = require('llama.rn') as LlamaRnModule;
  } catch {
    llamaModuleCache = null;
  }
  return llamaModuleCache;
}

export class LlamaRnEngine implements InferenceEngine {
  private context: LlamaContextLike | null = null;
  private handle: LoadedModelHandle | null = null;
  private isStopping = false;
  private activeStoppedBy: GenerationTelemetry['stoppedBy'] | null = null;
  private deviceFingerprint = 'default';

  setDeviceFingerprint(fp: string): void {
    this.deviceFingerprint = fp;
  }

  get loadedHandle(): LoadedModelHandle | null {
    return this.handle;
  }

  async load(
    model: InstalledModel,
    plan: AccelerationPlan,
    opts?: { nCtx?: number }
  ): Promise<LoadedModelHandle> {
    await this.unload();

    const llama = getLlamaModule();
    if (!llama) {
      throw new Error('llama.rn native module is unavailable. Run Aura OS in an Expo Dev Build.');
    }

    const weightFile = model.files.find((f) => f.role === 'weights');
    if (!weightFile) {
      throw new Error(`Installed model "${model.displayName}" has no weight file.`);
    }

    const weightBase = (weightFile.localPath.split('/').pop() ?? '').toLowerCase();
    if (
      weightBase.startsWith('mtp-') ||
      weightBase.startsWith('mtp_') ||
      weightBase.includes('imatrix') ||
      weightBase.includes('lora')
    ) {
      throw new Error(
        `"${weightBase}" is an auxiliary sidecar file, not standalone LLM weights. Delete this model in the Models Vault and install a mobile LLM.`
      );
    }

    // Check universal crash-loop sentinel (protects both iOS & Android)
    const crashRecord = modelLoadSentinel.getRecord(model.id);
    if (modelLoadSentinel.isQuarantined(model.id)) {
      throw new Error(
        `"${model.displayName}" repeatedly caused a native crash on this device and was quarantined. Tap Retry to try again, or delete it and choose a smaller quantization.`
      );
    }

    // Verify local weight file exists and is non-empty before passing to C++
    try {
      const wf = new File(weightFile.localPath);
      if (!wf.exists || (wf.size ?? 0) < 1024) {
        throw new Error(
          `Model weight file is missing or incomplete on disk. Delete and re-download "${model.displayName}".`
        );
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('Model weight file')) throw err;
    }

    const mmprojFile = model.files.find((f) => f.role === 'mmproj');
    const isMultimodal = Boolean(mmprojFile);
    const targetCtx = Math.min(opts?.nCtx ?? model.contextLength ?? 4096, 8192);

    // If GPU previously crashed for this model, force safe CPU-only attempts
    const effectivePlan: AccelerationPlan = crashRecord?.gpuCrashed
      ? { ...plan, primary: 'cpu', fallbacks: [], nGpuLayers: 0, devices: undefined }
      : plan;

    const attempts = buildInitAttempts(weightFile.localPath, effectivePlan, {
      nCtx: targetCtx,
      isMultimodal,
    });

    let lastError: unknown;
    let ctx: LlamaContextLike | null = null;
    let chosenBackend: AcceleratorBackend = 'cpu';

    for (const attempt of attempts) {
      const isHexagon = attempt.backend === 'hexagon';
      if (isHexagon) {
        npuSentinel.markProbeStarted(this.deviceFingerprint);
      }
      modelLoadSentinel.markLoadStarted(model.id, attempt.backend);
      try {
        ctx = await llama.initLlama(attempt.params);
        modelLoadSentinel.markLoadSucceeded(model.id);
        if (isHexagon) {
          npuSentinel.markProbeSucceeded();
        }
        chosenBackend =
          attempt.backend !== 'cpu' && ctx.gpu === false ? 'cpu' : attempt.backend;
        break;
      } catch (err) {
        lastError = err;
        modelLoadSentinel.markLoadSucceeded(); // Caught cleanly in JS, not a native crash
        if (isHexagon) {
          npuSentinel.markProbeSucceeded();
        }
      }
    }

    if (!ctx) {
      throw new Error(
        `Failed to initialize ${model.displayName} on any hardware backend: ${
          lastError instanceof Error ? lastError.message : String(lastError)
        }`
      );
    }

    // Persist runtime hardware probe result from llama.rn
    saveLlamaBackendProbe({
      devices: ctx.devices ?? [],
      gpuAvailable: Boolean(ctx.gpu),
      reasonNoGPU: ctx.reasonNoGPU,
    });

    const capabilities = new Set<ModelCapability>(['text']);
    if (mmprojFile && ctx.initMultimodal) {
      try {
        const ok = await ctx.initMultimodal({
          path: mmprojFile.localPath,
          use_gpu: chosenBackend === 'metal' || chosenBackend === 'opencl',
        });
        if (ok) {
          const support = (await ctx.getMultimodalSupport?.()) ?? { vision: true };
          if (support.vision !== false && model.capabilities.includes('vision')) {
            capabilities.add('vision');
          }
          if (support.audio && model.capabilities.includes('multimodal_audio')) {
            capabilities.add('multimodal_audio');
          }
        }
      } catch {
        // Vision projector failed; continue gracefully in text-only mode
      }
    }

    this.context = ctx;
    this.handle = {
      modelId: model.id,
      backend: chosenBackend,
      nCtx: targetCtx,
      capabilities: Array.from(capabilities),
      gpuActive: Boolean(ctx.gpu),
      reasonNoGPU: ctx.reasonNoGPU,
      devices: ctx.devices,
    };

    return this.handle;
  }

  async unload(): Promise<void> {
    if (!this.context) return;
    const ctx = this.context;
    this.context = null;
    this.handle = null;
    try {
      await ctx.stopCompletion().catch(() => {});
      await ctx.release();
    } catch {
      // ignore release errors
    }
  }

  async generate(
    req: GenerateRequest,
    onToken: (ev: TokenEvent) => void
  ): Promise<GenerationTelemetry> {
    if (!this.context || !this.handle) {
      throw new Error('No local model is currently loaded.');
    }

    this.isStopping = false;
    this.activeStoppedBy = null;

    const startTime = Date.now();
    let firstTokenAt: number | null = null;
    let accumulated = '';
    let rawAccumulated = '';
    let tokenCount = 0;
    let sawStructuredFields = false;
    const thinkingEnabled = req.enableThinking ?? false;

    const formatStructuredOutput = (reasoning?: string, content?: string, isFinal = false): string => {
      const r = (reasoning ?? '').trim();
      const c = content ?? '';
      if (!r) return c;
      if (c.length > 0 || isFinal) {
        return `<think>\n${r}\n</think>\n\n${c}`;
      }
      return `<think>\n${r}`;
    };

    const result = await this.context.completion(
      {
        messages: req.messages,
        n_predict: req.maxTokens ?? 1024,
        temperature: req.temperature ?? 0.7,
        top_p: req.topP ?? 0.9,
        enable_thinking: thinkingEnabled,
        chat_template_kwargs: { enable_thinking: thinkingEnabled },
        reasoning_format: 'auto',
        stop: req.stop ?? ['<|eot_id|>', '<|im_end|>', '</s>'],
      },
      (data) => {
        if (this.isStopping) return;
        const hasStructured =
          typeof data.content === 'string' || typeof data.reasoning_content === 'string';
        if (!data.token && !hasStructured) return;

        if (firstTokenAt === null) firstTokenAt = Date.now();
        tokenCount += 1;
        if (data.token) rawAccumulated += data.token;

        if (hasStructured) {
          sawStructuredFields = true;
          accumulated = formatStructuredOutput(data.reasoning_content, data.content, false);
        } else {
          accumulated = rawAccumulated;
        }

        onToken({
          token: data.token ?? '',
          accumulated,
          tokenCount,
        });
      }
    );

    if (!this.isStopping) {
      const finalReasoning = result.reasoning_content?.trim() ?? '';
      const finalContent = result.content ?? '';
      if (sawStructuredFields || finalReasoning.length > 0 || finalContent.length > 0) {
        const canonical = formatStructuredOutput(finalReasoning, finalContent, true);
        if (canonical && canonical !== accumulated) {
          accumulated = canonical;
          onToken({ token: '', accumulated, tokenCount });
        }
      }
    }

    const totalMs = Math.max(1, Date.now() - startTime);
    const ttftMs = firstTokenAt ? Math.max(1, firstTokenAt - startTime) : totalMs;
    const predictedTokens = result.tokens_predicted ?? tokenCount;
    const decodeMs = Math.max(1, totalMs - ttftMs);
    const tokensPerSec =
      result.timings?.predicted_per_second ??
      (predictedTokens > 0 ? (predictedTokens / decodeMs) * 1000 : 0);

    let stoppedBy: GenerationTelemetry['stoppedBy'] = 'eos';
    if (this.activeStoppedBy) {
      stoppedBy = this.activeStoppedBy;
    } else if (this.isStopping) {
      stoppedBy = 'user';
    } else if (result.stopped_limit) {
      stoppedBy = 'limit';
    }

    return {
      modelId: this.handle.modelId,
      backend: this.handle.backend,
      promptTokens: result.tokens_evaluated ?? 0,
      completionTokens: predictedTokens,
      ttftMs,
      tokensPerSec: Number(tokensPerSec.toFixed(1)),
      totalMs,
      stoppedBy,
    };
  }

  async stop(reason: GenerationTelemetry['stoppedBy'] = 'user'): Promise<void> {
    this.isStopping = true;
    this.activeStoppedBy = reason;
    if (this.context) {
      try {
        await this.context.stopCompletion();
      } catch {
        // ignore
      }
    }
  }

  async clearCache(): Promise<void> {
    if (!this.context?.clearCache) return;
    try {
      await this.context.clearCache(true);
    } catch {
      // ignore if context was released
    }
  }

  async quickCompletion(prompt: string, maxTokens = 20): Promise<string> {
    if (!this.context || !this.handle) return '';
    try {
      const res = await this.context.completion({
        messages: [
          {
            role: 'system',
            content:
              'Generate a concise 3 to 5 word plain-English title for the conversation. Output ONLY the plain text title with no quotes, no punctuation, and no LaTeX or math symbols.',
          },
          { role: 'user', content: prompt },
        ],
        n_predict: maxTokens,
        temperature: 0.2,
        top_p: 0.85,
        enable_thinking: false,
        chat_template_kwargs: { enable_thinking: false },
        reasoning_format: 'auto',
        stop: ['\n', '<|eot_id|>', '<|im_end|>', '</s>'],
      });
      return res.content?.trim() || res.text || '';
    } catch {
      return '';
    }
  }

  async tokenize(text: string): Promise<number[]> {
    if (!this.context) return [];
    try {
      const res = await this.context.tokenize(text);
      return res.tokens ?? [];
    } catch {
      return [];
    }
  }
}
