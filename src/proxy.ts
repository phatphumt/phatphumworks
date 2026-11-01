import { NextResponse, type NextRequest } from "next/server";
import { GATE_COOKIE, gateToken, passcode, safeEqual } from "@/lib/gate";

/**
 * Next 16 renamed middleware → proxy. Same semantics, same matcher.
 * Checks the derived cookie only; the passcode itself never leaves the server.
 */
export async function proxy(request: NextRequest) {
  const secret = passcode();

  // No passcode configured (local dev before .env.local): fail open.
  if (!secret) return NextResponse.next();

  const token = await gateToken(secret);
  const cookie = request.cookies.get(GATE_COOKIE)?.value ?? "";
  const authed = safeEqual(cookie, token);

  const { pathname } = request.nextUrl;

  if (pathname === "/login") {
    if (!authed) return NextResponse.next();
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (authed) return NextResponse.next();

  const login = new URL("/login", request.url);
  if (pathname !== "/") login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/((?!api/cron|api/auth|_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|sw.js).*)",
  ],
};
