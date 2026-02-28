import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ExternalLink,
  BarChart3,
  DollarSign,
  Droplets,
  Calendar,
  Loader2,
} from "lucide-react";
import { getEventBySlug } from "../api/polymarket";
import EventContent from "../components/EventContent";
import type { PolyEvent, AIConfig, AIHistoryEntry } from "../types";

function formatVolume(vol: number): string {
  if (vol >= 1_000_000) return `$${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000) return `$${(vol / 1_000).toFixed(1)}K`;
  return `$${vol.toFixed(0)}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface EventDetailProps {
  aiConfig: AIConfig;
  onAnalysisComplete: (
    entry: Omit<AIHistoryEntry, "id" | "timestamp">
  ) => void;
  getLatestHistory: (eventId: string) => AIHistoryEntry | undefined;
}

export default function EventDetail({
  aiConfig,
  onAnalysisComplete,
  getLatestHistory,
}: EventDetailProps) {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const stateEvent = (location.state as { event?: PolyEvent } | null)?.event;
  const [event, setEvent] = useState<PolyEvent | null>(stateEvent ?? null);
  const [loading, setLoading] = useState(!stateEvent);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (stateEvent || !slug) return;
    setLoading(true);
    setError(null);
    getEventBySlug(slug)
      .then((data) => {
        if (data) {
          setEvent(data);
        } else {
          setError("Event not found.");
        }
      })
      .catch(() => setError("Failed to load event."))
      .finally(() => setLoading(false));
  }, [slug, stateEvent]);

  const activeMarkets = event?.markets?.filter((m) => m.active) || [];
  const polymarketUrl = event
    ? `https://polymarket.com/event/${event.slug}`
    : "#";

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-400">
          <Loader2 size={20} className="animate-spin" />
          <span>Loading event...</span>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-lg text-zinc-400">{error || "Event not found."}</p>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-zinc-300 transition-all hover:bg-white/[0.08]"
        >
          <ArrowLeft size={16} />
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto px-4 pb-0 sm:px-6 lg:px-10 xl:px-16">
      {/* Back button */}
      <div className="py-4">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
        >
          <ArrowLeft size={16} />
          Back
        </button>
      </div>

      {/* Hero */}
      <div className="relative mb-8 overflow-hidden rounded-2xl border border-white/[0.06]">
        {event.image ? (
          <img
            src={event.image}
            alt={event.title}
            className="h-56 w-full object-cover sm:h-72"
          />
        ) : (
          <div className="h-56 w-full bg-gradient-to-br from-indigo-500/20 to-violet-600/20 sm:h-72" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f1117] via-[#0f1117]/60 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
          <h1 className="mb-3 text-xl font-bold leading-snug text-white sm:text-2xl">
            {event.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={polymarketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 backdrop-blur-md transition-colors hover:bg-white/20"
            >
              <ExternalLink size={12} />
              Polymarket
            </a>
          </div>
        </div>
      </div>

      {/* Metadata badges */}
      <div className="mb-8 flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-sm">
          <BarChart3 size={14} className="text-indigo-400" />
          <span className="text-zinc-400">Markets</span>
          <span className="font-semibold text-zinc-200">
            {activeMarkets.length}
          </span>
        </div>
        {event.volume > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-sm">
            <DollarSign size={14} className="text-emerald-400" />
            <span className="text-zinc-400">Volume</span>
            <span className="font-semibold text-zinc-200">
              {formatVolume(event.volume)}
            </span>
          </div>
        )}
        {event.liquidity > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-sm">
            <Droplets size={14} className="text-sky-400" />
            <span className="text-zinc-400">Liquidity</span>
            <span className="font-semibold text-zinc-200">
              {formatVolume(event.liquidity)}
            </span>
          </div>
        )}
        {event.startDate && (
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-sm">
            <Calendar size={14} className="text-amber-400" />
            <span className="text-zinc-400">Started</span>
            <span className="font-semibold text-zinc-200">
              {formatDate(event.startDate)}
            </span>
          </div>
        )}
        {event.endDate && (
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-sm">
            <Calendar size={14} className="text-rose-400" />
            <span className="text-zinc-400">Ends</span>
            <span className="font-semibold text-zinc-200">
              {formatDate(event.endDate)}
            </span>
          </div>
        )}
      </div>

      {/* Shared content: description + markets + AI */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        <EventContent
          event={event}
          aiConfig={aiConfig}
          onAnalysisComplete={onAnalysisComplete}
          getLatestHistory={getLatestHistory}
          layout="page"
        />
      </div>

      <div className="h-8" />
    </div>
  );
}
