import { Settings, Brain, History } from "lucide-react";

interface HeaderProps {
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  historyCount: number;
}

export default function Header({ onOpenSettings, onOpenHistory, historyCount }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0f1117]/80 backdrop-blur-xl">
      <div className="flex h-[72px] items-center justify-between px-6 sm:px-8 lg:px-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
            <Brain size={20} className="text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Poly<span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Mind</span>
          </h1>
        </div>
        <div className="flex items-center gap-1">
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
