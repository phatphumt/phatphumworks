import { and, asc, eq, isNull, lte, sql } from "drizzle-orm";
import { db } from "./db";
import { digestLog, lessons, pushLog, pushSubscriptions, settings, tasks } from "./db/schema";
import type { DigestLog, Lesson, PushLog, PushSubscription, Task } from "./db/schema";
import { addDaysISO, todayISO } from "./time";
import { DIGEST_TIME, DIGEST_WINDOW_DAYS, type PeriodTimes } from "./validation";

export const DEFAULT_PERIOD_TIMES: PeriodTimes = {
  "1": { start: "08:30", end: "09:20" },
  "2": { start: "09:25", end: "10:15" },
  "3": { start: "10:25", end: "11:15" },
  "4": { start: "11:15", end: "12:05" },
  "5": { start: "13:00", end: "13:50" },
  "6": { start: "13:50", end: "14:40" },
  "7": { start: "14:40", end: "15:30" },
  "8": { start: "15:30", end: "16:20" },
  "9": { start: "16:20", end: "17:10" },
  "10": { start: "17:10", end: "18:00" },
};

const PRIORITY_RANK = sql`case ${tasks.priority} when 'high' then 0 when 'normal' then 1 else 2 end`;

export async function getLessons(): Promise<Lesson[]> {
  return db.select().from(lessons).orderBy(asc(lessons.dayOfWeek), asc(lessons.period));
}

/** Every task that still shows up somewhere in the UI (not archived). */
export async function getVisibleTasks(): Promise<Task[]> {
  return db
    .select()
    .from(tasks)
    .where(isNull(tasks.archivedAt))
    .orderBy(asc(tasks.dueDate), PRIORITY_RANK, asc(tasks.createdAt));
}

export async function getTask(id: string): Promise<Task | undefined> {
  const rows = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return rows[0];
}

/** All push subscriptions (one row per device). */
export async function getPushSubscriptions(): Promise<PushSubscription[]> {
  return db.select().from(pushSubscriptions);
}

export async function upsertPushSubscription(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<void> {
  await db
    .insert(pushSubscriptions)
    .values(input)
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { p256dh: input.p256dh, auth: input.auth },
    });
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}

export async function getPushLog(date: string): Promise<PushLog[]> {
  return db.select().from(pushLog).where(eq(pushLog.date, date));
}

export async function recordPushLog(date: string, period: number): Promise<void> {
  await db
    .insert(pushLog)
    .values({ date, period })
    .onConflictDoNothing();
}

/** Every task ever recorded, archived rows included — used by monthly export. */
export async function getAllTasks(): Promise<Task[]> {
  return db
    .select()
    .from(tasks)
    .orderBy(asc(tasks.dueDate), PRIORITY_RANK, asc(tasks.createdAt));
}

/** Tasks that belong in the 18:00 digest: open, due within N days or overdue. */
export async function getDigestTasks(
  windowDays = DIGEST_WINDOW_DAYS,
): Promise<Task[]> {
  const until = addDaysISO(todayISO(), windowDays);
  return db
    .select()
    .from(tasks)
    .where(
      and(
        isNull(tasks.doneAt),
        isNull(tasks.archivedAt),
        lte(tasks.dueDate, until),
      ),
    )
    .orderBy(asc(tasks.dueDate), PRIORITY_RANK, asc(tasks.createdAt));
}

export async function getSettings(): Promise<Record<string, string>> {
  const rows = await db.select().from(settings);
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

export async function getSetting(key: string): Promise<string | undefined> {
  const rows = await db
    .select()
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1);
  return rows[0]?.value;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
}

export async function deleteSetting(key: string): Promise<void> {
  await db.delete(settings).where(eq(settings.key, key));
}

export async function getPeriodTimes(): Promise<PeriodTimes> {
  const raw = await getSetting("periodTimes");
  if (!raw) return DEFAULT_PERIOD_TIMES;
  try {
    const parsed = JSON.parse(raw) as PeriodTimes;
    return { ...DEFAULT_PERIOD_TIMES, ...parsed };
  } catch {
    return DEFAULT_PERIOD_TIMES;
  }
}

export type DigestSettings = {
  webhookUrl: string;
  digestTime: string;
  windowDays: number;
};

export async function getDigestSettings(): Promise<DigestSettings> {
  const map = await getSettings();
  return {
    webhookUrl: map.discordWebhookUrl ?? process.env.DISCORD_WEBHOOK_URL ?? "",
    digestTime: map.digestTime ?? DIGEST_TIME,
    windowDays: Number(map.windowDays ?? DIGEST_WINDOW_DAYS) || DIGEST_WINDOW_DAYS,
  };
}

export async function getDigestLog(date: string): Promise<DigestLog | undefined> {
  const rows = await db
    .select()
    .from(digestLog)
    .where(eq(digestLog.date, date))
    .limit(1);
  return rows[0];
}

export async function getRecentDigestLogs(limit = 5): Promise<DigestLog[]> {
  return db
    .select()
    .from(digestLog)
    .orderBy(sql`${digestLog.date} desc`)
    .limit(limit);
}

/** Upsert one day's attempt — `date` is the idempotency lock. */
export async function recordDigest(
  date: string,
  patch: { sentAt?: Date | null; itemCount?: number; error?: string | null },
): Promise<void> {
  const values = {
    date,
    sentAt: patch.sentAt ?? null,
    itemCount: patch.itemCount ?? 0,
    error: patch.error ?? null,
  };

  await db
    .insert(digestLog)
    .values(values)
    .onConflictDoUpdate({
      target: digestLog.date,
      set: {
        sentAt: values.sentAt,
        itemCount: values.itemCount,
        error: values.error,
      },
    });
}

/**
 * Removes completed tasks 7 days after completion. Runs inside the cron job so
 * an undo is still possible for a while after ticking something off.
 */
export async function archiveOldCompletedTasks(): Promise<number> {
  const cutoff = new Date(Date.now() - 7 * 86_400_000);
  const rows = await db
    .update(tasks)
    .set({ archivedAt: new Date() })
    .where(and(isNull(tasks.archivedAt), lte(tasks.doneAt, cutoff)))
    .returning({ id: tasks.id });
  return rows.length;
}
