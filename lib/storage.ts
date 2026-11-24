import type { MMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';

export interface KVStore {
  getString(key: string): string | undefined;
  set(key: string, value: string | number | boolean): void;
  remove(key: string): void;
  getJSON<T>(key: string): T | null;
  setJSON<T>(key: string, value: T): void;
  clearAll(): void;
}

function createNamedStore(id: string): KVStore {
  const memoryFallback = new Map<string, string>();
  let mmkvInstance: MMKV | null = null;
  let mmkvInitialized = false;

  function getMMKV(): MMKV | null {
    if (mmkvInitialized) return mmkvInstance;
    mmkvInitialized = true;
    try {
      // Lazy-require so test runners / non-native environments fall back safely
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mmkv = require('react-native-mmkv') as typeof import('react-native-mmkv');
      mmkvInstance = mmkv.createMMKV({ id });
    } catch {
      mmkvInstance = null;
    }
    return mmkvInstance;
  }

  return {
    getString(key: string): string | undefined {
      const store = getMMKV();
      if (store) return store.getString(key);
      return memoryFallback.get(key);
    },

    set(key: string, value: string | number | boolean): void {
      const store = getMMKV();
      if (store) {
        store.set(key, value);
        return;
      }
      memoryFallback.set(key, String(value));
    },

    remove(key: string): void {
      const store = getMMKV();
      if (store) {
        store.remove(key);
        return;
      }
      memoryFallback.delete(key);
    },

    getJSON<T>(key: string): T | null {
      const raw = this.getString(key);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    },

    setJSON<T>(key: string, value: T): void {
      this.set(key, JSON.stringify(value));
    },

    clearAll(): void {
      const store = getMMKV();
      if (store) {
        store.clearAll();
        return;
      }
      memoryFallback.clear();
    },
  };
}

export const offlineStorage = createNamedStore('aura-os-storage');
export const downloadsStorage = createNamedStore('aura-downloads');
export const runtimeStorage = createNamedStore('aura-runtime');
export const chatHistoryStorage = createNamedStore('aura-chat-history');

/**
 * Zustand persist storage adapter backed by react-native-mmkv.
 */
export const zustandMMKVStorage: StateStorage = {
  getItem: (name) => offlineStorage.getString(name) ?? null,
  setItem: (name, value) => {
    offlineStorage.set(name, value);
  },
  removeItem: (name) => {
    offlineStorage.remove(name);
  },
};
