import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import Header from "./components/Header";
import SettingsModal from "./components/SettingsModal";
import HistoryDrawer from "./components/HistoryDrawer";
import Toast from "./components/Toast";
import HomePage from "./pages/HomePage";
import EventDetail from "./pages/EventDetail";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useAIHistory } from "./hooks/useAIHistory";
import type { PolyEvent, AIConfig } from "./types";
import { DEFAULT_AI_CONFIG } from "./types";

export default function App() {
  const [events, setEvents] = useState<PolyEvent[]>([]);
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

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <Header
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenHistory={() => setHistoryOpen(true)}
        historyCount={entries.length}
      />

      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              aiConfig={aiConfig}
              onAnalysisComplete={addEntry}
              getLatestHistory={getLatestForEvent}
              events={events}
              setEvents={setEvents}
            />
          }
        />
        <Route
          path="/event/:slug"
          element={
            <EventDetail
              aiConfig={aiConfig}
              onAnalysisComplete={addEntry}
              getLatestHistory={getLatestForEvent}
            />
          }
        />
      </Routes>

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

      <Analytics />
    </div>
  );
}
