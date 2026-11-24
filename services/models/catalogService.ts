import { catalogRepo } from '@/lib/db/catalogRepo';
import { diagnoseHubConnectivity } from '@/lib/http_requests/hfClient';
import { fetchRemoteGgufHeader } from '@/lib/http_requests/hfGgufHeader';
import { fetchHfModelInfo } from '@/lib/http_requests/hfModelInfo';
import { searchHfModels, type HfModelRaw } from '@/lib/http_requests/hfModelSearch';
import { fetchHfRepoTree } from '@/lib/http_requests/hfRepoTree';
import { classifyDiscoveredModel } from '@/lib/models/capabilityClassifier';
import {
  filterModelForMobile,
  fitClassRank,
  getBestVariant,
  scoreModelForDevice,
} from '@/lib/models/fitScoring';
import type {
  AccelerationPlan,
  DeviceHardwareProfile,
  DiscoveredModel,
  ModelCapability,
} from '@/lib/types';
import { useAppStore } from '@/store/app.store';
import { useModelsStore } from '@/store/models.store';
import { useRuntimeStore } from '@/store/runtime.store';

/**
 * Trusted publisher policy (not a hardcoded model list — dynamic search still queries HF API).
 * Users can disable this filter in the Models screen to browse all community repositories.
 */
export const TRUSTED_PUBLISHERS = new Set([
  'ggml-org',
  'ggerganov',
  'bartowski',
  'unsloth',
  'lmstudio-community',
  'qwen',
  'google',
  'microsoft',
  'mistralai',
  'meta-llama',
  'huggingfacetb',
  'onnx-community',
  'csukuangfj',
  'k2-fsa',
  'outeai',
  'hexgrad',
  'nvidia',
  'systran',
  'rhasspy',
]);

export interface CatalogQueryOptions {
  search?: string;
  capability?: ModelCapability | 'all';
  trustedOnly?: boolean;
}

function applyScoring(
  models: DiscoveredModel[],
  hw: DeviceHardwareProfile | null,
  plan: AccelerationPlan | null,
  mobileOnly = true
): DiscoveredModel[] {
  const filtered = mobileOnly
    ? models
        .map((m) => filterModelForMobile(m, hw))
        .filter((m): m is DiscoveredModel => m !== null)
    : models;
  if (!hw) return filtered;
  return filtered.map((m) => scoreModelForDevice(m, hw, plan));
}

let inFlightSync: { key: string; promise: Promise<DiscoveredModel[]> } | null = null;

export const catalogService = {
  /** Hydrates local SQLite cache immediately so the catalog is browsable 100% offline. */
  async hydrateFromCache(): Promise<DiscoveredModel[]> {
    const cached = await catalogRepo.listAll(150);
    const { hardware, accelerationPlan } = useRuntimeStore.getState();
    const scored = applyScoring(cached, hardware, accelerationPlan);
    useModelsStore.getState().setCatalog(scored);
    return scored;
  },

  /**
   * Dynamically fetches open-source GGUF, Vision, Whisper/Parakeet ASR, and TTS repositories
   * from Hugging Face Hub, classifies their capabilities, scores them against real device
   * hardware, and persists the result locally in SQLite.
   */
  async syncCatalog(options: CatalogQueryOptions = {}): Promise<DiscoveredModel[]> {
    const syncKey = JSON.stringify({
      s: options.search?.trim() ?? '',
      c: options.capability ?? 'all',
      t: options.trustedOnly ?? useAppStore.getState().preferences.trustedPublishersOnly,
    });
    if (inFlightSync && inFlightSync.key === syncKey) {
      return inFlightSync.promise;
    }

    const run = (async (): Promise<DiscoveredModel[]> => {
    const store = useModelsStore.getState();
    store.setCatalogLoading(true);
    store.setCatalogError(null);

    const trustedOnly =
      options.trustedOnly ?? useAppStore.getState().preferences.trustedPublishersOnly;

    try {
      const q = options.search?.trim();
      const cap = options.capability ?? 'all';

      const queries: Promise<HfModelRaw[]>[] = [];

      if (q) {
        queries.push(searchHfModels({ search: q, filter: 'gguf', limit: 30 }));
        if (cap === 'all' || cap === 'audio_stt') {
          queries.push(
            searchHfModels({
              search: q,
              filter: 'automatic-speech-recognition',
              limit: 12,
            })
          );
        }
        if (cap === 'all' || cap === 'voice_tts') {
          queries.push(searchHfModels({ search: q, filter: 'text-to-speech', limit: 12 }));
        }
      } else {
        if (cap === 'all' || cap === 'text') {
          // Dynamically discover phone-friendly 1B-8B GGUF models from Hugging Face Hub
          queries.push(
            searchHfModels({
              search: '3B-Instruct-GGUF',
              filter: 'gguf',
              sort: 'downloads',
              limit: 12,
            })
          );
          queries.push(
            searchHfModels({
              search: '1.5B-Instruct-GGUF',
              filter: 'gguf',
              sort: 'downloads',
              limit: 10,
            })
          );
          queries.push(
            searchHfModels({
              search: '4B-GGUF',
              filter: 'gguf',
              sort: 'downloads',
              limit: 10,
            })
          );
          queries.push(
            searchHfModels({
              search: '7B-Instruct-GGUF',
              filter: 'gguf',
              sort: 'downloads',
              limit: 8,
            })
          );
        }
        if (cap === 'all' || cap === 'vision') {
          queries.push(
            searchHfModels({
              search: 'VL-3B-GGUF',
              filter: 'gguf',
              sort: 'downloads',
              limit: 8,
            })
          );
          queries.push(
            searchHfModels({
              search: 'SmolVLM',
              filter: 'gguf',
              sort: 'downloads',
              limit: 6,
            })
          );
          queries.push(
            searchHfModels({
              filter: ['gguf', 'image-text-to-text'],
              sort: 'downloads',
              limit: 15,
            })
          );
        }
        if (cap === 'all' || cap === 'audio_stt') {
          queries.push(
            searchHfModels({
              search: 'whisper.cpp',
              filter: 'automatic-speech-recognition',
              sort: 'downloads',
              limit: 8,
            })
          );
        }
        if (cap === 'all' || cap === 'voice_tts') {
          queries.push(
            searchHfModels({
              search: 'kokoro',
              filter: 'text-to-speech',
              sort: 'downloads',
              limit: 8,
            })
          );
          queries.push(
            searchHfModels({
              search: 'OuteTTS',
              filter: 'gguf',
              sort: 'downloads',
              limit: 6,
            })
          );
        }
      }

      const settled = await Promise.allSettled(queries);
      const rawMap = new Map<string, HfModelRaw>();
      let firstError: unknown = null;
      for (const res of settled) {
        if (res.status === 'fulfilled') {
          for (const item of res.value) {
            if (!rawMap.has(item.id)) rawMap.set(item.id, item);
          }
        } else if (!firstError) {
          firstError = res.reason;
        }
      }

      if (rawMap.size === 0 && firstError) {
        throw firstError;
      }

      const classified: DiscoveredModel[] = [];
      for (const raw of rawMap.values()) {
        const model = classifyDiscoveredModel(raw);
        if (!model || model.variants.length === 0) continue;
        const author = (raw.author ?? raw.id.split('/')[0] ?? '').toLowerCase();
        const isVoiceOrAudio =
          model.capabilities.includes('audio_stt') ||
          model.capabilities.includes('voice_tts') ||
          model.capabilities.includes('multimodal_audio');
        if (trustedOnly && !q && !isVoiceOrAudio && !TRUSTED_PUBLISHERS.has(author)) {
          continue;
        }
        classified.push(model);
      }

      // If trusted filter yielded nothing (e.g. niche search), relax automatically
      if (classified.length === 0 && trustedOnly) {
        for (const raw of rawMap.values()) {
          const model = classifyDiscoveredModel(raw);
          if (model && model.variants.length > 0) classified.push(model);
        }
      }

      const { hardware, accelerationPlan } = useRuntimeStore.getState();

      // Pre-filter desktop/server giants before fetching HF /tree/main sizes
      const mobileCandidates = q
        ? classified
        : classified
            .map((m) => filterModelForMobile(m, hardware))
            .filter((m): m is DiscoveredModel => m !== null);

      // Hydrate exact byte sizes via HF /tree/main in parallel for top 14 mobile-friendly models
      const topForTree = mobileCandidates.slice(0, 14);
      const treeResults = await Promise.allSettled(
        topForTree.map(async (m) => {
          const raw = rawMap.get(m.id);
          if (!raw) return m;
          const tree = await fetchHfRepoTree(m.id);
          return classifyDiscoveredModel(raw, { tree }) ?? m;
        })
      );

      const enrichedMap = new Map<string, DiscoveredModel>();
      for (const m of mobileCandidates) enrichedMap.set(m.id, m);
      for (const r of treeResults) {
        if (r.status === 'fulfilled' && r.value) {
          enrichedMap.set(r.value.id, r.value);
        }
      }

      const scored = applyScoring(
        Array.from(enrichedMap.values()),
        hardware,
        accelerationPlan,
        !q
      );

      if (scored.length > 0) {
        await catalogRepo.upsertMany(scored);
      }

      const merged = await catalogRepo.listAll(150);
      const finalScored = applyScoring(merged, hardware, accelerationPlan);
      store.setCatalog(finalScored);
      return finalScored;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to reach Hugging Face Hub (offline mode)';
      console.warn('[catalogService] syncCatalog failed:', message);
      let diagnosis = '';
      try {
        diagnosis = await diagnoseHubConnectivity();
      } catch {
        // diagnosis is best-effort
      }
      store.setCatalogError(diagnosis ? `${diagnosis}\n(${message})` : message);
      return store.catalog;
    } finally {
      store.setCatalogLoading(false);
      if (inFlightSync?.key === syncKey) {
        inFlightSync = null;
      }
    }
    })();

    inFlightSync = { key: syncKey, promise: run };
    return run;
  },

  /**
   * Resolves exact file tree sizes, LFS SHA-256 hashes, and remote GGUF KV header
   * metadata for a model before download or when expanding its details card.
   */
  async resolveModelDetails(repoId: string): Promise<DiscoveredModel | null> {
    const [rawInfo, tree] = await Promise.all([fetchHfModelInfo(repoId), fetchHfRepoTree(repoId)]);

    const firstWeight = tree.find(
      (e) => e.path.toLowerCase().endsWith('.gguf') && !e.path.toLowerCase().includes('mmproj')
    );
    const firstMmproj = tree.find(
      (e) => e.path.toLowerCase().endsWith('.gguf') && e.path.toLowerCase().includes('mmproj')
    );

    const [ggufHeader, mmprojHeader] = await Promise.all([
      firstWeight ? fetchRemoteGgufHeader(repoId, firstWeight.path) : Promise.resolve(null),
      firstMmproj ? fetchRemoteGgufHeader(repoId, firstMmproj.path) : Promise.resolve(null),
    ]);

    const classified = classifyDiscoveredModel(rawInfo, {
      tree,
      ggufHeader: ggufHeader ?? undefined,
      mmprojHeader: mmprojHeader ?? undefined,
    });
    if (!classified) return null;

    const { hardware, accelerationPlan } = useRuntimeStore.getState();
    const scored = hardware
      ? scoreModelForDevice(classified, hardware, accelerationPlan)
      : classified;

    await catalogRepo.upsertMany([scored]);
    useModelsStore.getState().upsertCatalogModel(scored);
    return scored;
  },

  /**
   * Picks top fit-ranked text starter models for the Onboarding screen from the live catalog.
   */
  pickStarterRecommendations(catalog: DiscoveredModel[], count = 3): DiscoveredModel[] {
    const textModels = catalog.filter(
      (m) =>
        m.runtime === 'llama.rn' &&
        m.capabilities.includes('text') &&
        !m.incompleteBundle &&
        m.variants.length > 0
    );

    const ranked = [...textModels].sort((a, b) => {
      const av = getBestVariant(a);
      const bv = getBestVariant(b);
      const fitDiff =
        fitClassRank(bv?.fit ?? 'not_recommended') - fitClassRank(av?.fit ?? 'not_recommended');
      if (fitDiff !== 0) return fitDiff;
      // Prefer 1.2B-5B conversational LLMs over tiny sub-1B VQA image-captioners
      const aSweetSpot = (a.parameterCount ?? 0) >= 1.2e9 && (a.parameterCount ?? 0) <= 5e9 ? 1 : 0;
      const bSweetSpot = (b.parameterCount ?? 0) >= 1.2e9 && (b.parameterCount ?? 0) <= 5e9 ? 1 : 0;
      if (bSweetSpot !== aSweetSpot) return bSweetSpot - aSweetSpot;
      return b.downloads - a.downloads;
    });

    return ranked.slice(0, count);
  },
};
