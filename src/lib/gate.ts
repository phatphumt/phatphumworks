/**
 * Gate helpers. Runs in both the Node runtime (route handler) and the edge
 * runtime (proxy.ts), so only Web Crypto is allowed here.
 */

const MESSAGE = "school-tasks-gate-v1";

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Deterministic cookie value derived from the passcode — no session store needed. */
export async function gateToken(secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(MESSAGE),
  );
  return base64url(new Uint8Array(signature));
}

/** Constant-time-ish string comparison; length leak is acceptable here. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export const GATE_COOKIE = "gate";
export const GATE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function passcode(): string {
  return process.env.GATE_PASSCODE ?? "";
}
