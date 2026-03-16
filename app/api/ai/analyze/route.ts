import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getBearerToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildPrompt } from "@/lib/types";
import type { PolyEvent, Market } from "@/lib/types";
import {
  parseAnyToolCall,
  stripFunctionCalls,
  getTextBeforeToolCall,
  searchWithTavily,
  extractQueryFromToolArgs,
} from "@/lib/ai-agent";

const OPENAI_URL =
  (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "") +
  "/chat/completions";
const MODEL = process.env.OPENAI_MODEL || "gpt-4o";
const MAX_TOOL_ROUNDS = 5;
const SEARCH_TOOL_NAMES = ["search_web", "ddg-search_search", "duckduckgo_search", "web_search"];
function isSearchTool(name: string): boolean {
  const n = name.toLowerCase();
  return SEARCH_TOOL_NAMES.some((t) => n.includes(t.toLowerCase())) || /search|ddg|duckduckgo/i.test(n);
}
const PROMPT_TEMPLATE =
  process.env.DEFAULT_PROMPT_TEMPLATE ||
  `<role>
你的任务是根据市场信息，对每个market进行分析，每个market有2个可选项，分析他们可能性
不要参考polymarket 或类似平台的赔率，只考虑从专业的知识以及新闻信息，政府材料中判断可能性
获取前周期的历史数据加以辅助分析，但是最重要的是考虑当下实时情况
告诉我最可能和最不可能的选项，并给出理由
你可以继续获取更多信息帮助你确定判断
参考 event-rule 的规则，分析选项的可能性
用中文回复我
能用表格更好的可视化数据
</role>
<event>
\${event.title}
</event>
<event-rule>
\${event.description}
</event-rule>
<markets>
question|option1|option2
\${marketsText}
</markets>`;

export async function POST(request: NextRequest) {
  const token = getBearerToken(request.headers.get("authorization"));
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI API not configured" },
      { status: 500 }
    );
  }

  let body: { event: PolyEvent; markets: Market[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { event, markets } = body;
  if (!event?.id || !event?.title || !Array.isArray(markets)) {
    return NextResponse.json(
      { error: "Missing event or markets" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { credits: true, tavilyApiKey: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const credits = user.credits ?? 0;
  if (credits < 1) {
    return NextResponse.json(
      { error: "Insufficient credits. Please add more credits." },
      { status: 402 }
    );
  }

  await prisma.user.update({
    where: { id: payload.sub },
    data: { credits: { decrement: 1 } },
  });

  const prompt = buildPrompt(PROMPT_TEMPLATE, event, markets);
  const tavilyKey =
    (user.tavilyApiKey || process.env.TAVILY_API_KEY || "").trim();

  const tools = [
    {
      type: "function" as const,
      function: {
        name: "search_web",
        description:
          "Search the web for up-to-date information. Use when you need current data, news, or facts.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query" },
            num_results: { type: "number", description: "Max results" },
          },
          required: ["query"],
        },
      },
    },
  ];

  type ChatMessage =
    | { role: "user"; content: string }
    | { role: "assistant"; content: string; tool_calls?: unknown[] }
    | { role: "tool"; tool_call_id: string; content: string };

  const messages: ChatMessage[] = [{ role: "user", content: prompt }];
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let fullOutput = "";
        const enqueue = (text: string) => {
          if (text) {
            fullOutput += text;
            controller.enqueue(encoder.encode(text));
          }
        };

        let gotFinal = false;
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const reqBody: Record<string, unknown> = {
            model: MODEL,
            messages,
            stream: false,
          };
          if (round === 0) {
            reqBody.tools = tools;
            reqBody.tool_choice = "auto";
          }

          const openaiRes = await fetch(OPENAI_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(reqBody),
          });

          if (!openaiRes.ok) {
            const errText = await openaiRes.text();
            throw new Error(`API error: ${errText}`);
          }

          const data = (await openaiRes.json()) as {
            choices?: { message?: { content?: string | null; tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }>; reasoning_details?: Array<{ text?: string }> } }[];
          };
          const msg = data.choices?.[0]?.message;
          if (!msg) throw new Error("Empty model response");

          const content = typeof msg.content === "string" ? msg.content : "";
          const toolCalls = msg.tool_calls || [];

          if (msg.reasoning_details?.length) {
            const thinkText = msg.reasoning_details.map((r) => r.text).filter(Boolean).join("\n\n");
            if (thinkText) enqueue(`<think>\n${thinkText}\n</think>\n\n`);
          }

          if (toolCalls.length > 0) {
            const intro = getTextBeforeToolCall(content);
            if (intro) enqueue(intro + "\n\n");

            messages.push({
              role: "assistant",
              content: content || "",
              tool_calls: toolCalls,
            });

            for (const tc of toolCalls) {
              const name = tc.function?.name || "";
              const isSearch = isSearchTool(name);

              if (!isSearch || !tavilyKey) {
                const err = !tavilyKey
                  ? "Tavily API Key not configured for search."
                  : `Unsupported tool: ${name}`;
                enqueue(`<think>\n[Tool ${name}] ${err}\n</think>\n\n`);
                messages.push({
                  role: "tool",
                  tool_call_id: tc.id,
                  content: JSON.stringify({ error: err }),
                });
                continue;
              }

              let query = "";
              try {
                const args = JSON.parse(tc.function?.arguments || "{}") as Record<string, unknown>;
                query = extractQueryFromToolArgs(args) || String(args.query || "").trim();
              } catch {
                query = "";
              }

              if (!query) {
                enqueue(`<think>\n[Tool ${name}] Missing query.\n</think>\n\n`);
                messages.push({
                  role: "tool",
                  tool_call_id: tc.id,
                  content: JSON.stringify({ error: "Missing query" }),
                });
                continue;
              }

              enqueue(`<think>\n🔍 正在搜索: ${query}\n</think>\n\n`);

              try {
                const result = await searchWithTavily(tavilyKey, query);
                enqueue(`<think>\n✓ 找到 ${result.results.length} 条结果\n</think>\n\n`);
                messages.push({
                  role: "tool",
                  tool_call_id: tc.id,
                  content: JSON.stringify({
                    query: result.query,
                    answer: result.answer,
                    results: result.results,
                    summary: result.results.slice(0, 5).map((r) => `- ${r.title}: ${r.content.slice(0, 200)}...`).join("\n"),
                  }),
                });
              } catch (err) {
                const errMsg = err instanceof Error ? err.message : "Search failed";
                enqueue(`<think>\n[Tool ${name}] Error: ${errMsg}\n</think>\n\n`);
                messages.push({
                  role: "tool",
                  tool_call_id: tc.id,
                  content: JSON.stringify({ error: errMsg }),
                });
              }
            }
            continue;
          }

          const textCall = parseAnyToolCall(content);
          if (textCall && isSearchTool(textCall.name)) {
            const query = extractQueryFromToolArgs(textCall.args);
            if (query && tavilyKey) {
              const intro = getTextBeforeToolCall(content);
              if (intro) enqueue(intro + "\n\n");
              enqueue(`<think>\n🔍 正在搜索: ${query}\n</think>\n\n`);

              try {
                const result = await searchWithTavily(tavilyKey, query);
                enqueue(`<think>\n✓ 找到 ${result.results.length} 条结果\n</think>\n\n`);
                messages.push({
                  role: "assistant",
                  content: stripFunctionCalls(content) || "(Searching...)",
                });
                messages.push({
                  role: "user",
                  content: `[Search result for "${query}"]\n${JSON.stringify(result, null, 2)}\n\nBased on the above search result, continue your analysis and provide the final answer. Do not call tools again.`,
                });
                continue;
              } catch {
                enqueue(`<think>\n[Tool ${textCall.name}] Search failed.\n</think>\n\n`);
              }
            }
          }

          const finalContent = stripFunctionCalls(content);
          if (finalContent) {
            enqueue(finalContent);
            gotFinal = true;
            break;
          }
        }

        if (!gotFinal) enqueue("\n\n分析完成，但未生成有效内容，请重试。");
        const output = fullOutput || "分析完成，但未生成有效内容，请重试。";

        await prisma.analysisResult.create({
          data: {
            userId: payload.sub,
            eventId: event.id,
            eventTitle: event.title,
            eventSlug: event.slug ?? null,
            content: output,
          },
        });

        controller.close();
      } catch (err) {
        await prisma.user.update({
          where: { id: payload.sub },
          data: { credits: { increment: 1 } },
        });
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
