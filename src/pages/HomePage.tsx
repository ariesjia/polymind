import { useState, useEffect, useCallback } from "react";
import EventGrid from "../components/EventGrid";
import EventDrawer from "../components/EventDrawer";
import { getEvents } from "../api/polymarket";
import type { PolyEvent, AIConfig, AIHistoryEntry } from "../types";

const PAGE_SIZE = 50;

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

  const fetchEvents = useCallback(
    async (currentOffset: number, append: boolean) => {
      try {
        const data = await getEvents(PAGE_SIZE, currentOffset);
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
    [setEvents]
  );

  useEffect(() => {
    if (events.length > 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchEvents(0, false).finally(() => setLoading(false));
  }, [fetchEvents, events.length]);

  const handleLoadMore = async () => {
    const nextOffset = offset + PAGE_SIZE;
    setLoadingMore(true);
    await fetchEvents(nextOffset, true);
    setOffset(nextOffset);
    setLoadingMore(false);
  };

  return (
    <>
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
