/**
 * Context menu toolkit adapted from @theluckystrike/webext-context-menu
 * Declarative, typed context menus with automatic routing for MV3 extensions.
 */

export type ContextType =
  | "all"
  | "page"
  | "frame"
  | "selection"
  | "link"
  | "editable"
  | "image"
  | "video"
  | "audio"
  | "action";

export interface MenuItemOptions {
  id: string;
  title: string;
  contexts?: ContextType[];
  parentId?: string;
  enabled?: boolean;
  visible?: boolean;
  documentUrlPatterns?: string[];
  targetUrlPatterns?: string[];
  type?: "normal" | "checkbox" | "radio" | "separator";
  checked?: boolean;
}

export type ClickHandler = (
  info: chrome.contextMenus.OnClickData,
  tab?: chrome.tabs.Tab
) => void;

interface RegisteredItem {
  options: MenuItemOptions;
  onClick?: ClickHandler;
  children: RegisteredItem[];
}

const registry: Map<string, RegisteredItem> = new Map();
let listenerAttached = false;

export function _resetForTesting(): void {
  registry.clear();
  listenerAttached = false;
}

export class MenuItem {
  private item: RegisteredItem;

  constructor(options: MenuItemOptions, onClick?: ClickHandler) {
    this.item = { options, onClick, children: [] };
  }

  addChild(child: MenuItem): MenuItem {
    this.item.children.push(child.item);
    return this;
  }

  addChildren(children: MenuItem[]): MenuItem {
    for (const child of children) {
      this.item.children.push(child.item);
    }
    return this;
  }

  getItem(): RegisteredItem {
    return this.item;
  }
}

export function createMenu(options: MenuItemOptions, onClick?: ClickHandler): MenuItem {
  return new MenuItem(options, onClick);
}

export function createSeparator(id: string, parentId?: string): MenuItem {
  return new MenuItem({ id, title: "", type: "separator", parentId });
}

function registerItem(item: RegisteredItem, parentId?: string): void {
  const createProps: chrome.contextMenus.CreateProperties = {
    id: item.options.id,
    title: item.options.title,
    contexts: item.options.contexts as chrome.contextMenus.ContextType[],
    parentId: parentId ?? item.options.parentId,
    enabled: item.options.enabled,
    visible: item.options.visible,
    documentUrlPatterns: item.options.documentUrlPatterns,
    targetUrlPatterns: item.options.targetUrlPatterns,
    type: item.options.type as chrome.contextMenus.CreateProperties["type"],
    checked: item.options.checked,
  };

  // Remove undefined values
  for (const key of Object.keys(createProps) as (keyof typeof createProps)[]) {
    if (createProps[key] === undefined) {
      delete createProps[key];
    }
  }

  chrome.contextMenus.create(createProps, () => {
    // Ignore duplicate creation errors during hot reload
    if (chrome.runtime.lastError) {
      // noop
    }
  });
  registry.set(item.options.id, item);

  for (const child of item.children) {
    registerItem(child, item.options.id);
  }
}

export function registerMenus(items: MenuItem[]): void {
  chrome.contextMenus.removeAll(() => {
    registry.clear();
    for (const menuItem of items) {
      registerItem(menuItem.getItem());
    }
  });

  if (!listenerAttached) {
    listenerAttached = true;
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      const item = registry.get(info.menuItemId as string);
      if (item?.onClick) {
        item.onClick(info, tab);
      }
    });
  }
}

export function updateMenu(
  id: string,
  updates: Partial<Pick<MenuItemOptions, "title" | "enabled" | "visible" | "checked">>
): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.contextMenus.update(id, updates, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
}

export function removeMenu(id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.contextMenus.remove(id, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        registry.delete(id);
        resolve();
      }
    });
  });
}

export function removeAllMenus(): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.contextMenus.removeAll(() => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        registry.clear();
        resolve();
      }
    });
  });
}
