import { NextRequest, NextResponse } from "next/server";
import { SiweMessage } from "siwe";
import { signToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

const DEFAULT_CREDITS = 50;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, signature } = body as { message?: string; signature?: string };

    if (!message || !signature) {
      return NextResponse.json(
        { error: "Missing message or signature" },
        { status: 400 }
      );
    }

    const siweMessage = new SiweMessage(message);
    const result = await siweMessage.verify({ signature });

    const address = result.data.address;
    if (!address) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const addr = address.toLowerCase();

    let user = await prisma.user.findUnique({
      where: { address: addr },
      select: { id: true, credits: true, tavilyApiKey: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: { address: addr, credits: DEFAULT_CREDITS },
        select: { id: true, credits: true, tavilyApiKey: true },
      });
    }

    const token = await signToken({ sub: user.id, address: addr });

    return NextResponse.json({
      token,
      user: {
        address: addr,
        credits: user.credits,
        hasTavilyKey: !!user.tavilyApiKey,
      },
    });
  } catch (err) {
    console.error("Auth verify error:", err);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 401 }
    );
  }
}
