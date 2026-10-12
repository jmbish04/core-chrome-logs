/**
 * Tabs toolkit adapted from @theluckystrike/webext-tabs
 * Promise-based, type-safe tabs manipulation for Chrome MV3 extensions.
 */

export interface TabInfo {
  id: number;
  url: string;
  title: string;
  active: boolean;
  pinned: boolean;
  windowId: number;
  index: number;
}

function toTabInfo(tab: chrome.tabs.Tab): TabInfo {
  return {
    id: tab.id ?? -1,
    url: tab.url ?? "",
    title: tab.title ?? "",
    active: tab.active,
    pinned: tab.pinned,
    windowId: tab.windowId,
    index: tab.index,
  };
}

export async function getActiveTab(): Promise<TabInfo | null> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs.length > 0 ? toTabInfo(tabs[0]) : null;
}

export async function getActiveTabUrl(): Promise<string | null> {
  const tab = await getActiveTab();
  return tab?.url ?? null;
}

export async function getAllTabs(): Promise<TabInfo[]> {
  const tabs = await chrome.tabs.query({});
  return tabs.map(toTabInfo);
}

export async function getTabsInWindow(windowId?: number): Promise<TabInfo[]> {
  const query: chrome.tabs.QueryInfo =
    windowId !== undefined ? { windowId } : { currentWindow: true };
  const tabs = await chrome.tabs.query(query);
  return tabs.map(toTabInfo);
}

export async function getPinnedTabs(): Promise<TabInfo[]> {
  const tabs = await chrome.tabs.query({ pinned: true, currentWindow: true });
  return tabs.map(toTabInfo);
}

export async function getTabsByUrl(urlPattern: string): Promise<TabInfo[]> {
  const tabs = await chrome.tabs.query({ url: urlPattern });
  return tabs.map(toTabInfo);
}

export async function getTabById(tabId: number): Promise<TabInfo | null> {
  try {
    const tab = await chrome.tabs.get(tabId);
    return toTabInfo(tab);
  } catch {
    return null;
  }
}

export async function openTab(url: string, active = true): Promise<TabInfo> {
  const tab = await chrome.tabs.create({ url, active });
  return toTabInfo(tab);
}

export async function openOrFocusTab(url: string): Promise<TabInfo> {
  const existing = await getTabsByUrl(`${url}*`);
  if (existing.length > 0) {
    await chrome.tabs.update(existing[0].id, { active: true });
    await chrome.windows.update(existing[0].windowId, { focused: true });
    return existing[0];
  }
  return openTab(url);
}

export async function closeTab(tabId: number): Promise<void> {
  await chrome.tabs.remove(tabId);
}

export async function closeTabs(tabIds: number[]): Promise<void> {
  if (tabIds.length === 0) return;
  await chrome.tabs.remove(tabIds);
}

export async function reloadTab(tabId: number, bypassCache = false): Promise<void> {
  await chrome.tabs.reload(tabId, { bypassCache });
}

export async function duplicateTab(tabId: number): Promise<TabInfo> {
  const tab = await chrome.tabs.duplicate(tabId);
  return toTabInfo(tab!);
}

export async function moveTab(tabId: number, index: number, windowId?: number): Promise<TabInfo> {
  const props: chrome.tabs.MoveProperties = { index };
  if (windowId !== undefined) props.windowId = windowId;
  const tab = await chrome.tabs.move(tabId, props);
  const result = Array.isArray(tab) ? tab[0] : tab;
  return toTabInfo(result);
}

export async function sendMessageToTab<T = any>(tabId: number, message: any): Promise<T> {
  return chrome.tabs.sendMessage(tabId, message);
}
