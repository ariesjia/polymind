import type { AIConfig } from "@/lib/types";

interface ChatToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content?: string;
  tool_calls?: ChatToolCall[];
  tool_call_id?: string;
}

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
}

export interface AIToolEvent {
  phase: "start" | "success" | "error" | "info";
  callId: string;
  tool: string;
  query: string;
  message?: string;
}

const TAVILY_SEARCH_URL = "https://api.tavily.com/search";
const MAX_TOOL_ROUNDS = 3;

function extractTextContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "text" in item) {
        const text = (item as { text?: unknown }).text;
        return typeof text === "string" ? text : "";
      }
      return "";
    })
    .join("");
}

async function fetchChatCompletion(
  config: AIConfig,
  body: Record<string, unknown>,
  signal?: AbortSignal
): Promise<unknown> {
  const url = `${config.baseUrl.replace(/\/+$/, "")}/v1/chat/completions`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `API Error ${response.status}: ${errorBody || response.statusText}`
    );
  }

  return response.json();
}

async function searchWithTavily(
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
    const errorBody = await response.text();
    throw new Error(
      `Tavily API Error ${response.status}: ${errorBody || response.statusText}`
    );
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

async function streamDirectChat(
  config: AIConfig,
  prompt: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  signal?: AbortSignal
): Promise<void> {
  const url = `${config.baseUrl.replace(/\/+$/, "")}/v1/chat/completions`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: "user", content: prompt }],
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `API Error ${response.status}: ${errorBody || response.statusText}`
    );
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;
      const data = trimmed.slice(6);
      if (data === "[DONE]") {
        onDone();
        return;
      }
      try {
        const parsed = JSON.parse(data) as {
          choices?: Array<{ delta?: { content?: unknown } }>;
        };
        const content = parsed.choices?.[0]?.delta?.content;
        if (typeof content === "string" && content) {
          onChunk(content);
        }
      } catch {
        // skip malformed JSON chunks
      }
    }
  }

  onDone();
}

async function runWithTavilyTool(
  config: AIConfig,
  prompt: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  signal?: AbortSignal,
  onToolEvent?: (event: AIToolEvent) => void
): Promise<void> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "You can call search_web when necessary, but keep it minimal and efficient. Usually 1-2 searches are enough. As soon as you have enough information, stop calling tools and return the final answer.",
    },
    { role: "user", content: prompt },
  ];
  const tavilyApiKey = (config.tavilyApiKey || "").trim();

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = (await fetchChatCompletion(
      config,
      {
        model: config.model,
        messages,
        stream: false,
        tool_choice: "auto",
        tools: [
          {
            type: "function",
            function: {
              name: "search_web",
              description:
                "Search the web for up-to-date information relevant to the analysis task.",
              parameters: {
                type: "object",
                properties: {
                  query: {
                    type: "string",
                    description: "Search query keywords",
                  },
                },
                required: ["query"],
                additionalProperties: false,
              },
            },
          },
        ],
      },
      signal
    )) as {
      choices?: Array<{
        message?: {
          content?: unknown;
          tool_calls?: ChatToolCall[];
        };
      }>;
    };

    const message = response.choices?.[0]?.message;
    if (!message) throw new Error("Model returned empty response.");

    const toolCalls = message.tool_calls || [];
    if (toolCalls.length > 0) {
      messages.push({
        role: "assistant",
        content: extractTextContent(message.content),
        tool_calls: toolCalls,
      });

      for (const toolCall of toolCalls) {
        if (toolCall.function?.name !== "search_web") {
          onToolEvent?.({
            phase: "error",
            callId: toolCall.id,
            tool: toolCall.function?.name || "unknown_tool",
            query: "",
            message: "Unsupported tool call.",
          });
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: "Unsupported tool call." }),
          });
          continue;
        }

        let query = "";
        try {
          const args = JSON.parse(toolCall.function.arguments) as {
            query?: unknown;
          };
          if (typeof args.query === "string") query = args.query.trim();
        } catch {
          // keep empty query and return structured error
        }

        if (!query) {
          onToolEvent?.({
            phase: "error",
            callId: toolCall.id,
            tool: "search_web",
            query: "",
            message: "Missing query argument.",
          });
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: "Missing query argument." }),
          });
          continue;
        }

        onToolEvent?.({
          phase: "start",
          callId: toolCall.id,
          tool: "search_web",
          query,
        });

        try {
          const toolResult = await searchWithTavily(tavilyApiKey, query, signal);
          onToolEvent?.({
            phase: "success",
            callId: toolCall.id,
            tool: "search_web",
            query,
            message: `Found ${toolResult.results.length} results.`,
          });
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult),
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Tool execution failed.";
          onToolEvent?.({
            phase: "error",
            callId: toolCall.id,
            tool: "search_web",
            query,
            message,
          });
          throw error;
        }
      }

      onToolEvent?.({
        phase: "info",
        callId: `generating-${round}`,
        tool: "assistant",
        query: "",
        message: "AI 正在根据搜索结果生成回答…",
      });

      continue;
    }

    const content = extractTextContent(message.content);
    if (content) onChunk(content);
    onDone();
    return;
  }
  onToolEvent?.({
    phase: "info",
    callId: "tool-round-limit",
    tool: "search_web",
    query: "",
    message: "搜索完成，正在生成最终回答…",
  });

  const finalResponse = (await fetchChatCompletion(
    config,
    {
      model: config.model,
      messages: [
        ...messages,
        {
          role: "user",
          content:
            "Do not call any tools. Based on the information already gathered, provide your final answer immediately.",
        },
      ],
      stream: false,
    },
    signal
  )) as {
    choices?: Array<{
      message?: {
        content?: unknown;
      };
    }>;
  };

  const finalContent = extractTextContent(finalResponse.choices?.[0]?.message?.content);
  if (finalContent) {
    onChunk(finalContent);
    onDone();
    return;
  }

  await streamDirectChat(config, prompt, onChunk, onDone, signal);
}

export function formatChatError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);

  if (
    msg.includes("Failed to fetch") ||
    msg.includes("NetworkError") ||
    msg.includes("Network request failed") ||
    msg.includes("Load failed")
  ) {
    return "连接失败：可能是跨域(CORS)或网络问题。请确认：\n• API 地址是否正确且可被浏览器访问\n• 若使用自建代理，需配置 CORS 允许当前域名\n• 检查网络连接是否正常";
  }

  if (msg.includes("timeout") || msg.includes("Timeout")) {
    return "请求超时：API 响应过慢，请稍后重试或检查网络。";
  }

  if (msg.includes("401") || msg.includes("Unauthorized")) {
    return "认证失败：API Key 无效或已过期，请在设置中检查并更新。";
  }

  if (msg.includes("403") || msg.includes("Forbidden")) {
    return "访问被拒绝：API Key 可能没有访问该模型的权限。";
  }

  if (msg.includes("404") || msg.includes("Not Found")) {
    return "接口不存在：请检查 API Base URL 是否正确（如 https://api.openai.com）。";
  }

  if (msg.includes("429") || msg.includes("rate limit")) {
    return "请求过于频繁：请稍后再试。";
  }

  if (msg.includes("500") || msg.includes("502") || msg.includes("503")) {
    return "服务端错误：API 服务暂时不可用，请稍后重试。";
  }

  if (msg.startsWith("API Error")) {
    return msg;
  }

  return msg || "未知错误，请检查配置后重试。";
}

export interface TestChatResult {
  ok: boolean;
  message?: string;
  error?: string;
}

export async function testChatConnection(
  config: AIConfig,
  signal?: AbortSignal
): Promise<TestChatResult> {
  if (!config.apiKey?.trim()) {
    return { ok: false, error: "请先填写 API Key。" };
  }
  if (!config.baseUrl?.trim()) {
    return { ok: false, error: "请先填写 API Base URL。" };
  }

  const url = `${config.baseUrl.replace(/\/+$/, "")}/v1/chat/completions`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || "gpt-3.5-turbo",
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 5,
      }),
      signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      const friendly = formatChatError(
        new Error(`API Error ${response.status}: ${errorBody || response.statusText}`)
      );
      return { ok: false, error: friendly };
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    const reply = typeof content === "string" ? content : "OK";

    return { ok: true, message: `连接成功，模型回复：${reply}` };
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { ok: false, error: "测试已取消。" };
    }
    return {
      ok: false,
      error: formatChatError(err),
    };
  }
}

export async function streamChat(
  config: AIConfig,
  prompt: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (error: Error) => void,
  signal?: AbortSignal,
  onToolEvent?: (event: AIToolEvent) => void
): Promise<void> {
  try {
    if ((config.tavilyApiKey || "").trim()) {
      await runWithTavilyTool(config, prompt, onChunk, onDone, signal, onToolEvent);
    } else {
      await streamDirectChat(config, prompt, onChunk, onDone, signal);
    }
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") return;
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}
