import { NextResponse } from "next/server";
import {
  GATE_COOKIE,
  GATE_MAX_AGE,
  gateToken,
  passcode,
  safeEqual,
} from "@/lib/gate";

type Attempt = { count: number; firstAt: number };

const attempts = new Map<string, Attempt>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function clientKey(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "local"
  );
}

export async function POST(request: Request) {
  const secret = passcode();

  // No passcode configured: local dev, let everything through.
  if (!secret) return NextResponse.json({ ok: true });

  const key = clientKey(request);
  const now = Date.now();
  const record = attempts.get(key);

  if (record && now - record.firstAt > WINDOW_MS) attempts.delete(key);
  const current = attempts.get(key);

  if (current && current.count >= MAX_ATTEMPTS) {
    const retryAfter = Math.ceil(
      (WINDOW_MS - (now - current.firstAt)) / 1000,
    );
    return NextResponse.json(
      { ok: false, error: "locked", retryAfter },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    passcode?: unknown;
  } | null;

  const input = typeof body?.passcode === "string" ? body.passcode : "";

  if (!safeEqual(input, secret)) {
    const next: Attempt = current
      ? { count: current.count + 1, firstAt: current.firstAt }
      : { count: 1, firstAt: now };
    attempts.set(key, next);
    return NextResponse.json(
      {
        ok: false,
        error: "invalid",
        remaining: Math.max(0, MAX_ATTEMPTS - next.count),
      },
      { status: 401 },
    );
  }

  attempts.delete(key);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(GATE_COOKIE, await gateToken(secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: GATE_MAX_AGE,
  });
  return response;
}
