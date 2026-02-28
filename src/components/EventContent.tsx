import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown, ChevronsDownUp } from "lucide-react";
import MarketItem from "./MarketItem";
import { useAIAnalysis, AIResultPanel, AITriggerBar } from "./AIAnalysis";
import type { PolyEvent, AIConfig, AIHistoryEntry } from "../types";

const DESC_COLLAPSE_SHORT = 120;
const DESC_COLLAPSE_LONG = 300;

function DescriptionBlock({
  text,
  collapseLen = DESC_COLLAPSE_SHORT,
}: {
  text: string;
  collapseLen?: number;
}) {
  const isLong = text.length > collapseLen;
  const [expanded, setExpanded] = useState(false);

  const displayed =
    isLong && !expanded
      ? text.slice(0, collapseLen).replace(/\s+\S*$/, "") + "..."
      : text;

  return (
    <div className="mb-5">
      <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Description
      </h3>
      <p className="whitespace-pre-line break-words text-sm leading-relaxed text-zinc-400">
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

interface EventContentProps {
  event: PolyEvent;
  aiConfig: AIConfig;
  onAnalysisComplete: (
    entry: Omit<AIHistoryEntry, "id" | "timestamp">
  ) => void;
  getLatestHistory: (eventId: string) => AIHistoryEntry | undefined;
  layout?: "drawer" | "page";
}

export default function EventContent({
  event,
  aiConfig,
  onAnalysisComplete,
  getLatestHistory,
  layout = "drawer",
}: EventContentProps) {
  const activeMarkets = event.markets?.filter((m) => m.active) || [];
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleComplete = useCallback(
    (content: string) => {
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

  const [obOverride, setObOverride] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    ai.reset();
    setObOverride(undefined);
    const prev = getLatestHistory(event.id);
    if (prev) {
      setTimeout(() => ai.restore(prev.content), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id]);

  const isPage = layout === "page";

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div
        ref={scrollRef}
        className={`flex-1 overflow-y-auto ${isPage ? "px-6 py-6 sm:px-8" : "px-6 py-4"}`}
      >
        {event.description && (
          <DescriptionBlock
            text={event.description}
            collapseLen={isPage ? DESC_COLLAPSE_LONG : DESC_COLLAPSE_SHORT}
          />
        )}

        {activeMarkets.length > 0 && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Markets ({activeMarkets.length})
              </h3>
              <button
                onClick={() => setObOverride((prev) => (prev === false || prev === undefined) ? true : false)}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-300"
              >
                {obOverride === true ? <ChevronsDownUp size={12} /> : <ChevronsUpDown size={12} />}
                {obOverride === true ? "Collapse All" : "Expand All"}
              </button>
            </div>
            <div
              className={
                isPage
                  ? "grid grid-cols-1 gap-4 lg:grid-cols-2"
                  : "space-y-3"
              }
            >
              {activeMarkets.map((market) => (
                <MarketItem
                  key={market.id}
                  market={market}
                  obOpenOverride={obOverride}
                />
              ))}
            </div>
          </div>
        )}

        <AIResultPanel
          ai={ai}
          scrollContainerRef={scrollRef}
          eventTitle={event.title}
          eventSlug={event.slug}
        />
      </div>

      <AITriggerBar ai={ai} aiConfig={aiConfig} />
    </div>
  );
}
