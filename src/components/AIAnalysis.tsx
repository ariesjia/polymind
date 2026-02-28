import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
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
  BotMessageSquare,
  Share2,
  Copy,
  Check,
  X,
  Download,
  Link2,
} from "lucide-react";
import { toPng } from "html-to-image";
import { streamChat } from "../api/ai";
import type { AIToolEvent } from "../api/ai";
import type { AIConfig, PolyEvent, Market } from "../types";
import { buildPrompt } from "../types";

type ToolStatus = "running" | "success" | "error" | "info";

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
            : eventInfo.phase === "info"
              ? "info"
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
  return /^\|\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/.test(line.trim());
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
  const expanded = raw.replace(/\|\s+\|/g, "|\n|");
  const lines = expanded.split("\n");
  const normalized: string[] = [];
  let inTableBody = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isTableRow = line.trim().startsWith("|");
    const isSep = isMarkdownTableSeparator(line);

    if (!isTableRow) {
      inTableBody = false;
      normalized.push(line);
      continue;
    }

    // Drop extra separator-like rows inside the table body
    if (inTableBody && isSep) continue;

    if (isSep) {
      inTableBody = true;
      normalized.push(line);
      continue;
    }

    normalized.push(line);

    // Only insert a separator after the first row (header) of a table block
    if (!inTableBody) {
      const nextLine = lines[i + 1];
      const nextIsTable = typeof nextLine === "string" && nextLine.trim().startsWith("|");
      if (nextIsTable && !isMarkdownTableSeparator(nextLine)) {
        const separator = buildMarkdownSeparatorFromHeader(line);
        if (separator) {
          normalized.push(separator);
          inTableBody = true;
        }
      }
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

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  eventTitle: string;
  eventSlug: string;
  segments: ContentSegment[];
}

function ShareModal({ open, onClose, eventTitle, eventSlug, segments }: ShareModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copyImgDone, setCopyImgDone] = useState(false);
  const [copyTextDone, setCopyTextDone] = useState(false);
  const [copyLinkDone, setCopyLinkDone] = useState(false);
  const [shareToXHint, setShareToXHint] = useState<string | null>(null);

  const detailUrl = eventSlug
    ? `${window.location.origin}/event/${eventSlug}`
    : "";
  const polymarketUrl = eventSlug
    ? `https://polymarket.com/event/${eventSlug}`
    : "";

  const textContent = segments
    .filter((s) => s.type === "text")
    .map((s) => s.content.trim())
    .join("\n\n");

  const generateImage = useCallback(async () => {
    if (!cardRef.current) return;
    setGenerating(true);
    try {
      const url = await toPng(cardRef.current, {
        pixelRatio: 2,
        backgroundColor: "#12141d",
      });
      setImgUrl(url);
    } catch (err) {
      console.error("Image generation failed:", err);
    } finally {
      setGenerating(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setImgUrl(null);
      setCopyImgDone(false);
      setCopyTextDone(false);
      setCopyLinkDone(false);
      setShareToXHint(null);
      setTimeout(generateImage, 100);
    }
  }, [open, generateImage]);

  const handleCopyImage = useCallback(async () => {
    if (!imgUrl) return;
    try {
      const res = await fetch(imgUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setCopyImgDone(true);
      setTimeout(() => setCopyImgDone(false), 2000);
    } catch {
      const link = document.createElement("a");
      link.download = `polymind-${eventSlug || "analysis"}.png`;
      link.href = imgUrl;
      link.click();
    }
  }, [imgUrl, eventSlug]);

  const handleDownload = useCallback(() => {
    if (!imgUrl) return;
    const link = document.createElement("a");
    link.download = `polymind-${eventSlug || "analysis"}.png`;
    link.href = imgUrl;
    link.click();
  }, [imgUrl, eventSlug]);

  const handleCopyText = useCallback(async () => {
    const lines: string[] = [];
    lines.push(`📊 ${eventTitle}`);
    if (eventSlug) {
      lines.push(`🔗 https://polymarket.com/event/${eventSlug}`);
      lines.push(`🧠 ${window.location.origin}/event/${eventSlug}`);
    }
    lines.push("");
    lines.push(textContent);
    lines.push("\n— PolyMind AI Analysis");
    await navigator.clipboard.writeText(lines.join("\n"));
    setCopyTextDone(true);
    setTimeout(() => setCopyTextDone(false), 2000);
  }, [eventTitle, eventSlug, textContent]);

  const handleCopyLink = useCallback(async () => {
    if (!detailUrl) return;
    await navigator.clipboard.writeText(detailUrl);
    setCopyLinkDone(true);
    setTimeout(() => setCopyLinkDone(false), 2000);
  }, [detailUrl]);

  const handleShareToX = useCallback(async () => {
    const shareUrl = detailUrl || window.location.href;
    const tweetText = polymarketUrl
      ? `AI Analysis: ${eventTitle}\n\nPolymarket: ${polymarketUrl}\n\nPolyMind: ${shareUrl}`
      : `AI Analysis: ${eventTitle}\n\nPolyMind: ${shareUrl}`;
    const text = tweetText.slice(0, 280);

    if (imgUrl) {
      try {
        const res = await fetch(imgUrl);
        const blob = await res.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        setShareToXHint("Image copied — paste it in your tweet");
        setTimeout(() => setShareToXHint(null), 4000);
      } catch {
        setShareToXHint("Could not copy image");
        setTimeout(() => setShareToXHint(null), 2000);
      }
    }

    const params = new URLSearchParams({ text });
    window.open(
      `https://twitter.com/intent/tweet?${params}`,
      "_blank",
      "noopener,noreferrer,width=550,height=420"
    );
  }, [eventTitle, eventSlug, detailUrl, polymarketUrl, imgUrl]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          >
            <div
              className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-white/[0.08] bg-[#16182a]/95 shadow-2xl backdrop-blur-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                  <Share2 size={16} className="text-indigo-400" />
                  Share Analysis
                </h3>
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Preview area */}
              <div className="flex-1 overflow-y-auto px-6 py-5">
                {/* Actions */}
                <div className="mb-4 flex flex-wrap gap-2">
                  <button
                    onClick={handleCopyLink}
                    disabled={!detailUrl}
                    className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-zinc-300 transition-all hover:bg-white/[0.08] disabled:opacity-40"
                  >
                    {copyLinkDone ? <Check size={14} className="text-emerald-400" /> : <Link2 size={14} />}
                    {copyLinkDone ? "Copied!" : "Copy Link"}
                  </button>
                  <button
                    onClick={() => void handleShareToX()}
                    disabled={!detailUrl}
                    className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-zinc-300 transition-all hover:bg-white/[0.08] disabled:opacity-40"
                  >
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    Share to X
                  </button>
                  <button
                    onClick={handleCopyImage}
                    disabled={!imgUrl || generating}
                    className="flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2.5 text-xs font-semibold text-indigo-300 transition-all hover:bg-indigo-500/20 disabled:opacity-40"
                  >
                    {copyImgDone ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    {copyImgDone ? "Copied!" : "Copy Image"}
                  </button>
                  <button
                    onClick={handleDownload}
                    disabled={!imgUrl || generating}
                    className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-zinc-300 transition-all hover:bg-white/[0.08] disabled:opacity-40"
                  >
                    <Download size={14} />
                    Download PNG
                  </button>
                  <button
                    onClick={handleCopyText}
                    className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-zinc-300 transition-all hover:bg-white/[0.08]"
                  >
                    {copyTextDone ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    {copyTextDone ? "Copied!" : "Copy Text"}
                  </button>
                </div>
                {shareToXHint && (
                  <p className="mb-2 text-[11px] text-amber-400/90">
                    {shareToXHint}
                  </p>
                )}

                {/* Image preview */}
                {generating && (
                  <div className="flex items-center justify-center gap-2 py-12 text-sm text-zinc-500">
                    <Loader2 size={16} className="animate-spin" />
                    Generating image...
                  </div>
                )}
                {imgUrl && (
                  <div className="overflow-hidden rounded-xl border border-white/[0.06]">
                    <img src={imgUrl} alt="Share preview" className="w-full" />
                  </div>
                )}

                {/* Hidden card for rendering */}
                <div className="absolute -left-[9999px] top-0">
                  <div
                    ref={cardRef}
                    className="w-[680px] bg-[#12141d] p-8"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    {/* Card header with logo */}
                    <div className="mb-5 flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600">
                        <Brain size={18} className="text-white" />
                      </div>
                      <span className="text-lg font-bold text-white">
                        Poly<span className="text-indigo-400">Mind</span>
                      </span>
                    </div>

                    {/* Event info */}
                    <div className="mb-5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-4">
                      <p className="text-base font-semibold leading-snug text-white">
                        {eventTitle}
                      </p>
                      {eventSlug && (
                        <p className="mt-1.5 text-xs text-zinc-500">
                          polymarket.com/event/{eventSlug}
                        </p>
                      )}
                    </div>

                    {/* AI content (text only, no think blocks) */}
                    <div className="ai-prose text-[13px] leading-relaxed">
                      {segments
                        .filter((s) => s.type === "text")
                        .map((seg, i) => (
                          <ReactMarkdown key={i} remarkPlugins={[remarkGfm]}>
                            {normalizeMarkdownTables(seg.content)}
                          </ReactMarkdown>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="mt-6 flex items-center justify-between border-t border-white/[0.06] pt-4">
                      <span className="text-[11px] text-zinc-600">
                        Generated by PolyMind AI Analysis
                      </span>
                      <span className="text-[11px] text-zinc-600">
                        {new Date().toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

interface AIResultPanelProps {
  ai: AIState;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  eventTitle?: string;
  eventSlug?: string;
}

export function AIResultPanel({ ai, scrollContainerRef, eventTitle, eventSlug }: AIResultPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(false);
  const [shareOpen, setShareOpen] = useState(false);

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

  const canShare = !ai.loading && !!ai.content && !ai.error;

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
        <div className="flex items-center gap-1">
          {canShare && (
            <button
              onClick={() => setShareOpen(true)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
            >
              <Share2 size={12} />
              Share
            </button>
          )}
          <button
            onClick={ai.runAnalysis}
            disabled={ai.loading}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-200 disabled:opacity-50"
          >
            <RotateCcw size={12} />
            Re-run
          </button>
        </div>
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
            {ai.toolActivities.map((activity, idx) => {
              const isLastInfo =
                activity.status === "info" &&
                idx === ai.toolActivities.length - 1;
              const isInfoDone =
                activity.status === "info" &&
                (!isLastInfo || !!ai.content || !ai.loading);
              const displayStatus = isInfoDone ? "success" as ToolStatus : activity.status;

              return (
              <div
                key={activity.callId}
                className="flex items-start gap-2 text-xs text-zinc-400"
              >
                {displayStatus === "running" ? (
                  <Loader2 size={14} className="mt-0.5 shrink-0 animate-spin text-indigo-400" />
                ) : displayStatus === "success" ? (
                  <CircleCheckBig size={14} className="mt-0.5 shrink-0 text-emerald-400" />
                ) : displayStatus === "info" ? (
                  <Loader2 size={14} className="mt-0.5 shrink-0 animate-spin text-indigo-400" />
                ) : (
                  <CircleAlert size={14} className="mt-0.5 shrink-0 text-red-400" />
                )}
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-zinc-300">
                    {activity.tool === "assistant" ? (
                      <BotMessageSquare size={12} className="shrink-0" />
                    ) : (
                      <Globe size={12} className="shrink-0" />
                    )}
                    <span className="font-medium">{activity.tool === "assistant" ? "AI" : activity.tool}</span>
                    <span className="text-zinc-500">
                      {displayStatus === "running"
                        ? "running"
                        : displayStatus === "success"
                          ? "completed"
                          : displayStatus === "info"
                            ? ""
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
              );
            })}
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

      {eventTitle && eventSlug && (
        <ShareModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          eventTitle={eventTitle}
          eventSlug={eventSlug}
          segments={segments}
        />
      )}
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
