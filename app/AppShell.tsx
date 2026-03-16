"use client";

import { useState } from "react";
import { usePathname, useParams } from "next/navigation";
import Header from "@/components/Header";
import HomePage from "@/components/HomePage";
import EventDetailPage from "@/components/EventDetailPage";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { PolyEvent, AIConfig } from "@/lib/types";
import { DEFAULT_AI_CONFIG } from "@/lib/types";

export default function AppShell() {
  const pathname = usePathname();
  const params = useParams();
  const slug = params?.slug as string | undefined;

  const [events, setEvents] = useState<PolyEvent[]>([]);
  const [aiConfig, setAiConfig] = useLocalStorage<AIConfig>(
    "polymind-ai-config",
    DEFAULT_AI_CONFIG
  );

  const isEventPage = pathname?.startsWith("/event/");

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <Header />

      {isEventPage && slug ? (
        <EventDetailPage aiConfig={aiConfig} />
      ) : (
        <HomePage
          aiConfig={aiConfig}
          events={events}
          setEvents={setEvents}
        />
      )}
    </div>
  );
}
