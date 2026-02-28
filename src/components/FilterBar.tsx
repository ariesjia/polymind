import { Sparkles, Clock, TrendingUp, type LucideIcon } from "lucide-react";

export type FilterKey = "new" | "popular" | "ending-soon";

interface TabDef {
  key: FilterKey;
  label: string;
  icon: LucideIcon;
}

export const TABS: TabDef[] = [
  { key: "new", label: "New", icon: Sparkles },
  { key: "popular", label: "Popular", icon: TrendingUp },
  { key: "ending-soon", label: "Ending Soon", icon: Clock },
];

interface FilterBarProps {
  active: FilterKey;
  onChange: (key: FilterKey) => void;
}

export default function FilterBar({ active, onChange }: FilterBarProps) {
  return (
    <div className="flex items-center gap-2 px-6 pt-6 sm:px-8 lg:px-10">
      {TABS.map(({ key, label, icon: Icon }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              isActive
                ? "border border-indigo-500/30 bg-indigo-500/15 text-indigo-300 shadow-sm shadow-indigo-500/10"
                : "border border-white/[0.06] bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200"
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
