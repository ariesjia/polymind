import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, ChevronRight, Clock, Sparkles, Trash, ArrowRight } from "lucide-react";
import type { AIHistoryEntry } from "../types";
import { parseThinkBlocks } from "../utils/aiContent";
import { AIContentDisplay } from "./AIContentDisplay";

interface HistoryDrawerProps {
  open: boolean;
  onClose: () => void;
  entries: AIHistoryEntry[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

function HistoryEntry({
  entry,
  onRemove,
  onGoToDetail,
}: {
  entry: AIHistoryEntry;
  onRemove: () => void;
  onGoToDetail: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const segments = useMemo(() => parseThinkBlocks(entry.content), [entry.content]);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02]">
      {/* Summary row */}
      <div className="flex w-full items-start gap-3 px-5 py-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-0.5 shrink-0 rounded p-0.5 text-zinc-500 transition-colors hover:text-zinc-300"
        >
          <ChevronRight
            size={14}
            className={`transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
          />
        </button>
        <div className="flex-1 min-w-0">
          <button
            onClick={onGoToDetail}
            className="group block w-full text-left"
          >
            <p className="text-sm font-medium leading-snug text-zinc-200 line-clamp-2 transition-colors group-hover:text-indigo-400">
              {entry.eventTitle}
            </p>
          </button>
          <p className="mt-1.5 text-[11px] text-zinc-600 truncate">{entry.eventSlug}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {timeAgo(entry.timestamp)}
            </span>
            <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
              {entry.model}
            </span>
            <button
              onClick={onGoToDetail}
              className="inline-flex items-center gap-1 rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-medium text-indigo-400 transition-colors hover:bg-indigo-500/30 hover:text-indigo-300"
            >
              <ArrowRight size={9} />
              View details
            </button>
          </div>
        </div>
        <button
          onClick={onRemove}
          className="mt-0.5 shrink-0 rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/[0.04] px-5 py-5">
              <AIContentDisplay segments={segments} compact />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function HistoryDrawer({
  open,
  onClose,
  entries,
  onRemove,
  onClearAll,
}: HistoryDrawerProps) {
  const navigate = useNavigate();

  const handleGoToDetail = (slug: string) => {
    navigate(`/event/${slug}`);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed left-0 top-0 z-50 flex h-full w-full flex-col border-r border-white/[0.06] bg-[#12141d]/95 backdrop-blur-xl sm:w-[520px]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-7 py-6">
              <h2 className="flex items-center gap-2.5 text-lg font-bold text-white">
                <Sparkles size={18} className="text-indigo-400" />
                Analysis History
              </h2>
              <div className="flex items-center gap-2">
                {entries.length > 0 && (
                  <button
                    onClick={onClearAll}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash size={12} />
                    Clear All
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-7 py-6">
              {entries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="mb-3 text-4xl opacity-20">📋</div>
                  <p className="text-sm font-medium text-zinc-400">
                    No analysis history yet
                  </p>
                  <p className="mt-1 text-xs text-zinc-600">
                    Run an AI analysis on any event to see it here
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {entries.map((entry) => (
                    <HistoryEntry
                      key={entry.id}
                      entry={entry}
                      onRemove={() => onRemove(entry.id)}
                      onGoToDetail={() => handleGoToDetail(entry.eventSlug)}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
