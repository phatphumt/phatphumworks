import { NextResponse } from "next/server";
import webpush from "web-push";
import { getLessons, getPeriodTimes, getPushLog, getPushSubscriptions, recordPushLog, deletePushSubscription } from "@/lib/data";
import { safeEqual } from "@/lib/gate";
import { dayOfWeekISO, minutesSinceMidnightBangkok, todayISO } from "@/lib/time";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseMinutes(time: string): number | null {
  const [h, m] = time.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

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

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    return NextResponse.json({ error: "vapid not configured" }, { status: 503 });
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);

  const today = todayISO();
  const dayOfWeek = dayOfWeekISO(today);
  const nowMinutes = minutesSinceMidnightBangkok();

  const [lessons, periodTimes, subs, logs] = await Promise.all([
    getLessons(),
    getPeriodTimes(),
    getPushSubscriptions(),
    getPushLog(today),
  ]);

  const logged = new Set(logs.map((log) => log.period));
  const todayLessons = lessons.filter((lesson) => lesson.dayOfWeek === dayOfWeek);

  const sent: number[] = [];
  const removed: string[] = [];

  for (const lesson of todayLessons) {
    const period = lesson.period;
    if (logged.has(period)) continue;

    const times = periodTimes[String(period)];
    if (!times?.end) continue;

    const endMinutes = parseMinutes(times.end);
    if (endMinutes === null) continue;

    // Fire within a small window after the period ends so a slightly late
    // cron tick still catches it, but never twice (guarded by push_log).
    if (nowMinutes < endMinutes || nowMinutes > endMinutes + 2) continue;

    const payload = JSON.stringify({
      title: `คาบ ${period} · ${lesson.subjectCode} จบแล้ว`,
      body: "อย่าลืมบันทึกงาน",
      tag: `period-${today}-${period}`,
      url: "/",
    });

    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
          );
        } catch (error) {
          const status = (error as { statusCode?: number })?.statusCode;
          if (status === 410 || status === 404) {
            await deletePushSubscription(sub.endpoint);
            removed.push(sub.endpoint);
          }
        }
      }),
    );

    await recordPushLog(today, period);
    sent.push(period);
  }

  return NextResponse.json({ ok: true, sent, removed: removed.length });
}
