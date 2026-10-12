import React, { useState, useEffect } from "react";
import {
  FileText,
  Copy,
  Check,
  Sidebar,
  ExternalLink,
  Flame,
  Bug,
  RefreshCw,
  Settings,
  ShieldAlert,
} from "lucide-react";
import { Frame, FrameHeader, FrameTitle, FramePanel } from "../components/reui/frame";
import { Badge } from "../components/reui/badge";
import { Button } from "../components/ui/button";
import { EmptyState } from "../components/reui/empty-state";
import { StoredWorkerError } from "../background";

export default function Popup() {
  const [errors, setErrors] = useState<StoredWorkerError[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedAll, setCopiedAll] = useState(false);

  useEffect(() => {
    loadErrors();
  }, []);

  const loadErrors = () => {
    setLoading(true);
    chrome.runtime.sendMessage({ action: "get_errors" }, (res) => {
      setLoading(false);
      if (res?.success && res.errors) {
        setErrors(res.errors);
      }
    });
  };

  const handleCopyAll = () => {
    chrome.runtime.sendMessage({ action: "copy_all_errors" }, (res) => {
      if (res?.success && res.report) {
        navigator.clipboard.writeText(res.report);
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 2500);
      }
    });
  };

  const handleOpenSidepanel = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.windowId && chrome.sidePanel?.open) {
      await chrome.sidePanel.open({ windowId: tab.windowId });
      window.close();
    }
  };

  const errorItems = errors.filter((e) => e.level === "error");
  const uniqueWorkers = Array.from(new Set(errors.map((e) => e.worker)));

  return (
    <div className="flex flex-col bg-background text-foreground min-h-[460px] w-84 select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-card/60 backdrop-blur-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center shadow-xs">
            <Flame className="w-4 h-4 text-orange-400" />
          </div>
          <div>
            <h1 className="font-semibold text-xs leading-tight tracking-tight text-foreground flex items-center gap-1.5">
              Workers Logs
              <Badge variant="primary-light" size="xs" radius="full">
                ReUI
              </Badge>
            </h1>
            <p className="text-[10px] text-muted-foreground">Cloudflare Observability</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => chrome.runtime.openOptionsPage()}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors cursor-pointer"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Overview Status Badges */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/60 bg-muted/20 text-[11px]">
        <Badge
          variant={errorItems.length > 0 ? "destructive-light" : "success-light"}
          size="xs"
          radius="full"
        >
          {errorItems.length > 0 ? `${errorItems.length} Active Errors` : "All Workers Healthy"}
        </Badge>

        <Badge variant="outline" size="xs" radius="full">
          {uniqueWorkers.length} Monitored
        </Badge>
      </div>

      {/* Primary Action Button: Copy All Errors Block */}
      <div className="p-3 space-y-2.5 flex-1 overflow-y-auto">
        <Button
          onClick={handleCopyAll}
          variant={errorItems.length > 0 ? "default" : "secondary"}
          size="sm"
          className="w-full justify-between h-auto py-2.5 px-3"
          disabled={errorItems.length === 0}
        >
          <div className="flex items-center gap-2">
            {copiedAll ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            <div className="text-left">
              <div className="text-xs font-semibold">
                {copiedAll ? "Copied All to Clipboard!" : "Copy All Errors for Agent"}
              </div>
              <div className="text-[10px] opacity-80 font-normal">
                Formatted markdown block with traces
              </div>
            </div>
          </div>
          <Badge
            variant="outline"
            size="xs"
            radius="full"
            className="bg-background/20 border-border/40"
          >
            {errorItems.length}
          </Badge>
        </Button>

        {/* Side Panel Shortcut */}
        <Button
          onClick={handleOpenSidepanel}
          variant="outline"
          size="sm"
          className="w-full justify-between text-xs"
        >
          <div className="flex items-center gap-1.5">
            <Sidebar className="w-3.5 h-3.5" />
            <span>Open Side Panel Inspector</span>
          </div>
          <Badge variant="outline" size="xs">
            ⌘+Shift+L
          </Badge>
        </Button>

        {/* Recent Error Previews */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium px-1">
            <span>Recent Worker Exceptions</span>
            <button
              type="button"
              onClick={loadErrors}
              className="hover:text-foreground flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>

          {errorItems.length === 0 ? (
            <EmptyState
              icon={<ShieldAlert className="w-6 h-6 text-emerald-400" />}
              title="No Errors Recorded"
              description="Your Cloudflare Workers ecosystem is healthy."
            />
          ) : (
            <div className="space-y-1.5">
              {errorItems.slice(0, 3).map((err) => (
                <Frame key={err.id} variant="default" spacing="sm">
                  <FramePanel className="p-2.5 space-y-1 bg-card/60">
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Bug className="w-3.5 h-3.5 text-destructive shrink-0" />
                        <Badge variant="destructive-light" size="xs" radius="full">
                          {err.worker.replace("colby-", "").replace("core-", "")}
                        </Badge>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        HTTP {err.status}
                      </span>
                    </div>

                    <p className="text-[11px] font-mono text-destructive-foreground truncate">
                      {err.message}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                      <span className="truncate max-w-[170px]">{err.route}</span>
                      <span>
                        {new Date(err.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </FramePanel>
                </Frame>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-border text-[10px] text-muted-foreground flex items-center justify-between bg-card/40">
        <span>Cloudflare Observability</span>
        <button
          type="button"
          onClick={handleOpenSidepanel}
          className="hover:text-foreground flex items-center gap-0.5 cursor-pointer"
        >
          <span>Full Inspector</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </button>
      </div>
    </div>
  );
}
