"use client";

import { useState, useEffect } from "react";
import { Settings, Loader2, Save } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Toast from "@/components/Toast";

export default function SettingsPage() {
  const { user, token, refreshUser } = useAuth();
  const [tavilyKey, setTavilyKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    if (user?.hasTavilyKey) {
      setTavilyKey("*****");
    } else {
      setTavilyKey("");
    }
  }, [user?.hasTavilyKey]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setToastVisible(false);
    try {
      const res = await fetch("/api/user/update", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tavilyApiKey: tavilyKey === "*****" ? undefined : (tavilyKey || null),
        }),
      });
      if (res.ok) {
        await refreshUser();
        setToastVisible(true);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-bold text-white">
        <Settings size={24} className="text-indigo-400" />
        Settings
      </h1>
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <label className="mb-2 block text-sm font-medium text-zinc-400">
          Tavily API Key
        </label>
        <input
          type="password"
          value={tavilyKey}
          onChange={(e) => setTavilyKey(e.target.value)}
          placeholder={user?.hasTavilyKey ? "Enter new key to update" : "tvly-..."}
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-all focus:border-indigo-500/50 focus:bg-white/[0.06]"
        />
        <p className="mt-2 text-xs text-zinc-500">
          Configure to enable AI web search during analysis. Leave empty to skip.
        </p>
        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-4 flex items-center gap-2 rounded-xl bg-indigo-500/20 px-4 py-2.5 text-sm font-medium text-indigo-300 transition-all hover:bg-indigo-500/30 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Save size={14} />
          )}
          Save
        </button>
      </div>
      <Toast
        message="Tavily API Key saved"
        visible={toastVisible}
        onClose={() => setToastVisible(false)}
      />
    </div>
  );
}
