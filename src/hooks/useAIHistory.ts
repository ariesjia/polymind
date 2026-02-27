import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";
import type { AIHistoryEntry } from "../types";

const STORAGE_KEY = "polymind-ai-history";
const MAX_ENTRIES = 100;

export function useAIHistory() {
  const [entries, setEntries] = useLocalStorage<AIHistoryEntry[]>(
    STORAGE_KEY,
    []
  );

  const addEntry = useCallback(
    (entry: Omit<AIHistoryEntry, "id" | "timestamp">) => {
      const newEntry: AIHistoryEntry = {
        ...entry,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
      };
      setEntries((prev) => [newEntry, ...prev].slice(0, MAX_ENTRIES));
    },
    [setEntries]
  );

  const removeEntry = useCallback(
    (id: string) => {
      setEntries((prev) => prev.filter((e) => e.id !== id));
    },
    [setEntries]
  );

  const clearAll = useCallback(() => {
    setEntries([]);
  }, [setEntries]);

  const getLatestForEvent = useCallback(
    (eventId: string): AIHistoryEntry | undefined => {
      return entries.find((e) => e.eventId === eventId);
    },
    [entries]
  );

  return { entries, addEntry, removeEntry, clearAll, getLatestForEvent };
}
