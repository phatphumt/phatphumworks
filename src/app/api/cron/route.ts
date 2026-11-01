import { NextResponse } from "next/server";
import {
  archiveOldCompletedTasks,
  getDigestLog,
  getDigestSettings,
  getDigestTasks,
  recordDigest,
} from "@/lib/data";
import { buildDigest } from "@/lib/digest";
import { postWebhook } from "@/lib/discord";
import { safeEqual } from "@/lib/gate";
import { minutesSinceMidnightBangkok, timeToMinutes, todayISO } from "@/lib/time";

export const dynamic = "force-dynamic";

/**
 * Called by cron-job.org every 15 minutes.
 *
 * Idempotent by date, so a duplicate call, a retry, or a manual hit can never
 * send the digest twice. Runs after `digestTime` only, which makes the job
 * self-healing if the scheduler was down at 18:00.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token =
    searchParams.get("token") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  const expected = process.env.CRON_TOKEN ?? "";

  if (!expected || !safeEqual(token, expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const today = todayISO();
  const settings = await getDigestSettings();

  if (minutesSinceMidnightBangkok() < timeToMinutes(settings.digestTime)) {
    return NextResponse.json({ skipped: "before-time", at: settings.digestTime });
  }

  const existing = await getDigestLog(today);
  if (existing?.sentAt) {
    return NextResponse.json({
      skipped: "already-sent",
      sentAt: existing.sentAt,
      count: existing.itemCount,
    });
  }

  await archiveOldCompletedTasks();

  const tasks = await getDigestTasks(settings.windowDays);
  const digest = buildDigest(tasks, today);

  if (!digest) {
    if (!existing) {
      await recordDigest(today, { error: "empty", itemCount: 0 });
    }
    return NextResponse.json({ skipped: "empty" });
  }

  if (!settings.webhookUrl) {
    await recordDigest(today, {
      error: "missing-webhook",
      itemCount: digest.count,
    });
    return NextResponse.json(
      { error: "missing webhook url" },
      { status: 400 },
    );
  }

  const result = await postWebhook(settings.webhookUrl, digest.payload);

  if (!result.ok) {
    await recordDigest(today, {
      error: result.error ?? `HTTP ${result.status}`,
      itemCount: digest.count,
    });
    return NextResponse.json(
      { error: result.error, status: result.status },
      { status: 502 },
    );
  }

  await recordDigest(today, {
    sentAt: new Date(),
    itemCount: digest.count,
    error: null,
  });

  return NextResponse.json({ ok: true, count: digest.count });
}
