import { useState, useEffect, useCallback } from "react";
import Header from "./components/Header";
import EventGrid from "./components/EventGrid";
import EventDrawer from "./components/EventDrawer";
import SettingsModal from "./components/SettingsModal";
import HistoryDrawer from "./components/HistoryDrawer";
import Toast from "./components/Toast";
import { getEvents } from "./api/polymarket";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useAIHistory } from "./hooks/useAIHistory";
import type { PolyEvent, AIConfig } from "./types";
import { DEFAULT_AI_CONFIG } from "./types";

const PAGE_SIZE = 50;

export default function App() {
  const [events, setEvents] = useState<PolyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [selectedEvent, setSelectedEvent] = useState<PolyEvent | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [aiConfig, setAiConfig] = useLocalStorage<AIConfig>(
    "polymind-ai-config",
    DEFAULT_AI_CONFIG
  );

  const { entries, addEntry, removeEntry, clearAll, getLatestForEvent } =
    useAIHistory();

  const handleSaveConfig = (config: AIConfig) => {
    setAiConfig(config);
    setToastVisible(true);
  };

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
    []
  );

  useEffect(() => {
    setLoading(true);
    fetchEvents(0, false).finally(() => setLoading(false));
  }, [fetchEvents]);

  const handleLoadMore = async () => {
    const nextOffset = offset + PAGE_SIZE;
    setLoadingMore(true);
    await fetchEvents(nextOffset, true);
    setOffset(nextOffset);
    setLoadingMore(false);
  };

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <Header
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenHistory={() => setHistoryOpen(true)}
        historyCount={entries.length}
      />

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
        onAnalysisComplete={addEntry}
        getLatestHistory={getLatestForEvent}
      />

      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        entries={entries}
        onRemove={removeEntry}
        onClearAll={clearAll}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        config={aiConfig}
        onSave={handleSaveConfig}
        events={events}
      />

      <Toast
        message="Settings saved successfully"
        visible={toastVisible}
        onClose={() => setToastVisible(false)}
      />
    </div>
  );
}
