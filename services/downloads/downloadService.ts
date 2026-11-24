import { AppState } from 'react-native';
import { Paths } from 'expo-file-system';

import { installedModelsRepo } from '@/lib/db/installedModelsRepo';
import { formatBytes } from '@/lib/format';
import { buildHfResolveUrl } from '@/lib/http_requests/hfUrls';
import { ensureDirectory, getDownloadsTempDir, getModelFilePath } from '@/lib/models/modelPaths';
import type {
  DiscoveredModel,
  DownloadFileState,
  DownloadSegment,
  DownloadTaskState,
  InstalledModel,
  QuantVariant,
} from '@/lib/types';
import { setNotificationActionHandler } from '@/services/notifications/actions';
import { notificationService } from '@/services/notifications/notificationService';
import { useAppStore } from '@/store/app.store';
import { useDownloadsStore } from '@/store/downloads.store';
import { useModelsStore } from '@/store/models.store';
import { useRuntimeStore } from '@/store/runtime.store';
import { computeBackoffMs } from './backoff';
import { downloadQueue } from './downloadQueue';
import {
  assembleDownloadedFile,
  cleanupBundleTemps,
  deleteFileQuietly,
  getFileSizeQuietly,
  sweepOrphanedTempFiles,
  verifyDownloadedFile,
} from './integrity';
import { networkMonitor } from './networkMonitor';
import {
  buildNativeTaskId,
  clampSegmentBytes,
  isRunawayDownloadOverflow,
  planFileSegments,
} from './segmentPlanner';

interface NativeDownloadTask {
  id: string;
  begin: (cb: (info: { expectedBytes: number }) => void) => NativeDownloadTask;
  progress: (cb: (info: { bytesDownloaded: number; bytesTotal: number }) => void) => NativeDownloadTask;
  done: (cb: (info: { bytesDownloaded: number; bytesTotal: number }) => void) => NativeDownloadTask;
  error: (cb: (info: { error: string; errorCode?: number }) => void) => NativeDownloadTask;
  start: () => void | Promise<void>;
  pause: () => void | Promise<void>;
  resume: () => void | Promise<void>;
  stop: () => void | Promise<void>;
}

interface BgDownloaderModule {
  createDownloadTask: (opts: {
    id: string;
    url: string;
    destination: string;
    headers?: Record<string, string>;
    maxRedirects?: number;
  }) => NativeDownloadTask;
  getExistingDownloadTasks: () => Promise<NativeDownloadTask[]>;
  setConfig?: (cfg: { progressInterval?: number; isLogsEnabled?: boolean }) => void;
}

let bgModuleCache: BgDownloaderModule | null | undefined;
function getBgDownloader(): BgDownloaderModule | null {
  if (bgModuleCache !== undefined) return bgModuleCache;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@kesha-antonov/react-native-background-downloader');
    bgModuleCache = (mod.default ?? mod) as BgDownloaderModule;
  } catch {
    bgModuleCache = null;
  }
  return bgModuleCache;
}

const MAX_CONCURRENT_SEGMENTS_PER_BUNDLE = 2;
const MAX_CONCURRENT_GLOBAL = 3;
const UI_PROGRESS_THROTTLE_MS = 500;
const QUEUE_PERSIST_THROTTLE_MS = 3000;

function getEffectiveMaxConcurrent(): { perBundle: number; global: number } {
  const totalRam = useRuntimeStore.getState().hardware?.memory.totalBytes ?? 0;
  // Cap concurrent native download streams on <= 4.5 GB RAM devices to prevent OOM
  if (totalRam > 0 && totalRam <= 4.5 * 1024 * 1024 * 1024) {
    return { perBundle: 1, global: 1 };
  }
  return { perBundle: MAX_CONCURRENT_SEGMENTS_PER_BUNDLE, global: MAX_CONCURRENT_GLOBAL };
}

const activeNativeTasks = new Map<string, NativeDownloadTask>();
const pausedNativeTasks = new Map<string, NativeDownloadTask>();
const retryTimers = new Map<string, ReturnType<typeof setTimeout>>();
const speedSamples = new Map<string, { ts: number; bytes: number }>();
const lastEmitTs = new Map<string, number>();
const lastPersistTs = new Map<string, number>();

let initialized = false;

function getTask(bundleId: string): DownloadTaskState | undefined {
  return useDownloadsStore.getState().tasks[bundleId];
}

function saveAndEmit(task: DownloadTaskState, forcePersist = true): void {
  const now = Date.now();
  const lastEmit = lastEmitTs.get(task.id) ?? 0;
  if (!forcePersist && now - lastEmit < UI_PROGRESS_THROTTLE_MS) {
    return;
  }
  lastEmitTs.set(task.id, now);

  const updated: DownloadTaskState = { ...task, updatedAt: now };
  useDownloadsStore.getState().upsertTask(updated);

  const last = lastPersistTs.get(task.id) ?? 0;
  if (forcePersist || now - last >= QUEUE_PERSIST_THROTTLE_MS) {
    lastPersistTs.set(task.id, now);
    downloadQueue.upsert(updated);
  }
}

function recalcBundleProgress(task: DownloadTaskState): DownloadTaskState {
  let bytesDone = 0;
  for (const f of task.files) {
    let fBytes = 0;
    for (const s of f.segments) {
      fBytes += s.bytesDone;
    }
    f.bytesDone = fBytes;
    bytesDone += fBytes;
  }

  const now = Date.now();
  const prev = speedSamples.get(task.id);
  let speedBps = task.speedBps;
  if (prev && now - prev.ts >= 800) {
    const dt = (now - prev.ts) / 1000;
    const db = Math.max(0, bytesDone - prev.bytes);
    const instant = db / dt;
    speedBps = speedBps > 0 ? speedBps * 0.65 + instant * 0.35 : instant;
    speedSamples.set(task.id, { ts: now, bytes: bytesDone });
  } else if (!prev) {
    speedSamples.set(task.id, { ts: now, bytes: bytesDone });
  }

  const remaining = Math.max(0, task.totalBytes - bytesDone);
  const etaSec = speedBps > 1024 ? remaining / speedBps : null;

  return {
    ...task,
    bytesDone,
    speedBps,
    etaSec,
  };
}

function countActiveGlobal(): number {
  return activeNativeTasks.size;
}

function countActiveForBundle(task: DownloadTaskState): number {
  let n = 0;
  for (const f of task.files) {
    for (const s of f.segments) {
      if (s.status === 'active') n++;
    }
  }
  return n;
}

function checkIdleForegroundService(): void {
  const all = Object.values(useDownloadsStore.getState().tasks);
  const anyActive = all.some(
    (t) =>
      t.status === 'downloading' ||
      t.status === 'assembling' ||
      t.status === 'verifying' ||
      t.status === 'retrying'
  );
  if (!anyActive) {
    void notificationService.stopForegroundServiceIfIdle();
  }
}

async function handleSegmentComplete(
  bundleId: string,
  fileIdx: number,
  segIdx: number
): Promise<void> {
  const nativeId = buildNativeTaskId(bundleId, fileIdx, segIdx);
  activeNativeTasks.delete(nativeId);

  const task = getTask(bundleId);
  if (!task || task.status === 'cancelled') return;

  const fileState = task.files[fileIdx];
  const seg = fileState?.segments[segIdx];
  if (!fileState || !seg) return;

  seg.status = 'done';
  seg.bytesDone = seg.end >= seg.start ? seg.end - seg.start + 1 : fileState.remote.sizeBytes;

  const allSegsDone = fileState.segments.every((s) => s.status === 'done');
  if (allSegsDone) {
    fileState.status = 'assembling';
    saveAndEmit(recalcBundleProgress({ ...task, status: 'assembling' }), true);
    void notificationService.showDownloadProgress(getTask(bundleId)!, true);

    try {
      await assembleDownloadedFile(fileState);
      fileState.status = 'verifying';
      saveAndEmit({ ...getTask(bundleId)!, status: 'verifying' }, true);
      void notificationService.showDownloadProgress(getTask(bundleId)!, true);

      const check = await verifyDownloadedFile(fileState);
      if (!check.ok) {
        deleteFileQuietly(fileState.destPath);
        fileState.status = 'error';
        const failedTask: DownloadTaskState = {
          ...getTask(bundleId)!,
          status: 'failed',
          error: {
            code: 'INTEGRITY_FAILED',
            message: check.reason ?? 'Checksum verification failed',
            retriable: true,
          },
        };
        saveAndEmit(failedTask, true);
        void notificationService.showDownloadFailed(failedTask);
        checkIdleForegroundService();
        return;
      }
      fileState.status = 'done';
    } catch (err) {
      fileState.status = 'error';
      const failedTask: DownloadTaskState = {
        ...getTask(bundleId)!,
        status: 'failed',
        error: {
          code: 'ASSEMBLY_FAILED',
          message: err instanceof Error ? err.message : 'Failed to assemble model file',
          retriable: true,
        },
      };
      saveAndEmit(failedTask, true);
      void notificationService.showDownloadFailed(failedTask);
      checkIdleForegroundService();
      return;
    }
  }

  const latest = getTask(bundleId);
  if (!latest) return;

  const allFilesDone = latest.files.every((f) => f.status === 'done');
  if (allFilesDone) {
    await finalizeInstalledBundle(latest);
  } else {
    const next = recalcBundleProgress({ ...latest, status: 'downloading' });
    saveAndEmit(next, true);
    pumpQueue();
  }
}

async function finalizeInstalledBundle(task: DownloadTaskState): Promise<void> {
  const installed: InstalledModel = {
    id: task.id,
    repoId: task.repoId,
    displayName: task.displayName,
    runtime: task.runtime,
    capabilities: task.capabilities,
    quant: task.quant,
    files: task.files.map((f) => ({
      ...f.remote,
      localPath: f.destPath,
      verified: true,
    })),
    totalBytes: task.totalBytes,
    contextLength: task.contextLength,
    parameterCount: task.parameterCount,
    architecture: task.architecture,
    installedAt: Date.now(),
  };

  await installedModelsRepo.upsert(installed);
  useModelsStore.getState().upsertInstalled(installed);

  // Auto-activate if user has no active model yet for this modality
  const appStore = useAppStore.getState();
  if (installed.capabilities.includes('text') && !appStore.activeModelId) {
    appStore.setActiveModelId(installed.id);
  } else if (installed.capabilities.includes('audio_stt') && !appStore.activeSttModelId) {
    appStore.setActiveSttModelId(installed.id);
  } else if (installed.capabilities.includes('voice_tts') && !appStore.activeTtsModelId) {
    appStore.setActiveTtsModelId(installed.id);
  }

  const doneTask: DownloadTaskState = {
    ...task,
    bytesDone: task.totalBytes,
    status: 'completed',
    speedBps: 0,
    etaSec: 0,
  };
  saveAndEmit(doneTask, true);
  speedSamples.delete(task.id);
  await notificationService.showDownloadComplete(doneTask);
  checkIdleForegroundService();
  pumpQueue();
}

function handleSegmentError(
  bundleId: string,
  fileIdx: number,
  segIdx: number,
  message: string
): void {
  const nativeId = buildNativeTaskId(bundleId, fileIdx, segIdx);
  activeNativeTasks.delete(nativeId);

  const task = getTask(bundleId);
  if (!task || task.status === 'cancelled' || task.status === 'paused_user') return;

  const seg = task.files[fileIdx]?.segments[segIdx];
  if (seg) {
    seg.status = 'pending';
    seg.bytesDone = getFileSizeQuietly(seg.tempPath);
  }

  const net = networkMonitor.getSnapshot();
  if (!net.isOnline) {
    const waiting: DownloadTaskState = {
      ...recalcBundleProgress(task),
      status: 'waiting_network',
      speedBps: 0,
      etaSec: null,
    };
    saveAndEmit(waiting, true);
    void notificationService.showDownloadProgress(waiting, true);
    return;
  }

  const nextAttempt = task.attempt + 1;
  if (nextAttempt > 6) {
    const failed: DownloadTaskState = {
      ...task,
      status: 'failed',
      speedBps: 0,
      etaSec: null,
      error: { code: 'NETWORK_ERROR', message, retriable: true },
    };
    saveAndEmit(failed, true);
    void notificationService.showDownloadFailed(failed);
    checkIdleForegroundService();
    return;
  }

  const delayMs = computeBackoffMs(nextAttempt);
  const retrying: DownloadTaskState = {
    ...recalcBundleProgress(task),
    status: 'retrying',
    attempt: nextAttempt,
    nextRetryAt: Date.now() + delayMs,
    speedBps: 0,
    etaSec: null,
  };
  saveAndEmit(retrying, true);
  void notificationService.showDownloadProgress(retrying, true);

  const existingTimer = retryTimers.get(bundleId);
  if (existingTimer) clearTimeout(existingTimer);
  retryTimers.set(
    bundleId,
    setTimeout(() => {
      retryTimers.delete(bundleId);
      const t = getTask(bundleId);
      if (t && t.status === 'retrying') {
        saveAndEmit({ ...t, status: 'downloading' }, true);
        pumpQueue();
      }
    }, delayMs)
  );
}

function attachNativeListeners(
  nativeTask: NativeDownloadTask,
  bundleId: string,
  fileIdx: number,
  segIdx: number
): void {
  nativeTask
    .begin(({ expectedBytes }) => {
      if (!expectedBytes || expectedBytes <= 0) return;
      const task = getTask(bundleId);
      if (!task || task.status === 'cancelled') return;
      const fileState = task.files[fileIdx];
      const seg = fileState?.segments[segIdx];
      if (!fileState || !seg) return;

      // Sync authoritative server Content-Length if catalog size was missing or estimated
      if (fileState.remote.sizeBytes <= 0 || Math.abs(fileState.remote.sizeBytes - expectedBytes) > 0) {
        fileState.remote.sizeBytes = expectedBytes;
        seg.end = expectedBytes - 1;
        const recalculatedTotal = task.files.reduce((sum, f) => sum + Math.max(0, f.remote.sizeBytes), 0);
        if (recalculatedTotal > 0) {
          saveAndEmit(recalcBundleProgress({ ...task, totalBytes: recalculatedTotal }), true);
        }
      }
    })
    .progress(({ bytesDownloaded, bytesTotal }) => {
      const task = getTask(bundleId);
      if (!task || task.status === 'cancelled' || task.status === 'paused_user') return;
      const fileState = task.files[fileIdx];
      const seg = fileState?.segments[segIdx];
      if (!fileState || !seg) return;

      if (fileState.remote.sizeBytes <= 0 && bytesTotal > 0) {
        fileState.remote.sizeBytes = bytesTotal;
        seg.end = bytesTotal - 1;
        task.totalBytes = task.files.reduce((sum, f) => sum + Math.max(0, f.remote.sizeBytes), 0);
      }

      const expected = fileState.remote.sizeBytes > 0 ? fileState.remote.sizeBytes : bytesTotal;
      if (isRunawayDownloadOverflow(bytesDownloaded, expected)) {
        const nativeId = buildNativeTaskId(bundleId, fileIdx, segIdx);
        void nativeTask.stop();
        activeNativeTasks.delete(nativeId);
        pausedNativeTasks.delete(nativeId);
        deleteFileQuietly(seg.tempPath);
        seg.bytesDone = 0;
        handleSegmentError(
          bundleId,
          fileIdx,
          segIdx,
          'Transfer exceeded expected model size — restarting cleanly'
        );
        return;
      }

      seg.bytesDone = clampSegmentBytes(bytesDownloaded, expected);
      const next = recalcBundleProgress({ ...task, status: 'downloading' });
      saveAndEmit(next, false);
      void notificationService.showDownloadProgress(next, false);
    })
    .done(() => {
      void handleSegmentComplete(bundleId, fileIdx, segIdx);
    })
    .error(({ error }) => {
      handleSegmentError(bundleId, fileIdx, segIdx, error || 'Transfer interrupted');
    });
}

function startSegment(
  task: DownloadTaskState,
  fileIdx: number,
  segIdx: number,
  fileState: DownloadFileState,
  seg: DownloadSegment
): void {
  const bg = getBgDownloader();
  if (!bg) {
    const failed: DownloadTaskState = {
      ...task,
      status: 'failed',
      error: {
        code: 'NO_NATIVE_DOWNLOADER',
        message: 'Background downloader requires an Expo Dev Build.',
        retriable: false,
      },
    };
    saveAndEmit(failed, true);
    return;
  }

  ensureDirectory(getDownloadsTempDir());
  const nativeId = buildNativeTaskId(task.id, fileIdx, segIdx);

  // If we have a paused native task handle, resume it natively to keep byte-range progress
  const pausedHandle = pausedNativeTasks.get(nativeId);
  if (pausedHandle) {
    pausedNativeTasks.delete(nativeId);
    seg.nativeTaskId = nativeId;
    seg.status = 'active';
    activeNativeTasks.set(nativeId, pausedHandle);
    void Promise.resolve(pausedHandle.resume()).catch(() => {
      activeNativeTasks.delete(nativeId);
      seg.status = 'pending';
      pumpQueue();
    });
    return;
  }

  // Guard against stale oversized .part files left over from prior interrupted transfers
  const existingSize = getFileSizeQuietly(seg.tempPath);
  if (fileState.remote.sizeBytes > 0 && existingSize > fileState.remote.sizeBytes) {
    deleteFileQuietly(seg.tempPath);
    seg.bytesDone = 0;
  }

  seg.nativeTaskId = nativeId;
  seg.status = 'active';

  // Do NOT pass a manual Range header: react-native-background-downloader v5 natively manages
  // HTTP Range resume (ResumableDownloader.kt on Android / NSURLSession resumeData on iOS).
  const headers: Record<string, string> = {
    'User-Agent': 'AuraOS/1.0 (offline-first-mobile)',
  };

  const nativeTask = bg.createDownloadTask({
    id: nativeId,
    url: fileState.url,
    destination: seg.tempPath.replace(/^file:\/\//, ''),
    headers,
    maxRedirects: 5,
  });

  activeNativeTasks.set(nativeId, nativeTask);
  attachNativeListeners(nativeTask, task.id, fileIdx, segIdx);
  void nativeTask.start();
}

function pumpQueue(): void {
  const net = networkMonitor.getSnapshot();
  const tasks = Object.values(useDownloadsStore.getState().tasks).sort(
    (a, b) => a.createdAt - b.createdAt
  );

  const limits = getEffectiveMaxConcurrent();
  for (const task of tasks) {
    if (countActiveGlobal() >= limits.global) break;
    if (task.status !== 'queued' && task.status !== 'downloading') continue;

    if (!net.isOnline) {
      saveAndEmit({ ...task, status: 'waiting_network', speedBps: 0, etaSec: null }, true);
      void notificationService.showDownloadProgress(getTask(task.id)!, true);
      continue;
    }

    if (task.policy.wifiOnly && !net.isWifi) {
      saveAndEmit({ ...task, status: 'waiting_wifi', speedBps: 0, etaSec: null }, true);
      void notificationService.showDownloadProgress(getTask(task.id)!, true);
      continue;
    }

    if (task.status === 'queued') {
      saveAndEmit({ ...task, status: 'downloading' }, true);
    }

    for (let fIdx = 0; fIdx < task.files.length; fIdx++) {
      const f = task.files[fIdx];
      if (f.status === 'done' || f.status === 'assembling' || f.status === 'verifying') continue;
      f.status = 'active';
      for (let sIdx = 0; sIdx < f.segments.length; sIdx++) {
        if (countActiveGlobal() >= limits.global) break;
        if (countActiveForBundle(task) >= limits.perBundle) break;
        const seg = f.segments[sIdx];
        if (seg.status === 'pending') {
          startSegment(task, fIdx, sIdx, f, seg);
        }
      }
    }
  }
}

async function reconcileForegroundDownloads(): Promise<void> {
  const bg = getBgDownloader();
  const tasks = Object.values(useDownloadsStore.getState().tasks);
  if (tasks.length === 0) return;

  let existingById = new Map<string, NativeDownloadTask>();
  if (bg) {
    try {
      const existing = await bg.getExistingDownloadTasks();
      existingById = new Map(existing.map((t) => [t.id, t]));
    } catch {
      // Fall back to on-disk reconciliation
    }
  }

  for (const task of tasks) {
    if (task.status === 'completed' || task.status === 'cancelled') continue;
    let changed = false;

    for (let fIdx = 0; fIdx < task.files.length; fIdx++) {
      const f = task.files[fIdx];
      if (f.status === 'done' || f.status === 'assembling' || f.status === 'verifying') continue;
      for (let sIdx = 0; sIdx < f.segments.length; sIdx++) {
        const seg = f.segments[sIdx];
        if (seg.status === 'done') continue;
        const nativeId = buildNativeTaskId(task.id, fIdx, sIdx);
        const live = existingById.get(nativeId);

        if (live && !activeNativeTasks.has(nativeId) && !pausedNativeTasks.has(nativeId)) {
          seg.status = 'active';
          activeNativeTasks.set(nativeId, live);
          attachNativeListeners(live, task.id, fIdx, sIdx);
          changed = true;
        }

        const diskBytes = getFileSizeQuietly(seg.tempPath);
        const clampedDisk = clampSegmentBytes(diskBytes, f.remote.sizeBytes);
        if (clampedDisk > seg.bytesDone) {
          seg.bytesDone = clampedDisk;
          changed = true;
        }
      }
    }

    if (changed) {
      saveAndEmit(recalcBundleProgress(task), true);
    }
  }
}

export const downloadService = {
  async init(): Promise<void> {
    if (initialized) return;
    initialized = true;

    const bg = getBgDownloader();
    bg?.setConfig?.({ progressInterval: 1000, isLogsEnabled: false });

    const net = await networkMonitor.start();
    useDownloadsStore.getState().setNetworkState(net.isOnline, net.isWifi);

    networkMonitor.subscribe((snap) => {
      useDownloadsStore.getState().setNetworkState(snap.isOnline, snap.isWifi);
      const tasks = Object.values(useDownloadsStore.getState().tasks);
      if (snap.isOnline) {
        for (const t of tasks) {
          if (
            t.status === 'waiting_network' ||
            (t.status === 'waiting_wifi' && snap.isWifi)
          ) {
            saveAndEmit({ ...t, status: 'downloading', attempt: 0 }, true);
          }
        }
        pumpQueue();
      } else {
        for (const t of tasks) {
          if (t.status === 'downloading') {
            saveAndEmit({ ...t, status: 'waiting_network', speedBps: 0, etaSec: null }, true);
            void notificationService.showDownloadProgress(getTask(t.id)!, true);
          }
        }
      }
    });

    setNotificationActionHandler((action, bundleId) => {
      if (action === 'pause') void downloadService.pause(bundleId);
      else if (action === 'resume') void downloadService.resume(bundleId);
      else if (action === 'cancel') void downloadService.cancel(bundleId);
    });

    // Reconcile progress & notifications cleanly across background/foreground transitions
    AppState.addEventListener('change', (nextState) => {
      const allTasks = Object.values(useDownloadsStore.getState().tasks);
      if (nextState === 'background' || nextState === 'inactive') {
        const active = allTasks.filter(
          (t) =>
            t.status === 'downloading' ||
            t.status === 'queued' ||
            t.status === 'assembling' ||
            t.status === 'verifying' ||
            t.status === 'waiting_network' ||
            t.status === 'waiting_wifi'
        );
        for (const t of active) {
          downloadQueue.upsert(t);
          void notificationService.showDownloadProgress(t, true, { alertBanner: true });
        }
      } else if (nextState === 'active') {
        void reconcileForegroundDownloads();
      }
    });

    // Hydrate persisted queue, migrate any legacy multi-segment tasks, and sweep orphaned .part files
    const rawPersisted = downloadQueue.load();
    const persisted = rawPersisted.map((task) => {
      if (task.status === 'completed' || task.status === 'cancelled') return task;
      const hasLegacyMultiSegments = task.files.some((f) => f.segments.length > 1);
      if (!hasLegacyMultiSegments) return task;

      // Clean up corrupt/legacy 256MB segments and migrate cleanly to single native resumable file
      cleanupBundleTemps(task);
      const migratedFiles: DownloadFileState[] = task.files.map((f, idx) => ({
        ...f,
        segments: planFileSegments(task.id, idx, f.remote.sizeBytes),
        bytesDone: 0,
        status: 'pending',
      }));
      const migrated: DownloadTaskState = {
        ...task,
        files: migratedFiles,
        bytesDone: 0,
        speedBps: 0,
        etaSec: null,
        status: task.status === 'paused_user' ? 'paused_user' : 'queued',
      };
      downloadQueue.upsert(migrated);
      return migrated;
    });

    useDownloadsStore.getState().setAllTasks(persisted);
    sweepOrphanedTempFiles(persisted);

    // Re-attach to any OS background transfers still alive across app kill/relaunch
    if (bg) {
      try {
        const existing = await bg.getExistingDownloadTasks();
        const existingById = new Map(existing.map((t) => [t.id, t]));

        for (const task of persisted) {
          if (task.status === 'completed' || task.status === 'cancelled') continue;
          let anyReattached = false;

          for (let fIdx = 0; fIdx < task.files.length; fIdx++) {
            const f = task.files[fIdx];
            if (f.status === 'done') continue;
            for (let sIdx = 0; sIdx < f.segments.length; sIdx++) {
              const seg = f.segments[sIdx];
              if (seg.status === 'done') continue;
              const nativeId = buildNativeTaskId(task.id, fIdx, sIdx);
              const live = existingById.get(nativeId);
              if (live) {
                seg.status = 'active';
                activeNativeTasks.set(nativeId, live);
                attachNativeListeners(live, task.id, fIdx, sIdx);
                anyReattached = true;
              } else if (seg.status === 'active') {
                // Transfer was killed by iOS force-quit — mark pending to auto-resume segment
                seg.status = 'pending';
                seg.bytesDone = 0;
              }
            }
          }

          if (!anyReattached && task.status === 'downloading') {
            saveAndEmit({ ...task, status: 'queued' }, true);
          } else {
            saveAndEmit(task, true);
          }
        }
      } catch {
        // Fallback: resume via pumpQueue
      }
    }

    pumpQueue();
  },

  async enqueueModelBundle(
    model: DiscoveredModel,
    variant: QuantVariant,
    options: { overrideWifiOnly?: boolean } = {}
  ): Promise<{ ok: boolean; bundleId: string; error?: string }> {
    const bundleId = `${model.id}::${variant.quant}`;
    const existing = getTask(bundleId);
    if (
      existing &&
      existing.status !== 'failed' &&
      existing.status !== 'cancelled' &&
      existing.status !== 'completed'
    ) {
      if (existing.status === 'paused_user' || existing.status === 'waiting_wifi') {
        await this.resume(bundleId, options.overrideWifiOnly);
      }
      return { ok: true, bundleId };
    }

    // Request notification permission BEFORE posting the initial download notification
    await notificationService.ensurePermission();

    // Disk space pre-check (weights + 5% safety + 256MB assembly buffer if segmented)
    const freeDisk = Paths.availableDiskSpace ?? 0;
    const neededDisk = Math.round(
      variant.totalBytes * 1.05 + (variant.totalBytes > 256 * 1024 * 1024 ? 256 * 1024 * 1024 : 0)
    );
    if (freeDisk > 0 && neededDisk > freeDisk) {
      const shortfall = formatBytes(neededDisk - freeDisk);
      return {
        ok: false,
        bundleId,
        error: `Not enough free storage. Need ${shortfall} more space before downloading.`,
      };
    }

    const files: DownloadFileState[] = variant.files.map((remote, idx) => ({
      remote,
      url: buildHfResolveUrl(model.id, remote.path),
      destPath: getModelFilePath(model.id, variant.quant, remote.path),
      segments: planFileSegments(bundleId, idx, remote.sizeBytes),
      bytesDone: 0,
      status: 'pending',
    }));

    const wifiOnly =
      options.overrideWifiOnly === true
        ? false
        : useAppStore.getState().preferences.wifiOnlyDownloads;

    const task: DownloadTaskState = {
      id: bundleId,
      repoId: model.id,
      quant: variant.quant,
      displayName: model.displayName,
      runtime: model.runtime,
      capabilities: model.capabilities,
      contextLength: model.contextLength,
      parameterCount: model.parameterCount,
      architecture: model.architecture,
      files,
      totalBytes: variant.totalBytes,
      bytesDone: 0,
      status: 'queued',
      speedBps: 0,
      etaSec: null,
      attempt: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      policy: { wifiOnly },
    };

    saveAndEmit(task, true);
    void notificationService.showDownloadProgress(task, true, { alertBanner: true });
    pumpQueue();
    return { ok: true, bundleId };
  },

  async pause(bundleId: string): Promise<void> {
    const task = getTask(bundleId);
    if (!task) return;

    const timer = retryTimers.get(bundleId);
    if (timer) {
      clearTimeout(timer);
      retryTimers.delete(bundleId);
    }

    for (let fIdx = 0; fIdx < task.files.length; fIdx++) {
      for (let sIdx = 0; sIdx < task.files[fIdx].segments.length; sIdx++) {
        const seg = task.files[fIdx].segments[sIdx];
        const nativeId = buildNativeTaskId(bundleId, fIdx, sIdx);
        const live = activeNativeTasks.get(nativeId);
        if (live) {
          activeNativeTasks.delete(nativeId);
          try {
            await live.pause();
            pausedNativeTasks.set(nativeId, live);
          } catch {
            try {
              await live.stop();
            } catch {
              // ignore
            }
          }
          seg.status = 'pending';
        }
      }
    }

    const paused: DownloadTaskState = {
      ...task,
      status: 'paused_user',
      speedBps: 0,
      etaSec: null,
    };
    saveAndEmit(paused, true);
    await notificationService.showDownloadProgress(paused, true);
    checkIdleForegroundService();
  },

  async resume(bundleId: string, overrideWifiOnly = false): Promise<void> {
    const task = getTask(bundleId);
    if (!task) return;

    const next: DownloadTaskState = {
      ...task,
      status: 'queued',
      attempt: 0,
      error: undefined,
      policy: overrideWifiOnly ? { wifiOnly: false } : task.policy,
    };
    saveAndEmit(next, true);
    pumpQueue();
  },

  async cancel(bundleId: string): Promise<void> {
    const task = getTask(bundleId);
    if (!task) return;

    const timer = retryTimers.get(bundleId);
    if (timer) {
      clearTimeout(timer);
      retryTimers.delete(bundleId);
    }

    for (let fIdx = 0; fIdx < task.files.length; fIdx++) {
      for (let sIdx = 0; sIdx < task.files[fIdx].segments.length; sIdx++) {
        const nativeId = buildNativeTaskId(bundleId, fIdx, sIdx);
        const live = activeNativeTasks.get(nativeId) ?? pausedNativeTasks.get(nativeId);
        if (live) {
          try {
            await live.stop();
          } catch {
            // ignore
          }
          activeNativeTasks.delete(nativeId);
          pausedNativeTasks.delete(nativeId);
        }
      }
    }

    cleanupBundleTemps(task);
    speedSamples.delete(bundleId);
    downloadQueue.remove(bundleId);
    useDownloadsStore.getState().removeTask(bundleId);
    await notificationService.dismissDownload(bundleId);
    checkIdleForegroundService();
    pumpQueue();
  },
};
