import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

interface ToastProps {
  message: string;
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, visible, onClose, duration = 2500 }: ToastProps) {
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [visible, onClose, duration]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="fixed bottom-8 left-1/2 z-[100] -translate-x-1/2"
        >
          <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.1] bg-[#1a1d2e]/95 px-5 py-3 shadow-2xl backdrop-blur-xl">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
            <span className="text-sm font-medium text-zinc-200">{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
