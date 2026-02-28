import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Maximize2 } from "lucide-react";
import EventContent from "./EventContent";
import type { PolyEvent, AIConfig, AIHistoryEntry } from "../types";

interface EventDrawerProps {
  event: PolyEvent | null;
  onClose: () => void;
  aiConfig: AIConfig;
  onAnalysisComplete: (entry: Omit<AIHistoryEntry, "id" | "timestamp">) => void;
  getLatestHistory: (eventId: string) => AIHistoryEntry | undefined;
}

export default function EventDrawer({
  event,
  onClose,
  aiConfig,
  onAnalysisComplete,
  getLatestHistory,
}: EventDrawerProps) {
  const navigate = useNavigate();

  useEffect(() => {
    if (event) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [event]);

  const polymarketUrl = event
    ? `https://polymarket.com/event/${event.slug}`
    : "#";

  const handleOpenDetail = () => {
    if (!event) return;
    onClose();
    navigate(`/event/${event.slug}`, { state: { event } });
  };

  return (
    <AnimatePresence>
      {event && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l border-white/[0.06] bg-[#12141d]/95 backdrop-blur-xl sm:w-[880px] xl:w-[1080px] 2xl:w-[1280px]"
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-white/[0.06] px-6 py-4">
              <div className="flex-1 pr-5">
                <h2 className="text-base font-bold leading-snug text-white">
                  {event.title}
                </h2>
                <div className="mt-1.5 flex items-center gap-2">
                  <p className="text-xs text-zinc-500">{event.slug}</p>
                  <a
                    href={polymarketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-indigo-400 transition-colors hover:bg-white/[0.1] hover:text-indigo-300"
                  >
                    <ExternalLink size={11} />
                    Polymarket
                  </a>
                  <button
                    onClick={handleOpenDetail}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-indigo-400 transition-colors hover:bg-white/[0.1] hover:text-indigo-300"
                  >
                    <Maximize2 size={11} />
                    Detail
                  </button>
                </div>
              </div>
              <button
                onClick={onClose}
                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <EventContent
              event={event}
              aiConfig={aiConfig}
              onAnalysisComplete={onAnalysisComplete}
              getLatestHistory={getLatestHistory}
              layout="drawer"
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
