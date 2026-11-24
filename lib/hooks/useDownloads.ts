import { useMemo } from 'react';

import { useDownloadsStore } from '@/store/downloads.store';

export function useDownloads() {
  const tasksMap = useDownloadsStore((s) => s.tasks);
  const isOnline = useDownloadsStore((s) => s.isOnline);
  const isWifi = useDownloadsStore((s) => s.isWifi);

  const tasks = useMemo(
    () => Object.values(tasksMap).sort((a, b) => b.updatedAt - a.updatedAt),
    [tasksMap]
  );

  const activeDownloads = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.status !== 'completed' && t.status !== 'cancelled'
      ),
    [tasks]
  );

  return { tasks, tasksMap, activeDownloads, isOnline, isWifi };
}
