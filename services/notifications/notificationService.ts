import { AppState, Platform } from 'react-native';

import { formatBytes, formatEta, formatSpeed } from '@/lib/format';
import type { DownloadTaskState } from '@/lib/types';
import { useAppStore } from '@/store/app.store';
import { dispatchNotificationEvent } from './actions';
import { NOTIFICATION_ACTIONS, NOTIFICATION_CHANNELS } from './channels';

function areNotificationsEnabled(): boolean {
  return useAppStore.getState().preferences.notificationsEnabled !== false;
}

type NotifyKitModule = typeof import('react-native-notify-kit');

let notifyKitCache: NotifyKitModule | null | undefined;
let channelsCreated = false;
let foregroundUnsub: (() => void) | null = null;
let fgsResolve: (() => void) | null = null;
let fgsActive = false;

const lastProgressPush = new Map<string, number>();
const PROGRESS_THROTTLE_MS = 1500;

function getNotifyKit(): NotifyKitModule | null {
  if (notifyKitCache !== undefined) return notifyKitCache;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    notifyKitCache = require('react-native-notify-kit') as NotifyKitModule;
  } catch {
    notifyKitCache = null;
  }
  return notifyKitCache;
}

/**
 * Must be called at module top-level (app/_layout.tsx) so Android/iOS background
 * notification actions and foreground service runners are registered before headless events fire.
 */
export function registerBackgroundNotificationHandlers(): void {
  const nk = getNotifyKit();
  if (!nk) return;
  const notifee = nk.default;

  try {
    notifee.registerForegroundService(() => {
      return new Promise<void>((resolve) => {
        fgsResolve = resolve;
      });
    });

    notifee.onBackgroundEvent(async ({ type, detail }) => {
      dispatchNotificationEvent(type, detail as never, {
        ACTION_PRESS: nk.EventType.ACTION_PRESS,
        PRESS: nk.EventType.PRESS,
      });
    });
  } catch {
    // Safe fallback if native module is unavailable
  }
}

export const notificationService = {
  async init(): Promise<void> {
    const nk = getNotifyKit();
    if (!nk) return;
    const notifee = nk.default;

    if (!channelsCreated) {
      if (Platform.OS === 'android') {
        await notifee.createChannel({
          id: NOTIFICATION_CHANNELS.DOWNLOADS_PROGRESS,
          name: 'Model Downloads',
          description: 'Silent ongoing progress for background AI model downloads',
          importance: nk.AndroidImportance.LOW,
          sound: undefined,
          vibration: false,
        });
        await notifee.createChannel({
          id: NOTIFICATION_CHANNELS.DOWNLOADS_COMPLETE,
          name: 'Download Alerts',
          description: 'Completion and error alerts for AI model downloads',
          importance: nk.AndroidImportance.DEFAULT,
        });
      } else if (Platform.OS === 'ios') {
        await notifee.setNotificationCategories([
          {
            id: 'aura-download-active',
            actions: [
              { id: NOTIFICATION_ACTIONS.PAUSE, title: 'Pause' },
              { id: NOTIFICATION_ACTIONS.CANCEL, title: 'Cancel', destructive: true },
            ],
          },
          {
            id: 'aura-download-paused',
            actions: [
              { id: NOTIFICATION_ACTIONS.RESUME, title: 'Resume' },
              { id: NOTIFICATION_ACTIONS.CANCEL, title: 'Cancel', destructive: true },
            ],
          },
        ]);
      }
      channelsCreated = true;
    }

    if (!foregroundUnsub) {
      foregroundUnsub = notifee.onForegroundEvent(({ type, detail }) => {
        dispatchNotificationEvent(type, detail as never, {
          ACTION_PRESS: nk.EventType.ACTION_PRESS,
          PRESS: nk.EventType.PRESS,
        });
      });
    }
  },

  async ensurePermission(): Promise<boolean> {
    const nk = getNotifyKit();
    if (!nk) return false;
    try {
      const settings = await nk.default.requestPermission({
        alert: true,
        sound: true,
        badge: true,
      });
      return settings.authorizationStatus >= nk.AuthorizationStatus.AUTHORIZED;
    } catch {
      return false;
    }
  },

  async showDownloadProgress(
    task: DownloadTaskState,
    force = false,
    options: { alertBanner?: boolean } = {}
  ): Promise<void> {
    if (!areNotificationsEnabled()) return;
    const nk = getNotifyKit();
    if (!nk) return;

    const now = Date.now();
    const last = lastProgressPush.get(task.id) ?? 0;
    if (!force && now - last < PROGRESS_THROTTLE_MS) return;
    lastProgressPush.set(task.id, now);

    const pct =
      task.totalBytes > 0 ? Math.min(100, Math.round((task.bytesDone / task.totalBytes) * 100)) : 0;

    let body = `${formatBytes(task.bytesDone)} / ${formatBytes(task.totalBytes)}`;
    if (task.status === 'downloading' || task.status === 'queued') {
      body = `Downloading in background · ${pct}% · ${body}${
        task.speedBps > 0 ? ` · ${formatSpeed(task.speedBps)} · ${formatEta(task.etaSec)}` : ''
      }`;
    } else if (task.status === 'waiting_network') {
      body = `Waiting for network · ${pct}% (${formatBytes(task.bytesDone)})`;
    } else if (task.status === 'waiting_wifi') {
      body = `Waiting for Wi-Fi · ${pct}%`;
    } else if (task.status === 'paused_user') {
      body = `Paused · ${pct}% (${formatBytes(task.bytesDone)})`;
    } else if (task.status === 'assembling') {
      body = 'Assembling downloaded segments…';
    } else if (task.status === 'verifying') {
      body = 'Verifying SHA-256 checksum…';
    } else if (task.status === 'retrying') {
      body = `Reconnecting (attempt ${task.attempt})…`;
    }

    const isPaused = task.status === 'paused_user' || task.status === 'waiting_wifi';
    const isOngoing =
      task.status === 'queued' ||
      task.status === 'downloading' ||
      task.status === 'assembling' ||
      task.status === 'verifying' ||
      task.status === 'retrying';

    const isAppForeground = AppState.currentState === 'active';
    // Android 12-15 throws ForegroundServiceStartNotAllowedException if asForegroundService=true
    // is passed from background or re-triggered repeatedly. Start FGS once in foreground only.
    const shouldStartFgs = Platform.OS === 'android' && isOngoing && !fgsActive && isAppForeground;
    if (shouldStartFgs) {
      fgsActive = true;
    }

    try {
      await nk.default.displayNotification({
        id: task.id,
        title: `${task.displayName} (${task.quant})`,
        body,
        data: {
          bundleId: task.id,
          url: `aura-os://models?highlight=${encodeURIComponent(task.id)}`,
        },
        android: {
          channelId: NOTIFICATION_CHANNELS.DOWNLOADS_PROGRESS,
          ongoing: isOngoing,
          onlyAlertOnce: true,
          asForegroundService: shouldStartFgs,
          pressAction: { id: 'default' },
          progress: {
            max: 100,
            current: pct,
            indeterminate:
              task.status === 'queued' ||
              task.status === 'assembling' ||
              task.status === 'verifying',
          },
          actions: [
            {
              title: isPaused ? 'Resume' : 'Pause',
              pressAction: {
                id: isPaused ? NOTIFICATION_ACTIONS.RESUME : NOTIFICATION_ACTIONS.PAUSE,
              },
            },
            {
              title: 'Cancel',
              pressAction: { id: NOTIFICATION_ACTIONS.CANCEL },
            },
          ],
        },
        ios: {
          categoryId: isPaused ? 'aura-download-paused' : 'aura-download-active',
          interruptionLevel: options.alertBanner ? 'active' : 'passive',
          foregroundPresentationOptions: {
            banner: Boolean(options.alertBanner),
            list: true,
            badge: true,
            sound: false,
          },
        },
      });
    } catch {
      // Non-fatal if notification permission was denied
    }
  },

  async showDownloadComplete(task: DownloadTaskState): Promise<void> {
    if (!areNotificationsEnabled()) return;
    const nk = getNotifyKit();
    if (!nk) return;
    lastProgressPush.delete(task.id);
    try {
      await nk.default.cancelNotification(task.id);
      await nk.default.displayNotification({
        id: `${task.id}-done`,
        title: `${task.displayName} Ready Offline`,
        body: `${task.quant} (${formatBytes(task.totalBytes)}) verified and installed.`,
        data: {
          bundleId: task.id,
          url: `aura-os://models?highlight=${encodeURIComponent(task.id)}`,
        },
        android: {
          channelId: NOTIFICATION_CHANNELS.DOWNLOADS_COMPLETE,
          pressAction: { id: 'default' },
        },
        ios: {
          interruptionLevel: 'active',
          foregroundPresentationOptions: {
            banner: true,
            list: true,
            badge: true,
            sound: true,
          },
        },
      });
    } catch {
      // ignore
    }
  },

  async showDownloadFailed(task: DownloadTaskState): Promise<void> {
    if (!areNotificationsEnabled()) return;
    const nk = getNotifyKit();
    if (!nk) return;
    lastProgressPush.delete(task.id);
    try {
      await nk.default.cancelNotification(task.id);
      await nk.default.displayNotification({
        id: `${task.id}-err`,
        title: `Download Failed: ${task.displayName}`,
        body: task.error?.message ?? 'Tap to retry in Models Vault.',
        data: {
          bundleId: task.id,
          url: `aura-os://models?highlight=${encodeURIComponent(task.id)}`,
        },
        android: {
          channelId: NOTIFICATION_CHANNELS.DOWNLOADS_COMPLETE,
          pressAction: { id: 'default' },
        },
        ios: {
          interruptionLevel: 'active',
          foregroundPresentationOptions: {
            banner: true,
            list: true,
            badge: true,
            sound: true,
          },
        },
      });
    } catch {
      // ignore
    }
  },

  async dismissDownload(bundleId: string): Promise<void> {
    const nk = getNotifyKit();
    if (!nk) return;
    lastProgressPush.delete(bundleId);
    try {
      await nk.default.cancelNotification(bundleId);
    } catch {
      // ignore
    }
  },

  async stopForegroundServiceIfIdle(): Promise<void> {
    if (!fgsActive) return;
    fgsActive = false;
    const nk = getNotifyKit();
    if (fgsResolve) {
      fgsResolve();
      fgsResolve = null;
    }
    if (nk && Platform.OS === 'android') {
      try {
        await nk.default.stopForegroundService();
      } catch {
        // ignore
      }
    }
  },
};
