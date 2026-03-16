"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { History, Loader2, Clock, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface HistoryItem {
  id: string;
  eventId: string;
  eventTitle: string | null;
  eventSlug: string | null;
  content: string;
  timestamp: number;
  credits: number;
}

export default function HistoryPage() {
  const { token } = useAuth();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setHistory([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch("/api/history", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setHistory(data.results ?? []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div>
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-bold text-white">
        <History size={24} className="text-indigo-400" />
        Analysis History
      </h1>
      {loading ? (
        <div className="flex items-center gap-2 py-12 text-sm text-zinc-500">
          <Loader2 size={14} className="animate-spin" />
          Loading...
        </div>
      ) : history.length === 0 ? (
        <p className="py-12 text-sm text-zinc-500">
          No analysis history yet. Run AI analysis on any event to see it here.
        </p>
      ) : (
        <div className="space-y-3">
          {history.map((item) => (
            <Link
              key={item.id}
              href={item.eventSlug ? `/event/${item.eventSlug}` : "#"}
              className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04] hover:border-white/[0.08]"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-200">
                  {item.eventTitle || "Untitled Event"}
                </p>
                <div className="mt-1.5 flex items-center gap-3 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    {new Date(item.timestamp).toLocaleString()}
                  </span>
                  <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                    -{item.credits} credit{item.credits !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              <ChevronRight size={16} className="shrink-0 text-zinc-500" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
