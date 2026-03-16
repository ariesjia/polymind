import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getBearerToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildPrompt } from "@/lib/types";
import type { PolyEvent, Market } from "@/lib/types";

const OPENAI_URL =
  (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "") +
  "/chat/completions";
const MODEL = process.env.OPENAI_MODEL || "gpt-4o";
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
    select: { credits: true },
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

  const openaiRes = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      stream: true,
    }),
  });

  if (!openaiRes.ok) {
    await prisma.user.update({
      where: { id: payload.sub },
      data: { credits: { increment: 1 } },
    });
    const errText = await openaiRes.text();
    return NextResponse.json(
      { error: `OpenAI error: ${errText}` },
      { status: 502 }
    );
  }

  const reader = openaiRes.body?.getReader();
  if (!reader) {
    await prisma.user.update({
      where: { id: payload.sub },
      data: { credits: { increment: 1 } },
    });
    return NextResponse.json(
      { error: "No response body" },
      { status: 502 }
    );
  }

  const decoder = new TextDecoder();
  let fullContent = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;
            const data = trimmed.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data) as {
                choices?: Array<{ delta?: { content?: string } }>;
              };
              const content = parsed.choices?.[0]?.delta?.content;
              if (typeof content === "string" && content) {
                fullContent += content;
                controller.enqueue(new TextEncoder().encode(content));
              }
            } catch {
              // skip malformed
            }
          }
        }

        if (fullContent) {
          await prisma.analysisResult.create({
            data: {
              userId: payload.sub,
              eventId: event.id,
              eventTitle: event.title,
              eventSlug: event.slug ?? null,
              content: fullContent,
            },
          });
        }

        controller.close();
      } catch (err) {
        console.error("Stream error:", err);
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
