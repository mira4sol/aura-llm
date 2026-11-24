import { NOTIFICATION_ACTIONS } from './channels';

export type NotificationActionHandler = (action: 'pause' | 'resume' | 'cancel', bundleId: string) => void;
export type NotificationOpenHandler = (bundleId?: string) => void;

let actionHandler: NotificationActionHandler | null = null;
let openHandler: NotificationOpenHandler | null = null;

export function setNotificationActionHandler(handler: NotificationActionHandler): void {
  actionHandler = handler;
}

export function setNotificationOpenHandler(handler: NotificationOpenHandler): void {
  openHandler = handler;
}

export function dispatchNotificationEvent(
  eventType: number,
  detail: {
    notification?: { id?: string; data?: Record<string, unknown> };
    pressAction?: { id?: string };
  },
  eventTypes: { ACTION_PRESS: number; PRESS: number }
): void {
  const bundleId =
    typeof detail.notification?.data?.bundleId === 'string'
      ? detail.notification.data.bundleId
      : detail.notification?.id;

  if (eventType === eventTypes.ACTION_PRESS && bundleId) {
    const actionId = detail.pressAction?.id;
    if (actionId === NOTIFICATION_ACTIONS.PAUSE) {
      actionHandler?.('pause', bundleId);
    } else if (actionId === NOTIFICATION_ACTIONS.RESUME) {
      actionHandler?.('resume', bundleId);
    } else if (actionId === NOTIFICATION_ACTIONS.CANCEL) {
      actionHandler?.('cancel', bundleId);
    }
    return;
  }

  if (eventType === eventTypes.PRESS) {
    openHandler?.(bundleId);
  }
}
