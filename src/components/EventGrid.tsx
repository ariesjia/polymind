import { Loader2 } from "lucide-react";
import EventCard from "./EventCard";
import type { PolyEvent } from "../types";

interface EventGridProps {
  events: PolyEvent[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onSelectEvent: (event: PolyEvent) => void;
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03]">
      <div className="h-44 w-full animate-pulse bg-white/[0.04]" />
      <div className="space-y-4 px-5 pb-5 pt-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-white/[0.06]" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-white/[0.06]" />
        <div className="flex justify-between pt-1">
          <div className="h-3 w-16 animate-pulse rounded bg-white/[0.04]" />
          <div className="h-3 w-12 animate-pulse rounded bg-white/[0.04]" />
        </div>
      </div>
    </div>
  );
}

export default function EventGrid({
  events,
  loading,
  loadingMore,
  hasMore,
  onLoadMore,
  onSelectEvent,
}: EventGridProps) {
  if (loading) {
    return (
      <div className="px-6 pb-10 pt-10 sm:px-8 lg:px-10">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-7 2xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="mb-4 text-5xl opacity-30">🔮</div>
        <p className="text-lg font-medium text-zinc-400">No events found</p>
        <p className="mt-1 text-sm text-zinc-500">
          Check back later for new prediction markets
        </p>
      </div>
    );
  }

  return (
    <div className="px-6 pb-10 pt-6 sm:px-8 lg:px-10">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-7 2xl:grid-cols-5">
        {events.map((event, index) => (
          <EventCard
            key={event.id}
            event={event}
            index={index}
            onClick={() => onSelectEvent(event)}
          />
        ))}
      </div>

      {hasMore && (
        <div className="mt-12 flex justify-center pb-4">
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-8 py-3 text-sm font-medium text-zinc-300 transition-all hover:border-white/[0.15] hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
          >
            {loadingMore ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Loading...
              </>
            ) : (
              "Load More"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
