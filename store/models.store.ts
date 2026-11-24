import { create } from 'zustand';

import type { DiscoveredModel, InstalledModel } from '@/lib/types';

interface ModelsState {
  catalog: DiscoveredModel[];
  catalogLoading: boolean;
  catalogError: string | null;
  catalogLastSyncedAt: number | null;
  installed: InstalledModel[];

  setCatalog: (models: DiscoveredModel[], syncedAt?: number) => void;
  upsertCatalogModel: (model: DiscoveredModel) => void;
  setCatalogLoading: (loading: boolean) => void;
  setCatalogError: (error: string | null) => void;
  setInstalled: (models: InstalledModel[]) => void;
  upsertInstalled: (model: InstalledModel) => void;
  removeInstalled: (id: string) => void;
}

export const useModelsStore = create<ModelsState>((set) => ({
  catalog: [],
  catalogLoading: false,
  catalogError: null,
  catalogLastSyncedAt: null,
  installed: [],

  setCatalog: (catalog, syncedAt) =>
    set({
      catalog,
      catalogError: null,
      catalogLastSyncedAt: syncedAt ?? Date.now(),
    }),
  upsertCatalogModel: (model) =>
    set((state) => {
      const idx = state.catalog.findIndex((m) => m.id === model.id);
      if (idx < 0) return { catalog: [model, ...state.catalog] };
      const next = [...state.catalog];
      next[idx] = model;
      return { catalog: next };
    }),
  setCatalogLoading: (catalogLoading) => set({ catalogLoading }),
  setCatalogError: (catalogError) => set({ catalogError }),
  setInstalled: (installed) => set({ installed }),
  upsertInstalled: (model) =>
    set((state) => {
      const idx = state.installed.findIndex((m) => m.id === model.id);
      if (idx < 0) return { installed: [model, ...state.installed] };
      const next = [...state.installed];
      next[idx] = model;
      return { installed: next };
    }),
  removeInstalled: (id) =>
    set((state) => ({
      installed: state.installed.filter((m) => m.id !== id),
    })),
}));
