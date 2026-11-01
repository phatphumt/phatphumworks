import { NextResponse } from "next/server";
import { deletePushSubscription } from "@/lib/data";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({ endpoint: z.string().url() });

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  await deletePushSubscription(parsed.data.endpoint);
  return NextResponse.json({ ok: true });
}
