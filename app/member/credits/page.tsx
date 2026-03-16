"use client";

import { Coins } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function CreditsPage() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-bold text-white">
        <Coins size={24} className="text-amber-400" />
        Credits
      </h1>
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <p className="text-4xl font-bold text-white">{user?.credits ?? 0}</p>
        <p className="mt-2 text-sm text-zinc-500">
          Each AI analysis consumes 1 credit. New users receive 50 credits.
        </p>
      </div>
    </div>
  );
}
