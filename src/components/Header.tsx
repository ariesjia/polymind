import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Settings,
  History,
  Search,
  X,
  Loader2,
  BarChart3,
} from "lucide-react";
import { searchEvents } from "../api/polymarket";
import type { PolyEvent } from "../types";

interface HeaderProps {
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  historyCount: number;
}

function formatVolume(vol: number): string {
  if (vol >= 1_000_000) return `$${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000) return `$${(vol / 1_000).toFixed(1)}K`;
  return `$${vol.toFixed(0)}`;
}

export default function Header({
  onOpenSettings,
  onOpenHistory,
  historyCount,
}: HeaderProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PolyEvent[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    try {
      const data = await searchEvents(q, 8);
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    setOpen(true);
    debounceRef.current = setTimeout(() => doSearch(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, doSearch]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = (event: PolyEvent) => {
    setQuery("");
    setOpen(false);
    setResults([]);
    navigate(`/event/${event.slug}`, { state: { event } });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0f1117]/80 backdrop-blur-xl">
      <div className="flex h-[72px] items-center gap-4 px-6 sm:px-8 lg:px-10">
        {/* Logo */}
        <Link to="/" className="flex shrink-0 items-center gap-3">
          <img src="/logo.svg" alt="PolyMind" className="h-10 w-10 rounded-xl object-contain" />
          <h1 className="text-xl font-bold tracking-tight text-white">
            Poly
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              Mind
            </span>
          </h1>
        </Link>

        {/* Search */}
        <div ref={containerRef} className="relative w-full max-w-sm">
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => query.trim() && setOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder="Search events..."
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5 pl-10 pr-9 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-all focus:border-indigo-500/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-indigo-500/30"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery("");
                  setResults([]);
                  setOpen(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Dropdown */}
          {open && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[400px] overflow-y-auto rounded-xl border border-white/[0.08] bg-[#16182a]/95 shadow-2xl backdrop-blur-xl">
              {searching && results.length === 0 && (
                <div className="flex items-center gap-2.5 px-4 py-5 text-sm text-zinc-500">
                  <Loader2 size={14} className="animate-spin" />
                  Searching...
                </div>
              )}

              {!searching && query.trim() && results.length === 0 && (
                <div className="px-4 py-5 text-center text-sm text-zinc-500">
                  No events found for "{query}"
                </div>
              )}

              {results.map((ev) => {
                const activeCount =
                  ev.markets?.filter(
                    (m) => m.active === true && !m.closed
                  ).length ?? 0;
                return (
                  <button
                    key={ev.id}
                    onClick={() => handleSelect(ev)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.06]"
                  >
                    {ev.image ? (
                      <img
                        src={ev.image}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 shrink-0 rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-600/20" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-medium leading-snug text-zinc-200">
                        {ev.title}
                      </p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <BarChart3 size={10} />
                          {activeCount} market{activeCount !== 1 ? "s" : ""}
                        </span>
                        {ev.volume > 0 && (
                          <span>Vol {formatVolume(ev.volume)}</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right actions */}
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <button
            onClick={onOpenHistory}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 transition-all hover:bg-white/[0.06] hover:text-white"
            aria-label="History"
          >
            <History size={19} />
            {historyCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-500 px-1 text-[9px] font-bold text-white">
                {historyCount > 99 ? "99+" : historyCount}
              </span>
            )}
          </button>
          <button
            onClick={onOpenSettings}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 transition-all hover:bg-white/[0.06] hover:text-white"
            aria-label="Settings"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}
