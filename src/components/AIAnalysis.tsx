import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Sparkles,
  Loader2,
  RotateCcw,
  AlertCircle,
  ChevronRight,
  Brain,
  Globe,
  CircleCheckBig,
  CircleAlert,
} from "lucide-react";
import { streamChat } from "../api/ai";
import type { AIToolEvent } from "../api/ai";
import type { AIConfig, PolyEvent, Market } from "../types";
import { buildPrompt } from "../types";

type ToolStatus = "running" | "success" | "error";

interface AIToolActivity {
  callId: string;
  tool: string;
  query: string;
  status: ToolStatus;
  message?: string;
}

export interface AIState {
  content: string;
  loading: boolean;
  error: string | null;
  started: boolean;
  restored: boolean;
  toolActivities: AIToolActivity[];
  runAnalysis: () => void;
  restore: (content: string) => void;
  reset: () => void;
}

export function useAIAnalysis(
  config: AIConfig,
  event: PolyEvent | null,
  markets: Market[],
  onComplete?: (content: string) => void
): AIState {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [restored, setRestored] = useState(false);
  const [toolActivities, setToolActivities] = useState<AIToolActivity[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const contentRef = useRef("");

  const handleToolEvent = useCallback((eventInfo: AIToolEvent) => {
    setToolActivities((prev) => {
      const index = prev.findIndex((item) => item.callId === eventInfo.callId);
      const nextStatus: ToolStatus =
        eventInfo.phase === "start"
          ? "running"
          : eventInfo.phase === "success"
            ? "success"
            : "error";

      if (index === -1) {
        return [
          ...prev,
          {
            callId: eventInfo.callId,
            tool: eventInfo.tool,
            query: eventInfo.query,
            status: nextStatus,
            message: eventInfo.message,
          },
        ];
      }

      const next = [...prev];
      next[index] = {
        ...next[index],
        status: nextStatus,
        message: eventInfo.message,
        query: eventInfo.query || next[index].query,
      };
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setContent("");
    contentRef.current = "";
    setLoading(false);
    setError(null);
    setStarted(false);
    setRestored(false);
    setToolActivities([]);
  }, []);

  const restore = useCallback((restoredContent: string) => {
    setContent(restoredContent);
    contentRef.current = restoredContent;
    setStarted(true);
    setRestored(true);
    setLoading(false);
    setError(null);
    setToolActivities([]);
  }, []);

  const runAnalysis = useCallback(() => {
    if (!config.apiKey) {
      setError("Please configure your API Key in Settings first.");
      setStarted(true);
      return;
    }
    if (!event) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setContent("");
    contentRef.current = "";
    setError(null);
    setLoading(true);
    setStarted(true);
    setRestored(false);
    setToolActivities([]);

    const prompt = buildPrompt(config.promptTemplate, event, markets);

    streamChat(
      config,
      prompt,
      (chunk) => {
        contentRef.current += chunk;
        setContent((prev) => prev + chunk);
      },
      () => {
        setLoading(false);
        if (contentRef.current && onComplete) {
          onComplete(contentRef.current);
        }
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
      controller.signal,
      handleToolEvent
    );
  }, [config, event, markets, onComplete, handleToolEvent]);

  return {
    content,
    loading,
    error,
    started,
    restored,
    toolActivities,
    runAnalysis,
    restore,
    reset,
  };
}

interface ContentSegment {
  type: "text" | "think";
  content: string;
}

function isMarkdownTableSeparator(line: string): boolean {
  return /^\|\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line.trim());
}

function buildMarkdownSeparatorFromHeader(headerLine: string): string {
  const columns = headerLine
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
  if (columns.length < 2) return "";
  return `| ${columns.map(() => "---").join(" | ")} |`;
}

function normalizeMarkdownTables(raw: string): string {
  // Many models emit "table-like" text as one long line with `| |` between rows.
  // Split those implicit row boundaries so remark-gfm can parse the table.
  const expanded = raw.replace(/\|\s+\|/g, "|\n|");
  const lines = expanded.split("\n");
  const normalized: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    normalized.push(line);

    const isHeader = line.trim().startsWith("|") && line.includes("|");
    const nextLine = lines[i + 1];
    const hasNextRow = typeof nextLine === "string" && nextLine.trim().startsWith("|");

    if (!isHeader || !hasNextRow) continue;
    if (isMarkdownTableSeparator(nextLine)) continue;

    const separator = buildMarkdownSeparatorFromHeader(line);
    if (separator) {
      normalized.push(separator);
    }
  }

  return normalized.join("\n");
}

function parseThinkBlocks(raw: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  let remaining = raw;

  while (remaining.length > 0) {
    const openIdx = remaining.indexOf("<think>");
    if (openIdx === -1) {
      if (remaining.trim()) segments.push({ type: "text", content: remaining });
      break;
    }

    const before = remaining.slice(0, openIdx);
    if (before.trim()) segments.push({ type: "text", content: before });

    const closeIdx = remaining.indexOf("</think>", openIdx);
    if (closeIdx === -1) {
      // think tag opened but not closed yet (still streaming)
      const thinkContent = remaining.slice(openIdx + 7);
      segments.push({ type: "think", content: thinkContent });
      break;
    }

    const thinkContent = remaining.slice(openIdx + 7, closeIdx);
    segments.push({ type: "think", content: thinkContent });
    remaining = remaining.slice(closeIdx + 8);
  }

  return segments;
}

function ThinkBlock({ content, defaultOpen }: { content: string; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mb-4 rounded-lg border border-white/[0.06] bg-white/[0.02]">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-300"
      >
        <ChevronRight
          size={14}
          className={`shrink-0 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        />
        <Brain size={14} className="shrink-0" />
        <span>Thinking process</span>
        {!open && (
          <span className="ml-auto text-zinc-600">
            {content.length > 50 ? content.slice(0, 50).trim() + "..." : content.trim()}
          </span>
        )}
      </button>
      {open && (
        <div className="border-t border-white/[0.04] px-4 py-3">
          <div className="ai-prose text-xs leading-relaxed text-zinc-500">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {normalizeMarkdownTables(content)}
              </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

interface AIResultPanelProps {
  ai: AIState;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}

export function AIResultPanel({ ai, scrollContainerRef }: AIResultPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(false);

  useEffect(() => {
    if (ai.loading && ai.started) {
      shouldAutoScroll.current = true;
      setTimeout(() => {
        panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
    if (!ai.loading) {
      shouldAutoScroll.current = false;
    }
  }, [ai.loading, ai.started]);

  useEffect(() => {
    if (!shouldAutoScroll.current || !scrollContainerRef?.current) return;
    const container = scrollContainerRef.current;
    container.scrollTop = container.scrollHeight;
  }, [ai.content, scrollContainerRef]);

  const segments = useMemo(() => parseThinkBlocks(ai.content), [ai.content]);
  const isThinking = ai.loading && segments.length > 0 && segments[segments.length - 1].type === "think";

  if (!ai.started) return null;

  return (
    <div ref={panelRef} className="mt-8 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-2.5 text-sm font-semibold text-zinc-200">
          <Sparkles size={14} className="text-indigo-400" />
          AI Analysis
          {ai.restored && (
            <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-zinc-500">
              cached
            </span>
          )}
        </h4>
        <button
          onClick={ai.runAnalysis}
          disabled={ai.loading}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-200 disabled:opacity-50"
        >
          <RotateCcw size={12} />
          Re-run
        </button>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
        {ai.loading && !ai.content && ai.toolActivities.length === 0 && (
          <div className="flex items-center gap-2.5 text-sm text-zinc-400">
            <Loader2 size={14} className="animate-spin" />
            Analyzing markets...
          </div>
        )}

        {ai.toolActivities.length > 0 && (
          <div className="mb-4 mt-4 space-y-2 rounded-lg border border-white/[0.06] bg-black/20 p-3">
            {ai.toolActivities.map((activity) => (
              <div
                key={activity.callId}
                className="flex items-start gap-2 text-xs text-zinc-400"
              >
                {activity.status === "running" ? (
                  <Loader2 size={14} className="mt-0.5 shrink-0 animate-spin text-indigo-400" />
                ) : activity.status === "success" ? (
                  <CircleCheckBig size={14} className="mt-0.5 shrink-0 text-emerald-400" />
                ) : (
                  <CircleAlert size={14} className="mt-0.5 shrink-0 text-red-400" />
                )}
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-zinc-300">
                    <Globe size={12} className="shrink-0" />
                    <span className="font-medium">{activity.tool}</span>
                    <span className="text-zinc-500">
                      {activity.status === "running"
                        ? "running"
                        : activity.status === "success"
                          ? "completed"
                          : "failed"}
                    </span>
                  </p>
                  {activity.query && (
                    <p className="mt-1 truncate text-zinc-500">query: {activity.query}</p>
                  )}
                  {activity.message && (
                    <p className="mt-0.5 text-zinc-500">{activity.message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {segments.map((seg, i) =>
          seg.type === "think" ? (
            <ThinkBlock
              key={i}
              content={seg.content}
              defaultOpen={ai.loading && i === segments.length - 1}
            />
          ) : (
            <div key={i} className="ai-prose">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {normalizeMarkdownTables(seg.content)}
              </ReactMarkdown>
            </div>
          )
        )}

        {ai.loading && ai.content && (
          <div className="mt-3 flex items-center gap-2">
            {isThinking && (
              <span className="mr-1 text-xs text-zinc-500">Thinking</span>
            )}
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-400" />
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-400" style={{ animationDelay: "0.2s" }} />
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-400" style={{ animationDelay: "0.4s" }} />
          </div>
        )}

        {ai.error && (
          <div className="flex items-start gap-2.5 rounded-lg bg-red-500/10 p-4 text-sm text-red-400">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {ai.error}
          </div>
        )}
      </div>
    </div>
  );
}

export function AITriggerBar({ ai, aiConfig }: { ai: AIState; aiConfig: AIConfig }) {
  const missingConfig = !aiConfig.apiKey || !aiConfig.baseUrl;

  return (
    <div className="shrink-0 border-t border-white/[0.06] bg-[#12141d]/90 px-7 py-4 backdrop-blur-md">
      <button
        onClick={ai.runAnalysis}
        disabled={ai.loading || missingConfig}
        className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:shadow-xl hover:shadow-indigo-500/30 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {ai.loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Analyzing...
          </>
        ) : ai.started ? (
          <>
            <RotateCcw size={16} />
            Re-run AI Analysis
          </>
        ) : (
          <>
            <Sparkles size={16} />
            AI Analysis
          </>
        )}
      </button>
      {missingConfig && (
        <p className="mt-2 text-center text-xs text-zinc-500">
          请先在 Settings 中配置 API Key 和 Base URL
        </p>
      )}
    </div>
  );
}
