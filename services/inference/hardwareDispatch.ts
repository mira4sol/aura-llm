import type { AccelerationPlan, AcceleratorBackend } from '@/lib/types';

export interface LlamaInitAttempt {
  backend: AcceleratorBackend;
  params: {
    model: string;
    n_ctx: number;
    n_gpu_layers: number;
    n_threads: number;
    use_mmap: boolean;
    use_mlock: boolean;
    flash_attn_type: 'auto' | 'on' | 'off';
    cache_type_k: 'f16' | 'q8_0' | 'q4_0';
    cache_type_v: 'f16' | 'q8_0' | 'q4_0';
    ctx_shift: boolean;
    devices?: string[];
  };
}

/**
 * Builds an ordered, crash-safe fallback ladder of llama.rn initLlama parameter sets
 * from an AccelerationPlan (e.g. Hexagon HTP0 -> Adreno OpenCL -> Half-GPU -> CPU NEON).
 */
export function buildInitAttempts(
  modelPath: string,
  plan: AccelerationPlan,
  options: { nCtx: number; isMultimodal: boolean }
): LlamaInitAttempt[] {
  const attempts: LlamaInitAttempt[] = [];
  const base = {
    model: modelPath,
    n_ctx: options.nCtx,
    n_threads: plan.nThreads,
    use_mmap: plan.useMmap,
    use_mlock: plan.useMlock,
    flash_attn_type: plan.flashAttn,
    cache_type_k: plan.kvCacheType,
    cache_type_v: plan.kvCacheType,
    ctx_shift: !options.isMultimodal,
  };

  const backends: AcceleratorBackend[] = [plan.primary, ...plan.fallbacks];
  const seen = new Set<string>();

  for (const backend of backends) {
    if (backend === 'hexagon') {
      if (seen.has('hexagon')) continue;
      seen.add('hexagon');
      attempts.push({
        backend: 'hexagon',
        params: {
          ...base,
          n_gpu_layers: 99,
          devices: plan.devices ?? ['HTP0'],
        },
      });
    } else if (backend === 'metal' || backend === 'opencl') {
      if (seen.has(backend)) continue;
      seen.add(backend);
      // Full GPU offload first
      attempts.push({
        backend,
        params: {
          ...base,
          n_gpu_layers: plan.nGpuLayers || 99,
        },
      });
      // Partial GPU offload fallback if full offload OOMs
      attempts.push({
        backend,
        params: {
          ...base,
          n_gpu_layers: 16,
        },
      });
    } else {
      if (seen.has('cpu')) continue;
      seen.add('cpu');
      attempts.push({
        backend: 'cpu',
        params: {
          ...base,
          n_gpu_layers: 0,
        },
      });
    }
  }

  // Always guarantee a final CPU fallback
  if (!seen.has('cpu')) {
    attempts.push({
      backend: 'cpu',
      params: {
        ...base,
        n_gpu_layers: 0,
      },
    });
  }

  return attempts;
}
