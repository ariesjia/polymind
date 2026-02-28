import { useState, useRef, useCallback, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  content: string;
  children: ReactNode;
  className?: string;
}

export default function Tooltip({ content, children, className = "" }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const updatePos = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  }, []);

  const show = () => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      updatePos();
      setVisible(true);
    }, 200);
  };

  const hide = () => {
    clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  return (
    <span
      ref={triggerRef}
      className={`inline-flex ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {visible &&
        createPortal(
          <span
            className="pointer-events-none fixed z-[9999] -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-zinc-800 px-3 py-1.5 text-[11px] font-medium text-zinc-200 shadow-xl ring-1 ring-white/[0.08]"
            style={{ left: pos.x, top: pos.y - 8 }}
          >
            {content}
            <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-zinc-800" />
          </span>,
          document.body
        )}
    </span>
  );
}
