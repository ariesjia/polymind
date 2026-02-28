import { useState, useEffect, useCallback } from "react";
import EventGrid from "../components/EventGrid";
import EventDrawer from "../components/EventDrawer";
import FilterBar, { type FilterKey } from "../components/FilterBar";
import { getEvents } from "../api/polymarket";
import type { PolyEvent, AIConfig, AIHistoryEntry } from "../types";

const PAGE_SIZE = 50;

function getOrderOptions(filter: FilterKey) {
  switch (filter) {
    case "ending-soon":
      return { order: "endDate", ascending: true };
    case "popular":
      return { order: "volume24hr", ascending: false };
    default:
      return { order: "startDate", ascending: false };
  }
}

interface HomePageProps {
  aiConfig: AIConfig;
  onAnalysisComplete: (
    entry: Omit<AIHistoryEntry, "id" | "timestamp">
  ) => void;
  getLatestHistory: (eventId: string) => AIHistoryEntry | undefined;
  events: PolyEvent[];
  setEvents: React.Dispatch<React.SetStateAction<PolyEvent[]>>;
}

export default function HomePage({
  aiConfig,
  onAnalysisComplete,
  getLatestHistory,
  events,
  setEvents,
}: HomePageProps) {
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<PolyEvent | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("new");

  const fetchEvents = useCallback(
    async (currentOffset: number, append: boolean) => {
      const options = getOrderOptions(activeFilter);
      try {
        const data = await getEvents(PAGE_SIZE, currentOffset, options);
        if (append) {
          setEvents((prev) => [...prev, ...data]);
        } else {
          setEvents(data);
        }
        setHasMore(data.length === PAGE_SIZE);
      } catch (err) {
        console.error("Failed to fetch events:", err);
        setHasMore(false);
      }
    },
    [activeFilter, setEvents]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setOffset(0);
    setHasMore(true);

    fetchEvents(0, false).then(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [activeFilter, fetchEvents]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    const nextOffset = offset + PAGE_SIZE;
    await fetchEvents(nextOffset, true);
    setOffset(nextOffset);
    setLoadingMore(false);
  };

  const handleFilterChange = (key: FilterKey) => {
    if (key === activeFilter) return;
    setEvents([]);
    setActiveFilter(key);
  };

  return (
    <>
      <FilterBar active={activeFilter} onChange={handleFilterChange} />

      <EventGrid
        events={events}
        loading={loading}
        loadingMore={loadingMore}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
        onSelectEvent={setSelectedEvent}
      />

      <EventDrawer
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        aiConfig={aiConfig}
        onAnalysisComplete={onAnalysisComplete}
        getLatestHistory={getLatestHistory}
      />
    </>
  );
}
