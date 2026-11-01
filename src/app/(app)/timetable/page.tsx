import { getLessons, getPeriodTimes } from "@/lib/data";
import {
  dayOfWeekISO,
  minutesSinceMidnightBangkok,
  todayISO,
} from "@/lib/time";
import { TimetableView } from "@/components/timetable/timetable-view";

export const dynamic = "force-dynamic";

export default async function TimetablePage() {
  const today = todayISO();
  const [lessons, periodTimes] = await Promise.all([
    getLessons(),
    getPeriodTimes(),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <TimetableView
        lessons={lessons}
        periodTimes={periodTimes}
        today={today}
        todayDay={dayOfWeekISO(today)}
        initialNowMinutes={minutesSinceMidnightBangkok()}
      />
    </div>
  );
}
