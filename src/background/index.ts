import {
  registerMenus,
  createMenu,
  createSeparator,
  setBadge,
  clearBadge,
  flashBadge,
  showCount,
  showStatus,
  COLORS,
  notifyBasic,
  notify,
  openOrFocusTab,
  getActiveTab,
} from "../toolkit";
import { getLogsSettings, DEFAULT_LOGS_SETTINGS } from "../utils/config";

export interface StoredWorkerError {
  id: string;
  worker: string;
  level: "error" | "warn" | "info";
  timestamp: string;
  route: string;
  status: number;
  message: string;
  rayId: string;
  stack?: string;
  context?: Record<string, any>;
}

const DEFAULT_ERRORS: StoredWorkerError[] = [
  {
    id: "err-1",
    worker: "colby-chrome-ext-cf-worker",
    level: "error",
    timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    route: "POST /api/chrome/memory/tabs",
    status: 500,
    message: "D1_ERROR: stepping, UNIQUE constraint failed: chrome_memory_tabs.tab_id",
    rayId: "93f218a09b4c0211",
    stack: `D1Error: stepping, UNIQUE constraint failed: chrome_memory_tabs.tab_id
    at Statement.all (node_modules/drizzle-orm/d1/session.js:48:21)
    at handleMemoryTabs (src/backend/api/routes/chrome.ts:194:12)
    at dispatch (node_modules/hono/dist/compose.js:32:17)
    at async app.fetch (src/backend/api/index.ts:50:14)`,
    context: {
      domainThreshold: 3,
      tabsCount: 5,
    },
  },
  {
    id: "err-2",
    worker: "core-guardian",
    level: "error",
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    route: "RPC GuardianRpc.run",
    status: 504,
    message: "Upstream AI Gateway GatewayTimeout: Cloudflare AI Gateway upstream model @cf/openai/gpt-oss-120b took >30000ms",
    rayId: "93f1ec37bc290199",
    stack: `GatewayTimeoutError: Upstream AI Gateway took >30000ms
    at GuardianRpc.run (src/backend/ai/guardian/rpc.ts:114:23)
    at async dispatchRpc (node_modules/cloudflare/workers-rpc.js:68:12)`,
    context: {
      model: "@cf/openai/gpt-oss-120b",
      task: "bookmarks_organize",
    },
  },
  {
    id: "err-3",
    worker: "colby-maestro",
    level: "error",
    timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    route: "POST /mcp/tools/call [tasks_update]",
    status: 400,
    message: "ValidationError: Task update requires valid 'status' enum: ['todo', 'in_progress', 'done']",
    rayId: "93ef890a88710212",
    stack: `ZodError: [
  {
    "code": "invalid_enum_value",
    "options": ["todo", "in_progress", "done"],
    "path": ["status"],
    "message": "Invalid status"
  }
]
    at validateToolCall (src/mcp/handlers.ts:45:19)
    at async handleMcp (src/index.ts:72:11)`,
  },
];

async function getStoredErrors(): Promise<StoredWorkerError[]> {
  const result = await chrome.storage.local.get("worker_errors");
  if (!result.worker_errors) {
    await chrome.storage.local.set({ worker_errors: DEFAULT_ERRORS });
    return DEFAULT_ERRORS;
  }
  return result.worker_errors;
}

async function updateBadgeFromErrors() {
  const errors = await getStoredErrors();
  const errorCount = errors.filter((e) => e.level === "error").length;

  if (errorCount > 0) {
    await showCount(errorCount);
  } else {
    await showStatus("success", "OK");
  }
}

function formatAllErrorsForAgent(errors: StoredWorkerError[]): string {
  const timestamp = new Date().toISOString();
  const errorItems = errors.filter((e) => e.level === "error");
  const uniqueWorkers = Array.from(new Set(errorItems.map((e) => e.worker)));

  return `# Cloudflare Workers Ecosystem Errors (Coding Agent Report)
Generated: ${timestamp}
Total Errors: ${errorItems.length} across ${uniqueWorkers.length} worker(s): [${uniqueWorkers.join(", ")}]

> Instruction for Coding Agent: Review the following Cloudflare Workers stack traces and error messages. Identify the failure locations, broken routes, or constraint violations and provide exact code patches.

${errorItems
  .map(
    (err, i) => `### ${i + 1}. Worker: \`${err.worker}\`
- **Timestamp**: ${err.timestamp}
- **Route / Method**: \`${err.route}\`
- **HTTP Status**: ${err.status}
- **Ray ID**: \`${err.rayId}\`
- **Error Message**: ${err.message}
${
  err.stack
    ? `- **Stack Trace**:\n\`\`\`\n${err.stack}\n\`\`\``
    : ""
}
${
  err.context
    ? `- **Request Context**:\n\`\`\`json\n${JSON.stringify(err.context, null, 2)}\n\`\`\``
    : ""
}`
  )
  .join("\n\n---\n\n")}
`;
}

function initContextMenus() {
  try {
    registerMenus([
      createMenu(
        {
          id: "copy_all_worker_errors",
          title: "Copy All Workers Errors for Coding Agent",
          contexts: ["all"],
        },
        async () => {
          const errors = await getStoredErrors();
          const report = formatAllErrorsForAgent(errors);
          await chrome.storage.local.set({ lastCopiedReport: report });
          await flashBadge("COPIED", COLORS.green, 2500);
          await notifyBasic(
            `copied-${Date.now()}`,
            "Errors Copied to Clipboard",
            `Formatted ${errors.length} worker errors with traces ready for your coding agent.`,
            "icons/icon-128.png"
          );
        }
      ),
      createMenu(
        {
          id: "open_worker_logs_panel",
          title: "Open Workers Logs Inspector (⌘+Shift+L)",
          contexts: ["all"],
        },
        async (_info, tab) => {
          if (tab?.windowId && chrome.sidePanel?.open) {
            await chrome.sidePanel.open({ windowId: tab.windowId });
          }
        }
      ),
      createSeparator("sep_1"),
      createMenu(
        {
          id: "clear_worker_errors",
          title: "Clear Resolved Worker Errors",
          contexts: ["all"],
        },
        async () => {
          await chrome.storage.local.set({ worker_errors: [] });
          await updateBadgeFromErrors();
          await flashBadge("CLEAN", COLORS.green, 2000);
        }
      ),
    ]);
  } catch (err) {
    console.warn("Context menu error in core-chrome-logs:", err);
  }
}

// ---------------------------------------------------------------------------
// Alarms & Periodic Poller
// ---------------------------------------------------------------------------

chrome.alarms.create("poll-worker-logs", { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "poll-worker-logs") {
    await updateBadgeFromErrors();
  }
});

chrome.runtime.onInstalled.addListener(async () => {
  console.log("Cloudflare Workers Logs Inspector installed.");
  initContextMenus();
  await updateBadgeFromErrors();
});

initContextMenus();
updateBadgeFromErrors();

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "copy_all_errors") {
    const errors = await getStoredErrors();
    const report = formatAllErrorsForAgent(errors);
    await chrome.storage.local.set({ lastCopiedReport: report });
    await flashBadge("COPIED", COLORS.green, 2500);
    await notifyBasic(
      `copied-cmd-${Date.now()}`,
      "Workers Errors Copied!",
      "Paste into your coding agent to diagnose.",
      "icons/icon-128.png"
    );
  }
});

// ---------------------------------------------------------------------------
// Message Bus
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    try {
      if (message.action === "get_errors") {
        const errors = await getStoredErrors();
        sendResponse({ success: true, errors });
      } else if (message.action === "add_error") {
        const errors = await getStoredErrors();
        const updated = [message.error, ...errors];
        await chrome.storage.local.set({ worker_errors: updated });
        await updateBadgeFromErrors();
        await notifyBasic(
          `new-error-${Date.now()}`,
          `New Error in ${message.error.worker}`,
          message.error.message.slice(0, 100),
          "icons/icon-128.png"
        );
        sendResponse({ success: true });
      } else if (message.action === "clear_errors") {
        await chrome.storage.local.set({ worker_errors: [] });
        await updateBadgeFromErrors();
        sendResponse({ success: true });
      } else if (message.action === "copy_all_errors") {
        const errors = await getStoredErrors();
        const report = formatAllErrorsForAgent(errors);
        sendResponse({ success: true, report });
      } else {
        sendResponse({ error: "Unknown action" });
      }
    } catch (err: any) {
      sendResponse({ success: false, error: err.message });
    }
  })();
  return true;
});
