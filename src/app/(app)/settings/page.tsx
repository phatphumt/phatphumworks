import {
  getDigestSettings,
  getLessons,
  getPeriodTimes,
  getRecentDigestLogs,
  getVisibleTasks,
} from "@/lib/data";
import {
  addDaysISO,
  formatThaiDate,
  minutesSinceMidnightBangkok,
  timeToMinutes,
  todayISO,
} from "@/lib/time";
import { SettingsView } from "@/components/settings/settings-view";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const today = todayISO();
  const [digest, periodTimes, lessons, tasks, logs] = await Promise.all([
    getDigestSettings(),
    getPeriodTimes(),
    getLessons(),
    getVisibleTasks(),
    getRecentDigestLogs(1),
  ]);

  const last = logs[0] ?? null;
  const sentToday = last?.date === today && last?.sentAt;
  const nextDate =
    sentToday || minutesSinceMidnightBangkok() >= timeToMinutes(digest.digestTime)
      ? addDaysISO(today, 1)
      : today;

  const nextRunLabel = `${formatThaiDate(nextDate, true)} ${digest.digestTime}`;

  return (
    <SettingsView
      initialWebhook={digest.webhookUrl}
      initialDigestTime={digest.digestTime}
      initialWindowDays={digest.windowDays}
      initialPeriodTimes={periodTimes}
      lastLog={
        last
          ? {
              date: last.date,
              sentAt: last.sentAt ? last.sentAt.toISOString() : null,
              itemCount: last.itemCount,
              error: last.error,
            }
          : null
      }
      nextRunLabel={nextRunLabel}
      appUrl={process.env.NEXT_PUBLIC_APP_URL ?? null}
      lessonCount={lessons.length}
      taskCount={tasks.length}
    />
  );
}
