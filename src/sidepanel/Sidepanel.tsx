import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bug,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  FileText,
  Flame,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { AppHeader } from "../components/app-header";
import { Badge } from "../components/reui/badge";
import { EmptyState } from "../components/reui/empty-state";
import { Frame, FrameHeader, FramePanel, FrameTitle } from "../components/reui/frame";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "../components/ui/toggle-group";
import type { StoredWorkerError } from "../background";

type LevelFilter = "all" | "error" | "warn";

const ALL_WORKERS = "all";

const shortWorker = (worker: string) => worker.replace("colby-", "").replace("core-", "");

/**
 * One stack trace, in the panel's own surface tokens.
 *
 * ReUI's CodeBlock would also fit here and was considered; it pulls Shiki plus ~3,400
 * lines of highlighting machinery into a 400px panel that shows one monospace trace with
 * no language to highlight. The trace is pre-formatted text, so the Frame carries it.
 */
function TraceBlock({ label, content }: { label?: string; content: string }) {
  return (
    <Frame variant="inverse" spacing="dense">
      {label && (
        <FrameHeader className="px-2.5 py-1.5">
          <FrameTitle className="text-xs font-semibold text-muted-foreground">
            {label}
          </FrameTitle>
        </FrameHeader>
      )}
      <FramePanel className="bg-muted/40 p-2.5">
        <pre className="overflow-x-auto font-mono text-xs leading-relaxed whitespace-pre text-muted-foreground select-text">
          {content}
        </pre>
      </FramePanel>
    </Frame>
  );
}

export default function Sidepanel() {
  const [logs, setLogs] = useState<StoredWorkerError[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorker, setSelectedWorker] = useState<string>(ALL_WORKERS);
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTraceId, setExpandedTraceId] = useState<string | null>("err-1");
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedWorkerMap, setCopiedWorkerMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadErrors();
  }, []);

  const loadErrors = () => {
    setLoading(true);
    chrome.runtime.sendMessage({ action: "get_errors" }, (res) => {
      setLoading(false);
      if (res?.success && res.errors) {
        setLogs(res.errors);
      }
    });
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (selectedWorker !== ALL_WORKERS && log.worker !== selectedWorker) return false;
      if (levelFilter === "error" && log.level !== "error") return false;
      if (levelFilter === "warn" && log.level !== "warn" && log.level !== "error") return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesMsg = log.message.toLowerCase().includes(query);
        const matchesRoute = log.route.toLowerCase().includes(query);
        const matchesStack = log.stack?.toLowerCase().includes(query) ?? false;
        const matchesWorker = log.worker.toLowerCase().includes(query);
        if (!matchesMsg && !matchesRoute && !matchesStack && !matchesWorker) return false;
      }
      return true;
    });
  }, [logs, selectedWorker, levelFilter, searchQuery]);

  const allErrors = useMemo(() => logs.filter((l) => l.level === "error"), [logs]);
  const filteredErrors = useMemo(
    () => filteredLogs.filter((l) => l.level === "error"),
    [filteredLogs]
  );

  const formatErrorBlock = (err: StoredWorkerError, index?: number) => {
    const numPrefix = index !== undefined ? `${index + 1}. ` : "";
    let block = `### ${numPrefix}Worker: \`${err.worker}\`
- **Timestamp**: ${err.timestamp}
- **Endpoint / Action**: \`${err.route}\`
- **HTTP Status**: ${err.status}
- **Ray ID**: \`${err.rayId}\`
- **Error Message**: ${err.message}`;

    if (err.context && Object.keys(err.context).length > 0) {
      block += `\n- **Request Context**:\n\`\`\`json\n${JSON.stringify(err.context, null, 2)}\n\`\`\``;
    }

    if (err.stack) {
      block += `\n- **Full Stack Trace**:\n\`\`\`\n${err.stack}\n\`\`\``;
    }

    return block;
  };

  const handleCopyAllErrors = () => {
    const targets = filteredErrors.length > 0 ? filteredErrors : allErrors;
    if (targets.length === 0) return;

    const timestamp = new Date().toISOString();
    const uniqueWorkers = Array.from(new Set(targets.map((t) => t.worker)));

    const report = `# Cloudflare Workers Ecosystem Errors (Coding Agent Report)
Generated: ${timestamp}
Total Errors: ${targets.length} across ${uniqueWorkers.length} worker(s): [${uniqueWorkers.join(", ")}]

> Instruction for Coding Agent: The following error logs and stack traces occurred in production Cloudflare Workers. Review the stack traces and root causes, identify the breaking lines or failing schemas, and provide the exact patch or fixes.

${targets.map((err, idx) => formatErrorBlock(err, idx)).join("\n\n---\n\n")}
`;

    navigator.clipboard.writeText(report);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const handleCopyWorkerErrors = (workerName: string) => {
    const workerErrors = logs.filter((l) => l.worker === workerName && l.level === "error");
    if (workerErrors.length === 0) return;

    const timestamp = new Date().toISOString();
    const report = `## Cloudflare Worker Errors: \`${workerName}\`
Generated: ${timestamp}
Total Errors: ${workerErrors.length}

${workerErrors.map((err, idx) => formatErrorBlock(err, idx)).join("\n\n---\n\n")}
`;

    navigator.clipboard.writeText(report);
    setCopiedWorkerMap((prev) => ({ ...prev, [workerName]: true }));
    setTimeout(() => {
      setCopiedWorkerMap((prev) => ({ ...prev, [workerName]: false }));
    }, 2500);
  };

  const handleCopySingleError = (err: StoredWorkerError) => {
    navigator.clipboard.writeText(formatErrorBlock(err));
  };

  const handleSimulateNewError = () => {
    const newEntry: StoredWorkerError = {
      id: `err-${Date.now()}`,
      worker: "colby-chrome-ext-cf-worker",
      level: "error",
      timestamp: new Date().toISOString(),
      route: "POST /api/chrome/push/broadcast",
      status: 500,
      message: "TypeError: Cannot read properties of undefined (reading 'headers')",
      rayId: `93e${Math.random().toString(16).substring(2, 10)}`,
      stack: `TypeError: Cannot read properties of undefined (reading 'headers')
    at broadcastToStream (src/backend/api/routes/chrome.ts:144:28)
    at async dispatch (node_modules/hono/dist/compose.js:24:19)
    at async app.fetch (src/backend/api/index.ts:50:14)`,
      context: {
        channel: "notifications",
        trigger: "test_simulation",
      },
    };
    chrome.runtime.sendMessage({ action: "add_error", error: newEntry }, () => {
      loadErrors();
      setExpandedTraceId(newEntry.id);
    });
  };

  const handleClearLogs = () => {
    chrome.runtime.sendMessage({ action: "clear_errors" }, () => {
      setLogs([]);
    });
  };

  const uniqueWorkersList = Array.from(new Set(logs.map((l) => l.worker)));

  return (
    <div className="flex h-screen flex-col bg-background text-foreground select-text">
      <AppHeader
        icon={<Flame />}
        title="Workers Logs Inspector"
        subtitle="Ecosystem observability & traces"
        tag="ReUI"
        actions={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={loadErrors}
            aria-label="Reload errors"
            title="Reload errors"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        }
      />

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <Frame variant="default" spacing="dense">
          <FrameHeader className="px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <FrameTitle className="flex items-center gap-2 text-xs">
                <FileText className="size-4" />
                <span>Workers console & traces</span>
              </FrameTitle>

              <div className="flex shrink-0 items-center gap-1.5">
                <Badge
                  variant={allErrors.length > 0 ? "destructive-light" : "success-light"}
                  size="xs"
                  radius="full"
                >
                  {allErrors.length} {allErrors.length === 1 ? "error" : "errors"}
                </Badge>
                <Badge variant="outline" size="xs" radius="full">
                  {logs.length} total logs
                </Badge>
              </div>
            </div>
          </FrameHeader>

          <FramePanel className="space-y-3 bg-card/60 p-3">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Real-time exception streams and execution traces across all Cloudflare Workers.
              One click copies every formatted stack trace for your coding agent.
            </p>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={allErrors.length > 0 ? "default" : "secondary"}
                size="sm"
                onClick={handleCopyAllErrors}
                disabled={allErrors.length === 0}
                className="flex-1 gap-1.5 font-semibold"
              >
                {copiedAll ? (
                  <>
                    <Check className="size-3.5" />
                    <span>Copied all errors</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    <span>Copy all errors ({filteredErrors.length})</span>
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSimulateNewError}
                className="gap-1"
                title="Inject a test error to verify the copy block"
              >
                <Flame className="size-3.5" />
                <span>Simulate</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={handleClearLogs}
                aria-label="Clear log history"
                title="Clear log history"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </FramePanel>
        </Frame>

        <Frame variant="default" spacing="sm">
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search message, route, or stack trace..."
              aria-label="Search logs"
              className="h-8 bg-card pl-8 text-xs"
            />
          </div>

          <ToggleGroup
            value={[selectedWorker]}
            onValueChange={(next) => setSelectedWorker(next[0] ?? ALL_WORKERS)}
            size="sm"
            spacing={1}
            aria-label="Filter by worker"
            className="no-scrollbar w-full flex-nowrap overflow-x-auto"
          >
            <ToggleGroupItem value={ALL_WORKERS}>All workers ({logs.length})</ToggleGroupItem>
            {uniqueWorkersList.map((worker) => {
              const count = logs.filter((l) => l.worker === worker && l.level === "error").length;
              return (
                <ToggleGroupItem key={worker} value={worker}>
                  <span>{shortWorker(worker)}</span>
                  {count > 0 && (
                    <Badge variant="destructive" size="xs" radius="full">
                      {count}
                    </Badge>
                  )}
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>

          <div className="flex items-center justify-between gap-2">
            <ToggleGroup
              value={[levelFilter]}
              onValueChange={(next) => setLevelFilter((next[0] as LevelFilter) ?? "all")}
              size="sm"
              spacing={0}
              variant="outline"
              aria-label="Filter by severity"
            >
              <ToggleGroupItem value="all">All</ToggleGroupItem>
              <ToggleGroupItem value="error">Errors</ToggleGroupItem>
              <ToggleGroupItem value="warn">Warnings</ToggleGroupItem>
            </ToggleGroup>

            <span className="shrink-0 text-xs text-muted-foreground">
              Showing {filteredLogs.length} of {logs.length}
            </span>
          </div>
        </Frame>

        {filteredLogs.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck className="size-6 text-success" />}
            title="No errors found"
            description={
              searchQuery
                ? `No logs match "${searchQuery}". Try clearing the search query.`
                : "All monitored Cloudflare Workers are running without active exceptions."
            }
            action={
              <Button type="button" variant="outline" size="sm" onClick={handleSimulateNewError}>
                Inject test error
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => {
              const isExpanded = expandedTraceId === log.id;
              const isError = log.level === "error";
              const isWarn = log.level === "warn";

              return (
                <Frame
                  key={log.id}
                  variant="default"
                  spacing="dense"
                  className={
                    isError
                      ? "border-destructive/40"
                      : isWarn
                        ? "border-warning/40"
                        : "border-border"
                  }
                >
                  <FrameHeader className="bg-card/70 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        {isError ? (
                          <Bug className="size-3.5 shrink-0 text-destructive" />
                        ) : isWarn ? (
                          <AlertTriangle className="size-3.5 shrink-0 text-warning" />
                        ) : (
                          <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                        )}

                        <Badge
                          variant={
                            isError ? "destructive-light" : isWarn ? "warning-light" : "outline"
                          }
                          size="xs"
                          radius="full"
                        >
                          {log.worker}
                        </Badge>

                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <span className="font-mono text-xs text-muted-foreground">
                          {new Date(log.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleCopyWorkerErrors(log.worker)}
                          aria-label={`Copy all errors for ${log.worker}`}
                          title={`Copy all errors for ${log.worker}`}
                        >
                          {copiedWorkerMap[log.worker] ? (
                            <Check className="size-3" />
                          ) : (
                            <Copy className="size-3" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="truncate font-mono text-xs text-muted-foreground">
                      {log.route}
                    </div>
                  </FrameHeader>

                  <FramePanel className="space-y-2 bg-card/30 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-mono text-xs leading-relaxed font-medium text-foreground">
                        {log.message}
                      </p>

                      <Badge
                        variant={isError ? "destructive" : isWarn ? "warning-light" : "outline"}
                        size="xs"
                        className="shrink-0"
                      >
                        HTTP {log.status}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between gap-2 border-t border-border pt-1.5">
                      <span className="font-mono text-xs text-muted-foreground">
                        Ray: {log.rayId}
                      </span>
                      {log.stack && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          onClick={() => setExpandedTraceId(isExpanded ? null : log.id)}
                          aria-expanded={isExpanded}
                        >
                          <span>{isExpanded ? "Hide stack trace" : "View stack trace"}</span>
                          {isExpanded ? (
                            <ChevronUp className="ml-0.5 size-3" />
                          ) : (
                            <ChevronDown className="ml-0.5 size-3" />
                          )}
                        </Button>
                      )}
                    </div>

                    {isExpanded && log.stack && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-muted-foreground">
                            Exception stack trace
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            onClick={() => handleCopySingleError(log)}
                          >
                            <Copy className="mr-1 size-2.5" />
                            <span>Copy trace</span>
                          </Button>
                        </div>

                        <TraceBlock content={log.stack} />

                        {log.context && (
                          <TraceBlock
                            label="Request context"
                            content={JSON.stringify(log.context, null, 2)}
                          />
                        )}
                      </div>
                    )}
                  </FramePanel>
                </Frame>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
