import {
  getDigestSettings,
  getLessons,
  getPeriodTimes,
  getVisibleTasks,
} from "@/lib/data";
import {
  dayOfWeekISO,
  minutesSinceMidnightBangkok,
  todayISO,
} from "@/lib/time";
import { TodayView } from "@/components/today/today-view";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const today = todayISO();
  const [lessons, periodTimes, tasks, digest] = await Promise.all([
    getLessons(),
    getPeriodTimes(),
    getVisibleTasks(),
    getDigestSettings(),
  ]);

  return (
    <TodayView
      today={today}
      todayDay={dayOfWeekISO(today)}
      initialNowMinutes={minutesSinceMidnightBangkok()}
      lessons={lessons}
      periodTimes={periodTimes}
      tasks={tasks}
      digestTime={digest.digestTime}
    />
  );
}
