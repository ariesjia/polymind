import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getBearerToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(request: NextRequest) {
  const token = getBearerToken(request.headers.get("authorization"));
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const body = await request.json();
  const { tavilyApiKey } = body as { tavilyApiKey?: string };

  if (tavilyApiKey !== undefined) {
    const value = tavilyApiKey === "" || tavilyApiKey === null ? null : String(tavilyApiKey);
    await prisma.user.update({
      where: { id: payload.sub },
      data: { tavilyApiKey: value },
    });
  }

  return NextResponse.json({ ok: true });
}
