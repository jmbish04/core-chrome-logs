/**
 * Notifications toolkit adapted from @theluckystrike/webext-notifications
 * Promise-based typed notifications with action button and click dispatching.
 */

export type NotificationType = "basic" | "image" | "list" | "progress";

export interface NotificationButton {
  title: string;
  iconUrl?: string;
}

export interface NotificationItem {
  title: string;
  message: string;
}

export interface NotifyOptions {
  type: NotificationType;
  title: string;
  message: string;
  iconUrl: string;
  contextMessage?: string;
  priority?: 0 | 1 | 2;
  buttons?: NotificationButton[];
  imageUrl?: string;
  items?: NotificationItem[];
  progress?: number;
  silent?: boolean;
  requireInteraction?: boolean;
}

export type ClickHandler = (notificationId: string) => void;
export type ButtonClickHandler = (notificationId: string, buttonIndex: number) => void;
export type CloseHandler = (notificationId: string, byUser: boolean) => void;

interface HandlerSet {
  onClick?: ClickHandler;
  onButtonClick?: ButtonClickHandler;
  onClose?: CloseHandler;
}

const handlers: Map<string, HandlerSet> = new Map();
let listenersAttached = false;

function attachListeners(): void {
  if (listenersAttached) return;
  listenersAttached = true;

  chrome.notifications.onClicked.addListener((id) => {
    handlers.get(id)?.onClick?.(id);
  });

  chrome.notifications.onButtonClicked.addListener((id, buttonIndex) => {
    handlers.get(id)?.onButtonClick?.(id, buttonIndex);
  });

  chrome.notifications.onClosed.addListener((id, byUser) => {
    handlers.get(id)?.onClose?.(id, byUser);
    handlers.delete(id);
  });
}

export function notify(
  id: string,
  options: NotifyOptions,
  eventHandlers?: Partial<HandlerSet>
): Promise<string> {
  attachListeners();

  if (eventHandlers) {
    handlers.set(id, eventHandlers);
  }

  return new Promise((resolve, reject) => {
    chrome.notifications.create(id, options as any, (notificationId: string) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(notificationId);
      }
    });
  });
}

export function notifyBasic(
  id: string,
  title: string,
  message: string,
  iconUrl = "icons/icon-128.png",
  eventHandlers?: Partial<HandlerSet>
): Promise<string> {
  return notify(id, { type: "basic", title, message, iconUrl }, eventHandlers);
}

export function notifyProgress(
  id: string,
  title: string,
  message: string,
  iconUrl = "icons/icon-128.png",
  progress = 0
): Promise<string> {
  return notify(id, { type: "progress", title, message, iconUrl, progress });
}

export function updateNotification(
  id: string,
  options: Partial<NotifyOptions>
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    chrome.notifications.update(id, options as any, (wasUpdated: boolean) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(wasUpdated);
      }
    });
  });
}

export function clearNotification(id: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    chrome.notifications.clear(id, (wasCleared) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        handlers.delete(id);
        resolve(wasCleared);
      }
    });
  });
}

export function clearAllHandlers(): void {
  handlers.clear();
}
