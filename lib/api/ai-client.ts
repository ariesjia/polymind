/**
 * Client-side AI API - calls backend /api/ai/analyze
 */
import type { PolyEvent, Market } from "@/lib/types";

export async function streamAnalysisFromAPI(
  token: string,
  event: PolyEvent,
  markets: Market[],
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (error: Error) => void,
  signal?: AbortSignal
): Promise<void> {
  try {
    const res = await fetch("/api/ai/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ event, markets }),
      signal,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const msg = (errData as { error?: string }).error || res.statusText;
      onError(new Error(msg));
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      onError(new Error("No response body"));
      return;
    }

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      if (text) onChunk(text);
    }
    onDone();
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") return;
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}
