import { downloadsStorage } from '@/lib/storage';
import type { DownloadTaskState } from '@/lib/types';

const QUEUE_KEY = 'download-queue-v1';

export const downloadQueue = {
  load(): DownloadTaskState[] {
    return downloadsStorage.getJSON<DownloadTaskState[]>(QUEUE_KEY) ?? [];
  },

  save(tasks: DownloadTaskState[]): void {
    downloadsStorage.setJSON(QUEUE_KEY, tasks);
  },

  upsert(task: DownloadTaskState): DownloadTaskState[] {
    const all = this.load();
    const idx = all.findIndex((t) => t.id === task.id);
    const next = idx < 0 ? [task, ...all] : all.map((t, i) => (i === idx ? task : t));
    this.save(next);
    return next;
  },

  remove(id: string): DownloadTaskState[] {
    const next = this.load().filter((t) => t.id !== id);
    this.save(next);
    return next;
  },
};
