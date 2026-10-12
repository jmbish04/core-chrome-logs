import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  AlertTriangle,
  Bug,
  Copy,
  Check,
  RefreshCw,
  Search,
  CheckCircle2,
  Trash2,
  Flame,
  ChevronDown,
  ChevronUp,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { Frame, FrameHeader, FrameTitle, FramePanel } from "../components/reui/frame";
import { Badge } from "../components/reui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { EmptyState } from "../components/reui/empty-state";
import { StoredWorkerError } from "../background";
import { getLogsSettings } from "../utils/config";

export default function Sidepanel() {
  const [logs, setLogs] = useState<StoredWorkerError[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorker, setSelectedWorker] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<"all" | "error" | "warn">("all");
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
      if (selectedWorker !== "all" && log.worker !== selectedWorker) return false;
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
  const filteredErrors = useMemo(() => filteredLogs.filter((l) => l.level === "error"), [filteredLogs]);

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
    const text = formatErrorBlock(err);
    navigator.clipboard.writeText(text);
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
    <div className="flex flex-col h-screen bg-background text-foreground select-text">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-card/60 backdrop-blur-xs shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center shadow-xs">
            <Flame className="w-4 h-4 text-orange-400" />
          </div>
          <div>
            <h1 className="font-semibold text-xs leading-tight tracking-tight text-foreground flex items-center gap-1.5">
              Workers Logs Inspector
              <Badge variant="primary-light" size="xs" radius="full">
                ReUI Monolith
              </Badge>
            </h1>
            <p className="text-[10px] text-muted-foreground">Ecosystem Observability & Traces</p>
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

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Top Header Card */}
        <Frame variant="default" spacing="sm">
          <FrameHeader>
            <div className="flex items-center justify-between">
              <FrameTitle className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-foreground" />
                <span>Workers Console & Traces</span>
              </FrameTitle>

              <div className="flex items-center gap-1.5">
                <Badge
                  variant={allErrors.length > 0 ? "destructive-light" : "success-light"}
                  size="xs"
                  radius="full"
                >
                  {allErrors.length} {allErrors.length === 1 ? "Error" : "Errors"}
                </Badge>
                <Badge variant="outline" size="xs" radius="full">
                  {logs.length} Total Logs
                </Badge>
              </div>
            </div>
          </FrameHeader>

          <FramePanel className="space-y-3 p-3 bg-card/60">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Real-time exception streams and execution traces across all Cloudflare Workers. One click copies all formatted stack traces directly for your AI coding agent to generate instantaneous fixes.
            </p>

            {/* Primary Action Button: Copy All Errors Block */}
            <div className="flex items-center gap-2 pt-1">
              <Button
                variant={allErrors.length > 0 ? "default" : "secondary"}
                size="sm"
                onClick={handleCopyAllErrors}
                disabled={allErrors.length === 0}
                className="flex-1 text-xs gap-1.5 font-semibold"
              >
                {copiedAll ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied All Errors to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy All Errors Across All Workers ({filteredErrors.length})</span>
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleSimulateNewError}
                className="text-xs gap-1 px-2.5"
                title="Inject test error to verify copy block"
              >
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Simulate</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleClearLogs}
                className="text-xs px-2"
                title="Clear log history"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </FramePanel>
        </Frame>

        {/* Search & Filter Bar */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search error message, route, or stack trace..."
              className="pl-8 text-xs h-8 bg-card"
            />
          </div>

          {/* Worker Pills Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedWorker("all")}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors shrink-0 cursor-pointer ${
                selectedWorker === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              All Workers ({logs.length})
            </button>
            {uniqueWorkersList.map((w) => {
              const count = logs.filter((l) => l.worker === w && l.level === "error").length;
              return (
                <button
                  key={w}
                  type="button"
                  onClick={() => setSelectedWorker(w)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors shrink-0 flex items-center gap-1 cursor-pointer ${
                    selectedWorker === w
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{w.replace("colby-", "").replace("core-", "")}</span>
                  {count > 0 && (
                    <span className="w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] flex items-center justify-center font-bold">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Severity Filter */}
          <div className="flex items-center justify-between text-xs pt-1">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-[11px]">Severity:</span>
              <button
                type="button"
                onClick={() => setLevelFilter("all")}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                  levelFilter === "all"
                    ? "bg-card border border-border text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setLevelFilter("error")}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                  levelFilter === "error"
                    ? "bg-destructive/20 border border-destructive/40 text-destructive-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Errors Only
              </button>
              <button
                type="button"
                onClick={() => setLevelFilter("warn")}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                  levelFilter === "warn"
                    ? "bg-warning/20 border border-warning/40 text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Warnings
              </button>
            </div>

            <span className="text-[11px] text-muted-foreground">
              Showing {filteredLogs.length} of {logs.length}
            </span>
          </div>
        </div>

        {/* Logs Stream List */}
        {filteredLogs.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck className="w-6 h-6 text-emerald-400" />}
            title="No Errors Found"
            description={
              searchQuery
                ? `No logs match "${searchQuery}". Try clearing the search query.`
                : "All monitored Cloudflare Workers are currently running without active exceptions."
            }
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={handleSimulateNewError}
                className="text-xs"
              >
                Inject Test Error
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
                  spacing="sm"
                  className={`transition-colors ${
                    isError ? "border-destructive/40" : isWarn ? "border-amber-500/30" : "border-border"
                  }`}
                >
                  <FrameHeader className="py-2 px-3 bg-card/70">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {isError ? (
                          <Bug className="w-3.5 h-3.5 text-destructive shrink-0" />
                        ) : isWarn ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        )}

                        <Badge
                          variant={isError ? "destructive-light" : isWarn ? "warning-light" : "outline"}
                          size="xs"
                          radius="full"
                        >
                          {log.worker}
                        </Badge>

                        <span className="text-[10px] font-mono text-muted-foreground truncate">
                          {log.route}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {new Date(log.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyWorkerErrors(log.worker)}
                          className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                          title={`Copy all errors for ${log.worker}`}
                        >
                          {copiedWorkerMap[log.worker] ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </FrameHeader>

                  <FramePanel className="p-3 space-y-2 bg-card/30">
                    {/* Error Message */}
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`text-xs font-medium leading-relaxed font-mono ${
                          isError ? "text-destructive-foreground" : "text-foreground"
                        }`}
                      >
                        {log.message}
                      </p>

                      <Badge
                        variant={isError ? "destructive" : isWarn ? "warning-light" : "outline"}
                        size="xs"
                      >
                        HTTP {log.status}
                      </Badge>
                    </div>

                    {/* Context & Ray ID */}
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono pt-1 border-t border-border/40">
                      <span>Ray: {log.rayId}</span>
                      {log.stack && (
                        <button
                          type="button"
                          onClick={() => setExpandedTraceId(isExpanded ? null : log.id)}
                          className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
                        >
                          <span>{isExpanded ? "Hide Stack Trace" : "View Stack Trace"}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Expandable Stack Trace */}
                    {isExpanded && log.stack && (
                      <div className="mt-2 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span className="font-semibold">Exception Stack Trace</span>
                          <button
                            type="button"
                            onClick={() => handleCopySingleError(log)}
                            className="hover:text-foreground flex items-center gap-1 cursor-pointer"
                          >
                            <Copy className="w-2.5 h-2.5" />
                            <span>Copy Trace</span>
                          </button>
                        </div>

                        <pre className="p-2.5 bg-background border border-border rounded-md text-[10px] font-mono text-muted-foreground overflow-x-auto whitespace-pre leading-relaxed select-text">
                          {log.stack}
                        </pre>

                        {log.context && (
                          <div className="pt-1">
                            <span className="text-[10px] font-semibold text-muted-foreground block mb-0.5">
                              Request Context
                            </span>
                            <pre className="p-2 bg-background/50 border border-border/60 rounded text-[10px] font-mono text-muted-foreground overflow-x-auto">
                              {JSON.stringify(log.context, null, 2)}
                            </pre>
                          </div>
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
