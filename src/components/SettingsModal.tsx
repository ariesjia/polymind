import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Eye,
  EyeOff,
  Save,
  FlaskConical,
  ChevronDown,
  RotateCcw,
  Download,
  Upload,
} from "lucide-react";
import type { AIConfig, PolyEvent } from "../types";
import { buildPrompt, DEFAULT_AI_CONFIG } from "../types";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  config: AIConfig;
  onSave: (config: AIConfig) => void;
  events: PolyEvent[];
}

export default function SettingsModal({
  open,
  onClose,
  config,
  onSave,
  events,
}: SettingsModalProps) {
  const [draft, setDraft] = useState<AIConfig>(config);
  const [showKey, setShowKey] = useState(false);
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [selectedEventIdx, setSelectedEventIdx] = useState(0);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setDraft(config);
      setTestOutput(null);
      setSelectedEventIdx(0);
      setImportError(null);
    }
  }, [open, config]);

  const handleSave = () => {
    onSave(draft);
    onClose();
  };

  const handleRestoreDefault = () => {
    setDraft({ ...DEFAULT_AI_CONFIG });
    setTestOutput(null);
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(draft, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "polymind-config.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    setImportError(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as unknown;
        if (!parsed || typeof parsed !== "object") {
          setImportError("Invalid JSON format.");
          return;
        }
        const obj = parsed as Record<string, unknown>;
        const restored: AIConfig = {
          baseUrl: typeof obj.baseUrl === "string" ? obj.baseUrl : DEFAULT_AI_CONFIG.baseUrl,
          apiKey: typeof obj.apiKey === "string" ? obj.apiKey : DEFAULT_AI_CONFIG.apiKey,
          model: typeof obj.model === "string" ? obj.model : DEFAULT_AI_CONFIG.model,
          promptTemplate:
            typeof obj.promptTemplate === "string"
              ? obj.promptTemplate
              : DEFAULT_AI_CONFIG.promptTemplate,
          tavilyApiKey:
            typeof obj.tavilyApiKey === "string" ? obj.tavilyApiKey : DEFAULT_AI_CONFIG.tavilyApiKey,
        };
        setDraft(restored);
        setTestOutput(null);
      } catch {
        setImportError("Failed to parse config file.");
      }
    };
    reader.readAsText(file);
  };

  const handleTest = () => {
    if (events.length === 0) {
      setTestOutput("No events available for testing.");
      return;
    }
    const event = events[selectedEventIdx] || events[0];
    const activeMarkets =
      event.markets?.filter((m) => m.active === true && !m.closed) || [];
    const result = buildPrompt(draft.promptTemplate, event, activeMarkets);
    setTestOutput(result);
  };

  const inputClass =
    "w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-all focus:border-indigo-500/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-indigo-500/30";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          >
            <div
              className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-white/[0.08] bg-[#16182a]/95 shadow-2xl backdrop-blur-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex shrink-0 items-center justify-between px-7 pt-7 sm:px-8 sm:pt-8">
                <h2 className="text-lg font-bold text-white">Settings</h2>
                <button
                  onClick={onClose}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto px-7 py-7 sm:px-8 sm:py-8">
                <div className="space-y-5">
                  {/* Base URL */}
                  <div>
                    <label className="mb-2 block text-xs font-medium text-zinc-400">
                      API Base URL
                    </label>
                    <input
                      type="text"
                      value={draft.baseUrl}
                      onChange={(e) =>
                        setDraft({ ...draft, baseUrl: e.target.value })
                      }
                      placeholder="https://api.openai.com"
                      className={inputClass}
                    />
                  </div>

                  {/* API Key */}
                  <div>
                    <label className="mb-2 block text-xs font-medium text-zinc-400">
                      API Key
                    </label>
                    <div className="relative">
                      <input
                        type={showKey ? "text" : "password"}
                        value={draft.apiKey}
                        onChange={(e) =>
                          setDraft({ ...draft, apiKey: e.target.value })
                        }
                        placeholder="sk-..."
                        className={`${inputClass} pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                      >
                        {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Model */}
                  <div>
                    <label className="mb-2 block text-xs font-medium text-zinc-400">
                      Model
                    </label>
                    <input
                      type="text"
                      value={draft.model}
                      onChange={(e) =>
                        setDraft({ ...draft, model: e.target.value })
                      }
                      placeholder="model name"
                      className={inputClass}
                    />
                  </div>

                  {/* Tavily API Key */}
                  <div>
                    <label className="mb-2 block text-xs font-medium text-zinc-400">
                      Tavily API Key (optional)
                    </label>
                    <input
                      type={showKey ? "text" : "password"}
                      value={draft.tavilyApiKey ?? ""}
                      onChange={(e) =>
                        setDraft({ ...draft, tavilyApiKey: e.target.value })
                      }
                      placeholder="tvly-..."
                      className={inputClass}
                    />
                    <p className="mt-2 text-xs text-zinc-600">
                      配置后 AI 可调用联网搜索工具补充实时信息。
                    </p>
                  </div>

                  {/* Prompt Template */}
                  <div>
                    <label className="mb-2 block text-xs font-medium text-zinc-400">
                      Prompt Template
                    </label>
                    <textarea
                      value={draft.promptTemplate}
                      onChange={(e) => {
                        setDraft({ ...draft, promptTemplate: e.target.value });
                        setTestOutput(null);
                      }}
                      rows={8}
                      className={`${inputClass} resize-y font-mono text-xs leading-relaxed`}
                    />
                    <p className="mt-2 text-xs leading-relaxed text-zinc-600">
                      Variables: <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-zinc-400">{"${event.*}"}</code> (title, description, slug, id, startDate, endDate, volume, liquidity, ...),{" "}
                      <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-zinc-400">{"${marketsText}"}</code>
                    </p>
                  </div>

                  {/* Test section */}
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                      {/* Event picker */}
                      <div className="flex-1">
                        <label className="mb-2 block text-xs font-medium text-zinc-400">
                          Test with Event
                        </label>
                        <div className="relative">
                          <select
                            value={selectedEventIdx}
                            onChange={(e) => {
                              setSelectedEventIdx(Number(e.target.value));
                              setTestOutput(null);
                            }}
                            className={`${inputClass} appearance-none pr-9`}
                          >
                            {events.length === 0 && (
                              <option value={0}>No events loaded</option>
                            )}
                            {events.map((ev, i) => (
                              <option key={ev.id} value={i}>
                                {ev.title.length > 60
                                  ? ev.title.slice(0, 60) + "..."
                                  : ev.title}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            size={14}
                            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
                          />
                        </div>
                      </div>
                      <button
                        onClick={handleTest}
                        disabled={events.length === 0}
                        className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-3 text-sm font-medium text-amber-400 transition-all hover:bg-amber-500/20 disabled:opacity-40"
                      >
                        <FlaskConical size={14} />
                        Test Prompt
                      </button>
                    </div>

                    {/* Test output */}
                    <AnimatePresence>
                      {testOutput !== null && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-1">
                            <label className="mb-2 block text-xs font-medium text-zinc-400">
                              Output Preview
                            </label>
                            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-black/30 p-4 font-mono text-xs leading-relaxed text-zinc-300">
                              {testOutput}
                            </pre>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Config actions */}
              <div className="flex shrink-0 flex-wrap gap-2 border-t border-white/[0.06] px-7 py-4 sm:px-8">
                <button
                  onClick={handleRestoreDefault}
                  className="flex items-center gap-2 rounded-lg border border-white/[0.08] px-3 py-2 text-xs font-medium text-zinc-400 transition-all hover:bg-white/[0.04] hover:text-zinc-200"
                >
                  <RotateCcw size={12} />
                  Restore Default
                </button>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 rounded-lg border border-white/[0.08] px-3 py-2 text-xs font-medium text-zinc-400 transition-all hover:bg-white/[0.04] hover:text-zinc-200"
                >
                  <Download size={12} />
                  Export
                </button>
                <button
                  onClick={handleImport}
                  className="flex items-center gap-2 rounded-lg border border-white/[0.08] px-3 py-2 text-xs font-medium text-zinc-400 transition-all hover:bg-white/[0.04] hover:text-zinc-200"
                >
                  <Upload size={12} />
                  Import
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {importError && (
                  <p className="w-full text-xs text-red-400">{importError}</p>
                )}
              </div>

              {/* Actions — fixed bottom */}
              <div className="flex shrink-0 justify-end gap-3 border-t border-white/[0.06] px-7 py-5 sm:px-8">
                <button
                  onClick={onClose}
                  className="rounded-xl border border-white/[0.08] px-5 py-2.5 text-sm font-medium text-zinc-400 transition-all hover:bg-white/[0.04] hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:shadow-xl hover:shadow-indigo-500/30 hover:brightness-110"
                >
                  <Save size={14} />
                  Save
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
