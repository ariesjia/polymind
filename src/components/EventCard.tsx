import { motion } from "framer-motion";
import { BarChart3, Clock, Gift, Timer } from "lucide-react";
import Tooltip from "./Tooltip";
import type { PolyEvent } from "../types";

interface EventCardProps {
  event: PolyEvent;
  index: number;
  onClick: () => void;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function timeUntil(dateStr: string): string | null {
  if (!dateStr) return null;
  const end = new Date(dateStr).getTime();
  const diff = end - Date.now();
  if (diff <= 0) return "Ended";
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  return `${months}mo`;
}

function formatVolume(vol: number): string {
  if (vol >= 1_000_000) return `$${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000) return `$${(vol / 1_000).toFixed(1)}K`;
  return `$${vol.toFixed(0)}`;
}

export default function EventCard({ event, index, onClick }: EventCardProps) {
  const activeMarkets =
    event.markets?.filter((m) => m.active === true && !m.closed) || [];
  const totalDailyReward = activeMarkets.reduce((sum, m) => {
    const rate = m.clobRewards?.[0]?.rewardsDailyRate ?? 0;
    return sum + rate;
  }, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: "easeOut" }}
      onClick={onClick}
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.06] hover:shadow-xl hover:shadow-indigo-500/5"
    >
      {/* Image */}
      <div className="relative h-44 w-full overflow-hidden">
        {event.image ? (
          <img
            src={event.image}
            alt={event.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-indigo-500/20 to-violet-600/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f1117] via-transparent to-transparent" />

        {/* Badges */}
        <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white/80 backdrop-blur-md">
            <BarChart3 size={12} />
            {activeMarkets.length} market{activeMarkets.length !== 1 ? "s" : ""}
          </div>
          {totalDailyReward > 0 && (
            <div className="flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-1 text-[11px] font-semibold text-amber-300 backdrop-blur-md">
              <Gift size={11} />
              ${totalDailyReward.toLocaleString()}/day
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-4 pt-3">
        <h3 className="mb-2.5 line-clamp-2 h-[2.75rem] text-[0.95rem] font-semibold leading-snug text-zinc-100 transition-colors group-hover:text-white">
          {event.title}
        </h3>

        <div className="flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Clock size={12} className="shrink-0" />
              <span>{timeAgo(event.startDate || event.createdAt)}</span>
            </div>
            {event.endDate && (() => {
              const remaining = timeUntil(event.endDate);
              if (!remaining) return null;
              const isUrgent = remaining === "Ended" || remaining.endsWith("h") || remaining.endsWith("m");
              return (
                <Tooltip content={`Est. ${new Date(event.endDate).toLocaleString()} · May not be accurate`}>
                  <div className={`flex items-center gap-1 ${isUrgent ? "text-rose-400" : "text-zinc-500"}`}>
                    <Timer size={11} className="shrink-0" />
                    <span>~{remaining}</span>
                  </div>
                </Tooltip>
              );
            })()}
          </div>
          {event.volume > 0 && (
            <span className="font-medium text-zinc-400">
              Vol {formatVolume(event.volume)}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
