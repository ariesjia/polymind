import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getBearerToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const token = getBearerToken(request.headers.get("authorization"));
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const { eventId } = await params;
  if (!eventId) {
    return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
  }

  const results = await prisma.analysisResult.findMany({
    where: { userId: payload.sub, eventId },
    orderBy: { createdAt: "desc" },
    select: { id: true, eventId: true, eventTitle: true, eventSlug: true, content: true, createdAt: true },
  });

  return NextResponse.json({
    results: results.map((r) => ({
      id: r.id,
      eventId: r.eventId,
      eventTitle: r.eventTitle,
      eventSlug: r.eventSlug,
      content: r.content,
      timestamp: r.createdAt.getTime(),
      credits: 1,
    })),
  });
}
