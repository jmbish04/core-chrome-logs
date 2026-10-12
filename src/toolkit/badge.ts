/**
 * Badge toolkit adapted from @theluckystrike/webext-badge
 * Type-safe badge manipulation for Chrome Manifest V3 extensions.
 */

export type BadgeColor = string | [number, number, number, number];

export interface BadgeState {
  text: string;
  backgroundColor: BadgeColor;
  textColor?: BadgeColor;
}

export const COLORS = {
  red: "#F44336",
  green: "#4CAF50",
  blue: "#2196F3",
  orange: "#FF9800",
  purple: "#9C27B0",
  gray: "#9E9E9E",
  black: "#000000",
  white: "#FFFFFF",
} as const;

export type ColorName = keyof typeof COLORS;

export async function setBadgeText(text: string, tabId?: number): Promise<void> {
  const details: chrome.action.BadgeTextDetails = { text };
  if (tabId !== undefined) details.tabId = tabId;
  await chrome.action.setBadgeText(details);
}

export async function getBadgeText(tabId?: number): Promise<string> {
  const details: chrome.action.TabDetails = {};
  if (tabId !== undefined) details.tabId = tabId;
  return chrome.action.getBadgeText(details);
}

export async function setBadgeColor(color: BadgeColor | ColorName, tabId?: number): Promise<void> {
  const resolved =
    typeof color === "string" && color in COLORS ? COLORS[color as ColorName] : color;
  const details: chrome.action.BadgeColorDetails = { color: resolved as any };
  if (tabId !== undefined) details.tabId = tabId;
  await chrome.action.setBadgeBackgroundColor(details);
}

export async function getBadgeColor(tabId?: number): Promise<BadgeColor> {
  const details: chrome.action.TabDetails = {};
  if (tabId !== undefined) details.tabId = tabId;
  return chrome.action.getBadgeBackgroundColor(details) as Promise<BadgeColor>;
}

export async function setBadgeTextColor(
  color: BadgeColor | ColorName,
  tabId?: number
): Promise<void> {
  const resolved =
    typeof color === "string" && color in COLORS ? COLORS[color as ColorName] : color;
  const details: chrome.action.BadgeColorDetails = { color: resolved as any };
  if (tabId !== undefined) details.tabId = tabId;
  await chrome.action.setBadgeTextColor(details);
}

export async function setBadge(
  text: string,
  color: BadgeColor | ColorName,
  tabId?: number
): Promise<void> {
  await Promise.all([setBadgeText(text, tabId), setBadgeColor(color, tabId)]);
}

export async function clearBadge(tabId?: number): Promise<void> {
  await setBadgeText("", tabId);
}

export async function showCount(count: number, tabId?: number): Promise<void> {
  const text = count > 999 ? "999+" : count > 0 ? String(count) : "";
  const color = count > 0 ? COLORS.red : COLORS.gray;
  await setBadge(text, color, tabId);
}

export async function showStatus(
  status: "success" | "error" | "warning" | "info",
  text?: string,
  tabId?: number
): Promise<void> {
  const colorMap: Record<string, string> = {
    success: COLORS.green,
    error: COLORS.red,
    warning: COLORS.orange,
    info: COLORS.blue,
  };
  const textMap: Record<string, string> = {
    success: "OK",
    error: "ERR",
    warning: "!",
    info: "i",
  };
  await setBadge(text ?? textMap[status], colorMap[status], tabId);
}

export async function flashBadge(
  text: string,
  color: BadgeColor | ColorName,
  durationMs = 3000,
  tabId?: number
): Promise<void> {
  await setBadge(text, color, tabId);
  return new Promise((resolve) => {
    setTimeout(async () => {
      await clearBadge(tabId);
      resolve();
    }, durationMs);
  });
}
