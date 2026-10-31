import { useEffect, useState } from "react";
import {
  Bug,
  Check,
  Copy,
  ExternalLink,
  Flame,
  PanelRight,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { AppHeader } from "../components/app-header";
import { Badge } from "../components/reui/badge";
import { EmptyState } from "../components/reui/empty-state";
import { Frame, FramePanel } from "../components/reui/frame";
import { Button } from "../components/ui/button";
import { Separator } from "../components/ui/separator";
import type { StoredWorkerError } from "../background";

const shortWorker = (worker: string) => worker.replace("colby-", "").replace("core-", "");

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
    <div className="flex min-h-[460px] w-84 flex-col bg-background text-foreground select-none">
      <AppHeader
        icon={<Flame />}
        title="Workers Logs"
        subtitle="Cloudflare observability"
        tag="ReUI"
      />

      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/20 px-4 py-2">
        <Badge
          variant={errorItems.length > 0 ? "destructive-light" : "success-light"}
          size="xs"
          radius="full"
        >
          {errorItems.length > 0
            ? `${errorItems.length} active ${errorItems.length === 1 ? "error" : "errors"}`
            : "All workers healthy"}
        </Badge>

        <Badge variant="outline" size="xs" radius="full">
          {uniqueWorkers.length} monitored
        </Badge>
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto p-3">
        <Button
          type="button"
          onClick={handleCopyAll}
          variant={errorItems.length > 0 ? "default" : "secondary"}
          size="sm"
          className="h-auto w-full justify-between px-3 py-2.5"
          disabled={errorItems.length === 0}
        >
          <span className="flex items-center gap-2">
            {copiedAll ? <Check className="size-4" /> : <Copy className="size-4" />}
            <span className="text-left">
              <span className="block text-xs font-semibold">
                {copiedAll ? "Copied all to clipboard" : "Copy all errors for agent"}
              </span>
              <span className="block text-[10px] font-normal opacity-80">
                Formatted markdown block with traces
              </span>
            </span>
          </span>
          <Badge
            variant={errorItems.length > 0 ? "secondary" : "outline"}
            size="xs"
            radius="full"
          >
            {errorItems.length}
          </Badge>
        </Button>

        <Button
          type="button"
          onClick={handleOpenSidepanel}
          variant="outline"
          size="sm"
          className="w-full justify-between"
        >
          <span className="flex items-center gap-1.5">
            <PanelRight className="size-3.5" />
            <span>Open side panel inspector</span>
          </span>
          <Badge variant="outline" size="xs">
            ⌘+Shift+L
          </Badge>
        </Button>

        <Separator />

        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-medium text-muted-foreground">
              Recent worker exceptions
            </span>
            <Button
              type="button"
              onClick={loadErrors}
              variant="ghost"
              size="xs"
              aria-label="Reload errors"
            >
              <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} />
              <span className="ml-1">Refresh</span>
            </Button>
          </div>

          {errorItems.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck className="size-6 text-success" />}
              title="No errors recorded"
              description="Your Cloudflare Workers ecosystem is healthy."
            />
          ) : (
            <div className="space-y-1.5">
              {errorItems.slice(0, 3).map((err) => (
                <Frame key={err.id} variant="default" spacing="dense">
                  <FramePanel className="space-y-1 bg-card/60 p-2.5">
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <Bug className="size-3.5 shrink-0 text-destructive" />
                        <Badge variant="destructive-light" size="xs" radius="full">
                          {shortWorker(err.worker)}
                        </Badge>
                      </div>
                      <Badge variant="outline" size="xs">
                        HTTP {err.status}
                      </Badge>
                    </div>

                    <p className="truncate font-mono text-[11px] text-foreground">{err.message}</p>

                    <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground">
                      <span className="max-w-[170px] truncate">{err.route}</span>
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

      <footer className="flex items-center justify-between border-t border-border bg-card/40 px-3 py-1.5">
        <span className="text-[10px] text-muted-foreground">Cloudflare observability</span>
        <Button type="button" onClick={handleOpenSidepanel} variant="link" size="xs">
          <span>Full inspector</span>
          <ExternalLink className="ml-0.5 size-2.5" />
        </Button>
      </footer>
    </div>
  );
}
