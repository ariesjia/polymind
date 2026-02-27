import { useEffect, useRef, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import MarketItem from "./MarketItem";
import { useAIAnalysis, AIResultPanel, AITriggerBar } from "./AIAnalysis";
import type { PolyEvent, AIConfig, AIHistoryEntry } from "../types";

interface EventDrawerProps {
  event: PolyEvent | null;
  onClose: () => void;
  aiConfig: AIConfig;
  onAnalysisComplete: (entry: Omit<AIHistoryEntry, "id" | "timestamp">) => void;
  getLatestHistory: (eventId: string) => AIHistoryEntry | undefined;
}

const DESC_COLLAPSE_LEN = 120;

function DescriptionBlock({ text }: { text: string }) {
  const isLong = text.length > DESC_COLLAPSE_LEN;
  const [expanded, setExpanded] = useState(false);

  const displayed = isLong && !expanded
    ? text.slice(0, DESC_COLLAPSE_LEN).replace(/\s+\S*$/, "") + "..."
    : text;

  return (
    <div className="mb-5">
      <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Description
      </h3>
      <p className="whitespace-pre-line break-words text-xs leading-relaxed text-zinc-500">
        {displayed}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 flex items-center gap-1 text-xs font-medium text-indigo-400 transition-colors hover:text-indigo-300"
        >
          {expanded ? (
            <>
              <ChevronUp size={12} />
              Show less
            </>
          ) : (
            <>
              <ChevronDown size={12} />
              Show more
            </>
          )}
        </button>
      )}
    </div>
  );
}

export default function EventDrawer({
  event,
  onClose,
  aiConfig,
  onAnalysisComplete,
  getLatestHistory,
}: EventDrawerProps) {
  const activeMarkets = event?.markets?.filter((m) => m.active) || [];
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleComplete = useCallback(
    (content: string) => {
      if (!event) return;
      onAnalysisComplete({
        eventId: event.id,
        eventTitle: event.title,
        eventSlug: event.slug,
        content,
        model: aiConfig.model,
      });
    },
    [event, aiConfig.model, onAnalysisComplete]
  );

  const ai = useAIAnalysis(aiConfig, event, activeMarkets, handleComplete);

  // Reset AI state and restore from history when switching events
  useEffect(() => {
    ai.reset();
    if (!event) return;
    const prev = getLatestHistory(event.id);
    if (prev) {
      // Delay restore so reset clears state first
      setTimeout(() => ai.restore(prev.content), 0);
    }
    // Only run when event changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id]);

  useEffect(() => {
    if (event) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [event]);

  const polymarketUrl = event
    ? `https://polymarket.com/event/${event.slug}`
    : "#";

  return (
    <AnimatePresence>
      {event && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l border-white/[0.06] bg-[#12141d]/95 backdrop-blur-xl sm:w-[880px]"
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-white/[0.06] px-6 py-4">
              <div className="flex-1 pr-5">
                <h2 className="text-base font-bold leading-snug text-white">
                  {event.title}
                </h2>
                <div className="mt-1.5 flex items-center gap-3">
                  <p className="text-xs text-zinc-500">{event.slug}</p>
                  <a
                    href={polymarketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-indigo-400 transition-colors hover:bg-white/[0.1] hover:text-indigo-300"
                  >
                    <ExternalLink size={11} />
                    Polymarket
                  </a>
                </div>
              </div>
              <button
                onClick={onClose}
                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body — scrollable */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4">
              {/* Description */}
              {event.description && (
                <DescriptionBlock text={event.description} />
              )}

              {/* Markets */}
              {activeMarkets.length > 0 && (
                <div>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Markets ({activeMarkets.length})
                  </h3>
                  <div className="space-y-3">
                    {activeMarkets.map((market) => (
                      <MarketItem key={market.id} market={market} />
                    ))}
                  </div>
                </div>
              )}

              {/* AI Analysis result */}
              <AIResultPanel ai={ai} scrollContainerRef={scrollRef} />
            </div>

            {/* Fixed bottom bar */}
            <AITriggerBar ai={ai} aiConfig={aiConfig} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
