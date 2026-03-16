import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

export async function GET() {
  const nonce = randomBytes(16).toString("hex");
  return NextResponse.json({ nonce });
}
