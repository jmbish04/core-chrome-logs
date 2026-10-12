import React, { useState, useEffect } from "react";
import {
  Save,
  RotateCcw,
  CheckCircle2,
  Flame,
  Bell,
  Clock,
  Layers,
  Shield,
} from "lucide-react";
import {
  getLogsSettings,
  saveLogsSettings,
  DEFAULT_LOGS_SETTINGS,
  type LogsExtensionSettings,
} from "../utils/config";
import { Frame, FrameHeader, FrameTitle, FrameDescription, FramePanel } from "../components/reui/frame";
import { Badge } from "../components/reui/badge";
import { TagInput } from "../components/reui/tag-input";
import { NumberField } from "../components/ui/number-field";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Switch } from "../components/ui/switch";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";

export default function Options() {
  const [settings, setSettings] = useState<LogsExtensionSettings>(DEFAULT_LOGS_SETTINGS);
  const [activeTab, setActiveTab] = useState<string>("workers");
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    getLogsSettings().then(setSettings);
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
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
    <div className="max-w-4xl mx-auto p-6 space-y-6 text-foreground bg-background min-h-screen select-text">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 shadow-xs">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
              Cloudflare Workers Logs — Settings
              <Badge variant="primary-light" size="xs" radius="full">
                ReUI Monolith
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground">
              Configure ecosystem workers monitoring, real-time alert thresholds, and background sync intervals
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetDefaults}
            className="text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Reset Defaults
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => handleSave()}
            className="text-xs"
          >
            <Save className="w-3.5 h-3.5 mr-1" />
            Save Changes
          </Button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-card border border-emerald-500/40 rounded-lg flex items-center gap-2 text-xs text-foreground shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Configuration saved successfully! Background pollers updated.</span>
        </div>
      )}

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/40 p-1 border border-border rounded-lg">
          <TabsTrigger value="workers" className="text-xs gap-1.5 cursor-pointer">
            <Layers className="w-3.5 h-3.5" />
            <span>Monitored Workers</span>
          </TabsTrigger>
          <TabsTrigger value="alerts" className="text-xs gap-1.5 cursor-pointer">
            <Bell className="w-3.5 h-3.5" />
            <span>Alerts & Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="sync" className="text-xs gap-1.5 cursor-pointer">
            <Clock className="w-3.5 h-3.5" />
            <span>Poll Intervals & Endpoint</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Monitored Workers */}
        <TabsContent value="workers" className="space-y-4">
          <Frame variant="default">
            <FrameHeader>
              <FrameTitle>Monitored Cloudflare Workers</FrameTitle>
              <FrameDescription>
                Define the list of Cloudflare Workers to monitor in the Colby ecosystem. Discrete badge tags only (Zero CSV).
              </FrameDescription>
            </FrameHeader>
            <FramePanel className="space-y-4 p-4">
              <TagInput
                value={settings.monitoredWorkers}
                onChange={(monitoredWorkers) => setSettings({ ...settings, monitoredWorkers })}
                placeholder="Type worker name (e.g. core-guardian) and press Enter..."
              />
              <p className="text-[11px] text-muted-foreground">
                Currently tracking {settings.monitoredWorkers.length} worker service bindings.
              </p>
            </FramePanel>
          </Frame>
        </TabsContent>

        {/* Tab 2: Alerts & Notifications */}
        <TabsContent value="alerts" className="space-y-4">
          <Frame variant="default">
            <FrameHeader>
              <FrameTitle>Push & Desktop Notifications</FrameTitle>
              <FrameDescription>
                Configure when the extension sends desktop notifications for exceptions.
              </FrameDescription>
            </FrameHeader>
            <FramePanel className="space-y-4 p-4">
              <div className="flex items-center justify-between py-2 border-b border-border/40">
                <div>
                  <div className="text-xs font-semibold">Notify on Critical Exceptions & 500 Errors</div>
                  <div className="text-[11px] text-muted-foreground">
                    Triggers a native notification with a "Copy Error for Agent" action button
                  </div>
                </div>
                <Switch
                  checked={settings.notifyOnErrors}
                  onCheckedChange={(notifyOnErrors) => setSettings({ ...settings, notifyOnErrors })}
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-xs font-semibold">Notify on Warnings & 4xx Errors</div>
                  <div className="text-[11px] text-muted-foreground">
                    Triggers notification for rate limits (429) or high latency (&gt;3500ms)
                  </div>
                </div>
                <Switch
                  checked={settings.notifyOnWarnings}
                  onCheckedChange={(notifyOnWarnings) => setSettings({ ...settings, notifyOnWarnings })}
                />
              </div>
            </FramePanel>
          </Frame>
        </TabsContent>

        {/* Tab 3: Intervals & Endpoint */}
        <TabsContent value="sync" className="space-y-4">
          <Frame variant="default">
            <FrameHeader>
              <FrameTitle>Observability Poller & Worker URL</FrameTitle>
              <FrameDescription>
                Configure background polling cadence and the upstream Cloudflare Worker endpoint.
              </FrameDescription>
            </FrameHeader>
            <FramePanel className="space-y-4 p-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Worker Base URL</label>
                <Input
                  value={settings.workerBaseUrl}
                  onChange={(e) => setSettings({ ...settings, workerBaseUrl: e.target.value })}
                  placeholder="https://colby-chrome-ext-cf-worker.hacolby.workers.dev"
                  className="text-xs bg-card"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Background Poll Interval (Seconds)</label>
                <NumberField
                  value={settings.pollIntervalSeconds}
                  onChange={(pollIntervalSeconds) => setSettings({ ...settings, pollIntervalSeconds })}
                  min={10}
                  max={300}
                  step={5}
                />
                <p className="text-[11px] text-muted-foreground">
                  Controls how frequently the extension checks for new exceptions and updates the toolbar badge.
                </p>
              </div>
            </FramePanel>
          </Frame>
        </TabsContent>
      </Tabs>
    </div>
  );
}
