export interface LogsExtensionSettings {
  monitoredWorkers: string[];
  pollIntervalSeconds: number;
  notifyOnErrors: boolean;
  notifyOnWarnings: boolean;
  workerBaseUrl: string;
}

export const DEFAULT_LOGS_SETTINGS: LogsExtensionSettings = {
  monitoredWorkers: [
    "colby-chrome-ext-cf-worker",
    "core-guardian",
    "core-hassio",
    "colby-maestro",
    "google-workspace-mcp",
    "core-vetting",
    "ecoflow-telemetry",
  ],
  pollIntervalSeconds: 30,
  notifyOnErrors: true,
  notifyOnWarnings: false,
  workerBaseUrl: "https://colby-chrome-ext-cf-worker.hacolby.workers.dev",
};

export async function getLogsSettings(): Promise<LogsExtensionSettings> {
  const result = await chrome.storage.local.get("logs_settings");
  return { ...DEFAULT_LOGS_SETTINGS, ...(result.logs_settings || {}) };
}

export async function saveLogsSettings(settings: LogsExtensionSettings): Promise<void> {
  await chrome.storage.local.set({ logs_settings: settings });
}
