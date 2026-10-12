/**
 * Offscreen toolkit adapted from @theluckystrike/webext-offscreen
 * Manages offscreen documents in Chrome MV3 for background DOM, clipboard, audio, and workers.
 */

export type OffscreenReason =
  | "TESTING"
  | "AUDIO_PLAYBACK"
  | "BLOBS"
  | "CLIPBOARD"
  | "DOM_PARSER"
  | "DOM_SCRAPING"
  | "GEOLOCATION"
  | "LOCAL_STORAGE"
  | "MATCH_MEDIA"
  | "WORKERS";

export interface OffscreenConfig {
  url: string;
  reasons: OffscreenReason[];
  justification: string;
}

export interface OffscreenMessage<T = unknown> {
  target: "offscreen";
  type: string;
  data: T;
}

export interface OffscreenResponse<T = unknown> {
  type: string;
  data: T;
}

type MessageHandler<TIn = any, TOut = any> = (data: TIn) => TOut | Promise<TOut>;

const messageHandlers: Map<string, MessageHandler> = new Map();
let creating: Promise<void> | null = null;

export async function ensureOffscreen(config: OffscreenConfig): Promise<void> {
  if (!chrome.offscreen) return;
  const existing = await hasOffscreen();
  if (existing) return;

  if (creating) {
    await creating;
    return;
  }

  creating = chrome.offscreen.createDocument({
    url: config.url,
    reasons: config.reasons as chrome.offscreen.Reason[],
    justification: config.justification,
  });

  await creating;
  creating = null;
}

export async function hasOffscreen(): Promise<boolean> {
  if (!chrome.runtime.getContexts) return false;
  try {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ["OFFSCREEN_DOCUMENT" as chrome.runtime.ContextType],
    });
    return contexts.length > 0;
  } catch {
    return false;
  }
}

export async function closeOffscreen(): Promise<void> {
  if (!chrome.offscreen) return;
  const existing = await hasOffscreen();
  if (existing) {
    await chrome.offscreen.closeDocument();
  }
}

export async function sendToOffscreen<TIn = unknown, TOut = unknown>(
  type: string,
  data: TIn
): Promise<TOut> {
  const message: OffscreenMessage<TIn> = { target: "offscreen", type, data };
  return chrome.runtime.sendMessage(message);
}

export function onOffscreenMessage<TIn = unknown, TOut = unknown>(
  type: string,
  handler: MessageHandler<TIn, TOut>
): void {
  messageHandlers.set(type, handler);
}

export function setupOffscreenListener(): void {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.target !== "offscreen") return false;

    const handler = messageHandlers.get(message.type);
    if (!handler) return false;

    const result = handler(message.data);
    if (result instanceof Promise) {
      result
        .then(sendResponse)
        .catch((err: Error) => sendResponse({ error: err.message }));
      return true;
    }

    sendResponse(result);
    return false;
  });
}

export function createOffscreenHelper(config: OffscreenConfig) {
  return {
    ensure: () => ensureOffscreen(config),
    close: () => closeOffscreen(),
    isActive: () => hasOffscreen(),
    send: <TIn, TOut>(type: string, data: TIn) => sendToOffscreen<TIn, TOut>(type, data),
  };
}

export function removeOffscreenHandler(type: string): boolean {
  return messageHandlers.delete(type);
}

export function clearOffscreenHandlers(): void {
  messageHandlers.clear();
}
