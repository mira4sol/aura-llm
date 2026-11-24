import { create } from 'zustand';

import type { DownloadTaskState } from '@/lib/types';

interface DownloadsState {
  tasks: Record<string, DownloadTaskState>;
  isOnline: boolean;
  isWifi: boolean;

  setAllTasks: (list: DownloadTaskState[]) => void;
  upsertTask: (task: DownloadTaskState) => void;
  removeTask: (id: string) => void;
  setNetworkState: (isOnline: boolean, isWifi: boolean) => void;
}

export const useDownloadsStore = create<DownloadsState>((set) => ({
  tasks: {},
  isOnline: true,
  isWifi: true,

  setAllTasks: (list) => {
    const map: Record<string, DownloadTaskState> = {};
    for (const t of list) map[t.id] = t;
    set({ tasks: map });
  },
  upsertTask: (task) =>
    set((state) => ({
      tasks: { ...state.tasks, [task.id]: task },
    })),
  removeTask: (id) =>
    set((state) => {
      const next = { ...state.tasks };
      delete next[id];
      return { tasks: next };
    }),
  setNetworkState: (isOnline, isWifi) => set({ isOnline, isWifi }),
}));
