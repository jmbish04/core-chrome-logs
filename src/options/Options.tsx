import { useEffect, useState } from "react";
import { Bell, CheckCircle2, Clock, Flame, Layers, RotateCcw, Save } from "lucide-react";
import {
  DEFAULT_LOGS_SETTINGS,
  getLogsSettings,
  saveLogsSettings,
  type LogsExtensionSettings,
} from "../utils/config";
import { AppHeader } from "../components/app-header";
import { Alert, AlertDescription, AlertTitle } from "../components/reui/alert";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "../components/reui/frame";
import { TagInput } from "../components/reui/tag-input";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { NumberField } from "../components/ui/number-field";
import { Switch } from "../components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

export default function Options() {
  const [settings, setSettings] = useState<LogsExtensionSettings>(DEFAULT_LOGS_SETTINGS);
  const [activeTab, setActiveTab] = useState<string>("workers");
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    getLogsSettings().then(setSettings);
  }, []);

  const handleSave = async () => {
    await saveLogsSettings(settings);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleResetDefaults = async () => {
    if (confirm("Reset all settings to default values?")) {
      await saveLogsSettings(DEFAULT_LOGS_SETTINGS);
      setSettings(DEFAULT_LOGS_SETTINGS);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground select-text">
      <AppHeader
        icon={<Flame />}
        title="Workers Logs — Settings"
        subtitle="Monitored workers, alert thresholds, and background sync"
        tag="ReUI"
        showSettings={false}
        actions={
          <>
            <Button type="button" variant="outline" size="sm" onClick={handleResetDefaults}>
              <RotateCcw className="mr-1 size-3.5" />
              Reset defaults
            </Button>
            <Button type="button" variant="default" size="sm" onClick={handleSave}>
              <Save className="mr-1 size-3.5" />
              Save changes
            </Button>
          </>
        }
      />

      <main className="mx-auto w-full max-w-4xl space-y-4 p-6">
        {savedSuccess && (
          <Alert variant="success">
            <CheckCircle2 />
            <AlertTitle>Configuration saved</AlertTitle>
            <AlertDescription>Background pollers picked up the new settings.</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="workers" className="gap-1.5">
              <Layers className="size-3.5" />
              <span>Monitored workers</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-1.5">
              <Bell className="size-3.5" />
              <span>Alerts & notifications</span>
            </TabsTrigger>
            <TabsTrigger value="sync" className="gap-1.5">
              <Clock className="size-3.5" />
              <span>Poll interval & endpoint</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workers">
            <Frame variant="default" spacing="dense">
              <FrameHeader className="p-4">
                <FrameTitle>Monitored Cloudflare Workers</FrameTitle>
                <FrameDescription>
                  Which Workers in the Colby ecosystem the extension polls. Each entry is its own
                  tag — type a name and press Enter, click the cross to drop one.
                </FrameDescription>
              </FrameHeader>
              <FramePanel className="space-y-4 p-4">
                <TagInput
                  tags={settings.monitoredWorkers}
                  onChange={(monitoredWorkers) => setSettings({ ...settings, monitoredWorkers })}
                  placeholder="Worker name (e.g. core-guardian), then Enter..."
                  emptyText="No workers monitored"
                  icon={<Layers className="size-3.5" />}
                  label="Worker service bindings"
                  description={`Currently tracking ${settings.monitoredWorkers.length} worker${
                    settings.monitoredWorkers.length === 1 ? "" : "s"
                  }.`}
                />
              </FramePanel>
            </Frame>
          </TabsContent>

          <TabsContent value="alerts">
            <Frame variant="default" spacing="dense">
              <FrameHeader className="p-4">
                <FrameTitle>Push & desktop notifications</FrameTitle>
                <FrameDescription>
                  When the extension raises a desktop notification for an exception.
                </FrameDescription>
              </FrameHeader>
              <FramePanel className="divide-y divide-border p-4">
                <div className="flex items-center justify-between gap-4 pb-3">
                  <div>
                    <div className="text-xs font-semibold">
                      Critical exceptions and 500 errors
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Raises a native notification with a "Copy error for agent" action
                    </div>
                  </div>
                  <Switch
                    checked={settings.notifyOnErrors}
                    onCheckedChange={(notifyOnErrors) =>
                      setSettings({ ...settings, notifyOnErrors })
                    }
                  />
                </div>

                <div className="flex items-center justify-between gap-4 pt-3">
                  <div>
                    <div className="text-xs font-semibold">Warnings and 4xx errors</div>
                    <div className="text-[11px] text-muted-foreground">
                      Covers rate limits (429) and high latency (over 3,500&nbsp;ms)
                    </div>
                  </div>
                  <Switch
                    checked={settings.notifyOnWarnings}
                    onCheckedChange={(notifyOnWarnings) =>
                      setSettings({ ...settings, notifyOnWarnings })
                    }
                  />
                </div>
              </FramePanel>
            </Frame>
          </TabsContent>

          <TabsContent value="sync">
            <Frame variant="default" spacing="dense">
              <FrameHeader className="p-4">
                <FrameTitle>Observability poller & worker URL</FrameTitle>
                <FrameDescription>
                  Background polling cadence and the upstream Cloudflare Worker endpoint.
                </FrameDescription>
              </FrameHeader>
              <FramePanel className="space-y-4 p-4">
                <div className="space-y-1.5">
                  <label htmlFor="worker-base-url" className="text-xs font-semibold">
                    Worker base URL
                  </label>
                  <Input
                    id="worker-base-url"
                    type="url"
                    value={settings.workerBaseUrl}
                    onChange={(e) => setSettings({ ...settings, workerBaseUrl: e.target.value })}
                    placeholder="https://colby-chrome-ext-cf-worker.hacolby.workers.dev"
                    className="bg-card text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="poll-interval" className="text-xs font-semibold">
                    Background poll interval (seconds)
                  </label>
                  <NumberField
                    id="poll-interval"
                    value={settings.pollIntervalSeconds}
                    onChange={(pollIntervalSeconds) =>
                      setSettings({ ...settings, pollIntervalSeconds })
                    }
                    min={10}
                    max={300}
                    step={5}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    How often the extension checks for new exceptions and refreshes the toolbar
                    badge.
                  </p>
                </div>
              </FramePanel>
            </Frame>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
