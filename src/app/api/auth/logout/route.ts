import { NextResponse } from "next/server";
import { GATE_COOKIE } from "@/lib/gate";

/** Clears the passcode cookie. Reachable without a session so it always works. */
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(GATE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
