import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteSetting, setSetting } from "@/lib/data";
import { periodTimesSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  webhookUrl: z.string().trim().max(300).optional(),
  digestTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "เวลาไม่ถูกต้อง")
    .optional(),
  windowDays: z.number().int().min(1).max(30).optional(),
  periodTimes: periodTimesSchema.optional(),
});

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { webhookUrl, digestTime, windowDays, periodTimes } = parsed.data;

  if (webhookUrl !== undefined) {
    if (webhookUrl) await setSetting("discordWebhookUrl", webhookUrl);
    else await deleteSetting("discordWebhookUrl");
  }
  if (digestTime) await setSetting("digestTime", digestTime);
  if (windowDays) await setSetting("windowDays", String(windowDays));
  if (periodTimes) {
    await setSetting("periodTimes", JSON.stringify(periodTimes));
  }

  return NextResponse.json({ ok: true });
}
