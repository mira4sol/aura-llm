import { classifyDiscoveredModel } from '../capabilityClassifier';
import { getBestVariant, scoreModelForDevice } from '../fitScoring';
import type { DeviceHardwareProfile } from '@/lib/types';

const GB = 1024 * 1024 * 1024;

const profile8Gb: DeviceHardwareProfile = {
  capturedAt: Date.now(),
  platform: 'ios',
  osVersion: 'iOS 18',
  deviceModel: 'iPhone 15 Pro',
  deviceIdentifier: 'iPhone16,1',
  soc: { vendor: 'apple', model: 'Apple A17 Pro', marketingName: 'Apple A17 Pro' },
  cpu: {
    abi: 'arm64e',
    totalCores: 6,
    clusters: [{ maxFreqMHz: 3780, cores: 2 }],
    performanceCores: 2,
    features: { neon: true, fp16: true, dotprod: true, i8mm: true, sve: false, sme: false },
  },
  gpu: { name: 'Apple A17 Pro GPU', metal: true, metalFamily: 'Apple9', opencl: false },
  npu: { appleNeuralEngine: true, hexagon: false },
  memory: { totalBytes: 8 * GB, availableBytes: 5.5 * GB, safeBudgetBytes: 5 * GB, tier: '8to12' },
  storage: { freeBytes: 64 * GB, totalBytes: 256 * GB },
  thermal: 'nominal',
};

describe('capabilityClassifier & fitScoring', () => {
  it('classifies a VLM repo and pairs weights + mmproj atomically', () => {
    const model = classifyDiscoveredModel({
      id: 'bartowski/Qwen2.5-VL-3B-Instruct-GGUF',
      pipeline_tag: 'image-text-to-text',
      tags: ['gguf', 'vision'],
      downloads: 50000,
      gguf: { architecture: 'qwen2vl', total: 3_100_000_000, context_length: 32768 },
      siblings: [
        { rfilename: 'Qwen2.5-VL-3B-Instruct-Q4_K_M.gguf', size: 1.9 * GB },
        { rfilename: 'Qwen2.5-VL-3B-Instruct-Q8_0.gguf', size: 3.3 * GB },
        { rfilename: 'mmproj-Qwen2.5-VL-3B-Instruct-f16.gguf', size: 0.6 * GB },
      ],
    });

    expect(model).not.toBeNull();
    expect(model!.capabilities).toContain('text');
    expect(model!.capabilities).toContain('vision');
    expect(model!.variants[0].files.length).toBe(2);
    expect(model!.variants[0].files.some((f) => f.role === 'mmproj')).toBe(true);

    const scored = scoreModelForDevice(model!, profile8Gb);
    const best = getBestVariant(scored);
    expect(best?.quant).toBe('Q4_K_M');
    expect(best?.fit).toBe('compatible');
  });

  it('flags a vision repo missing mmproj as an incomplete bundle', () => {
    const model = classifyDiscoveredModel({
      id: 'someone/Broken-VL-7B-GGUF',
      pipeline_tag: 'image-text-to-text',
      tags: ['gguf', 'vision'],
      siblings: [{ rfilename: 'Broken-VL-7B-Q4_K_M.gguf', size: 4.1 * GB }],
    });

    expect(model).not.toBeNull();
    expect(model!.capabilities).not.toContain('vision');
    expect(model!.incompleteBundle).toMatch(/mmproj/i);
  });

  it('classifies whisper.cpp ASR repos and pairs matching Core ML encoder', () => {
    const model = classifyDiscoveredModel({
      id: 'ggerganov/whisper.cpp',
      pipeline_tag: 'automatic-speech-recognition',
      tags: ['whisper'],
      siblings: [
        { rfilename: 'ggml-small.en-q5_1.bin', size: 190 * 1024 * 1024 },
        { rfilename: 'ggml-small.en-encoder.mlmodelc.zip', size: 150 * 1024 * 1024 },
      ],
    });

    expect(model?.runtime).toBe('whisper.rn');
    expect(model?.capabilities).toEqual(['audio_stt']);
    expect(model?.variants[0].files.length).toBe(2);
  });

  it('groups split GGUF shards into one variant', () => {
    const model = classifyDiscoveredModel({
      id: 'bartowski/Llama-3.3-70B-GGUF',
      pipeline_tag: 'text-generation',
      tags: ['gguf'],
      siblings: [
        { rfilename: 'Llama-3.3-70B-Q4_K_M-00001-of-00002.gguf', size: 20 * GB },
        { rfilename: 'Llama-3.3-70B-Q4_K_M-00002-of-00002.gguf', size: 20 * GB },
      ],
    });

    expect(model?.variants.length).toBe(1);
    expect(model?.variants[0].files.length).toBe(2);
    const scored = scoreModelForDevice(model!, profile8Gb);
    expect(scored.variants[0].fit).toBe('not_recommended');
  });

  it('never classifies MTP, imatrix, LoRA, or adapter GGUF sidecars as runnable weights', () => {
    const model = classifyDiscoveredModel({
      id: 'unsloth/Qwen3.8-27B-GGUF',
      pipeline_tag: 'image-text-to-text',
      tags: ['gguf', 'vision'],
      siblings: [
        { rfilename: 'MTP/mtp-Qwen3.8-27B-Q4_0.gguf', size: 1.3 * GB },
        { rfilename: 'imatrix-Qwen3.8-27B.gguf', size: 12 * 1024 * 1024 },
        { rfilename: 'lora-adapter-Q4_0.gguf', size: 120 * 1024 * 1024 },
        { rfilename: 'mmproj-F16.gguf', size: 0.9 * GB },
      ],
    });
    expect(model).toBeNull();
  });
});
