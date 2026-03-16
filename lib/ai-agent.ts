/**
 * Backend AI Agent - handles function calls, tool execution, agent loop.
 * When model returns tool_calls or <FunctionCallBegin>...<FunctionCallEnd> in text,
 * execute tools and feed results back until model returns plain text.
 */

const TAVILY_SEARCH_URL = "https://api.tavily.com/search";

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
}

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

/** Parse minimax:tool_call <invoke name="X"> <parameter name="k">v</parameter> </invoke> </minimax:tool_call> */
export function parseMinimaxToolCall(text: string): ToolCall | null {
  const invokeMatch = text.match(/<invoke\s+name=["']([^"']+)["']\s*>([\s\S]*?)<\/invoke>/);
  if (!invokeMatch) return null;

  const name = invokeMatch[1].trim();
  const inner = invokeMatch[2];
  const args: Record<string, unknown> = {};

  const paramRegex = /<parameter\s+name=["']([^"']+)["']\s*>([\s\S]*?)<\/parameter>/g;
  let m: RegExpExecArray | null;
  while ((m = paramRegex.exec(inner)) !== null) {
    const key = m[1].trim();
    const val = m[2].trim();
    args[key] = /^\d+$/.test(val) ? parseInt(val, 10) : val;
  }

  return { name, args };
}

/** Parse <FunctionCallBegin>...<FunctionCallEnd> from model text output */
export function parseTextFunctionCall(text: string): ToolCall | null {
  const begin = "<FunctionCallBegin>";
  const end = "<FunctionCallEnd>";
  const startIdx = text.indexOf(begin);
  const endIdx = text.indexOf(end, startIdx);
  if (startIdx === -1 || endIdx === -1) return null;

  const inner = text.slice(startIdx + begin.length, endIdx).trim();
  const toolMatch = inner.match(/tool\s*=>\s*["']([^"']+)["']/);
  if (!toolMatch) return null;

  const name = toolMatch[1].trim();
  let args: Record<string, unknown> = {};
  const queryMatch = inner.match(/query\s*=\s*["']([^"']*)["']/);
  if (queryMatch) {
    args = { query: queryMatch[1] };
  } else {
    const argsMatch = inner.match(/args\s*=>\s*\{([^}]*)\}/);
    if (argsMatch) {
      const argsStr = "{" + argsMatch[1].replace(/(\w+)\s*=\s*["']([^"']*)["']/g, '"$1":"$2"').replace(/(\w+)\s*=\s*(\d+)/g, '"$1":$2') + "}";
      try {
        args = JSON.parse(argsStr) as Record<string, unknown>;
      } catch {
        args = {};
      }
    }
  }

  return { name, args };
}

/** Parse any known tool call format (tries all parsers) */
export function parseAnyToolCall(text: string): ToolCall | null {
  return parseMinimaxToolCall(text) ?? parseTextFunctionCall(text);
}

/** Get text before the first tool call block (for streaming intro) */
export function getTextBeforeToolCall(text: string): string {
  const minimaxMatch = text.match(/^([\s\S]*?)minimax:tool_call\s*<invoke/i);
  const fcMatch = text.match(/^([\s\S]*?)<FunctionCallBegin>/);
  let idx = text.length;
  if (minimaxMatch) idx = Math.min(idx, minimaxMatch[1].length);
  if (fcMatch) idx = Math.min(idx, fcMatch[1].length);
  return text.slice(0, idx).trim();
}

/** Remove function call blocks from text, return clean text */
export function stripFunctionCalls(text: string): string {
  return text
    .replace(/<FunctionCallBegin>[\s\S]*?<FunctionCallEnd>\s*/g, "")
    .replace(/minimax:tool_call\s*<invoke[\s\S]*?<\/minimax:tool_call>\s*/gi, "")
    .trim();
}

export async function searchWithTavily(
  apiKey: string,
  query: string,
  signal?: AbortSignal
): Promise<{ query: string; answer: string; results: TavilySearchResult[] }> {
  const response = await fetch(TAVILY_SEARCH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "advanced",
      include_answer: true,
      max_results: 5,
    }),
    signal,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Tavily API Error: ${err || response.statusText}`);
  }

  const raw = (await response.json()) as {
    answer?: unknown;
    results?: Array<{ title?: unknown; url?: unknown; content?: unknown }>;
  };

  const results = (raw.results || []).map((item) => ({
    title: typeof item.title === "string" ? item.title : "",
    url: typeof item.url === "string" ? item.url : "",
    content: typeof item.content === "string" ? item.content : "",
  }));

  return {
    query,
    answer: typeof raw.answer === "string" ? raw.answer : "",
    results,
  };
}

export function extractQueryFromToolArgs(args: Record<string, unknown>): string {
  const q = args.query ?? args.search ?? args.q;
  return typeof q === "string" ? q.trim() : "";
}
