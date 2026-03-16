"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronRight, Brain } from "lucide-react";
import type { ContentSegment } from "@/lib/utils/aiContent";
import { normalizeMarkdownTables } from "@/lib/utils/aiContent";

interface ThinkBlockProps {
  content: string;
  defaultOpen: boolean;
}

function ThinkBlock({ content, defaultOpen }: ThinkBlockProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mb-4 rounded-lg border border-white/[0.06] bg-white/[0.02]">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-300"
      >
        <ChevronRight
          size={14}
          className={`shrink-0 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        />
        <Brain size={14} className="shrink-0" />
        <span>Thinking process</span>
        {!open && content.length > 50 && (
          <span className="ml-auto text-zinc-600">
            {content.slice(0, 50).trim()}...
          </span>
        )}
      </button>
      {open && (
        <div className="border-t border-white/[0.04] px-4 py-3">
          <div className="ai-prose text-xs leading-relaxed text-zinc-500">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {normalizeMarkdownTables(content)}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

interface AIContentDisplayProps {
  segments: ContentSegment[];
  openThinkIndex?: number;
  compact?: boolean;
}

export function AIContentDisplay({
  segments,
  openThinkIndex = -1,
  compact = false,
}: AIContentDisplayProps) {
  return (
    <div className={compact ? "ai-prose text-xs" : "ai-prose"}>
      {segments.map((seg, i) =>
        seg.type === "think" ? (
          <ThinkBlock
            key={i}
            content={seg.content}
            defaultOpen={i === openThinkIndex}
          />
        ) : (
          <div key={i}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {normalizeMarkdownTables(seg.content)}
            </ReactMarkdown>
          </div>
        )
      )}
    </div>
  );
}
