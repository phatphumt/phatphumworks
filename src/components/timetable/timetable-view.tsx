"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import type { Lesson } from "@/lib/db/schema";
import { subjectAccent, subjectStyle } from "@/lib/subjects";
import {
  addDaysISO,
  dayName,
  minutesSinceMidnightBangkok,
  timeToMinutes,
} from "@/lib/time";
import type { PeriodTimes } from "@/lib/validation";
import { SlotSheet } from "./slot-sheet";
import { ImportSheet } from "./import-sheet";

type Props = {
  lessons: Lesson[];
  periodTimes: PeriodTimes;
  today: string;
  todayDay: number;
  initialNowMinutes: number;
};

type Editing = {
  dayOfWeek: number;
  period: number;
} | null;

const DAY_SHORT = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."] as const;

export function TimetableView({
  lessons,
  periodTimes,
  today,
  todayDay,
  initialNowMinutes,
}: Props) {
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState(todayDay);
  const [editing, setEditing] = useState<Editing>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [nowMinutes, setNowMinutes] = useState(initialNowMinutes);

  useEffect(() => {
    const timer = setInterval(
      () => setNowMinutes(minutesSinceMidnightBangkok()),
      60_000,
    );
    return () => clearInterval(timer);
  }, []);

  const days = useMemo(() => {
    const weekdays = [1, 2, 3, 4, 5];
    const usesWeekend = lessons.some((lesson) => lesson.dayOfWeek >= 6);
    return usesWeekend ? [1, 2, 3, 4, 5, 6, 7] : weekdays;
  }, [lessons]);

  // If the selected day disappears when the timetable changes, fall back to the
  // first visible day. Deriving it avoids an effect that resets state.
  const activeDay = days.includes(selectedDay) ? selectedDay : days[0];

  const periods = useMemo(() => {
    const highest = lessons.reduce(
      (max, lesson) => Math.max(max, lesson.period),
      8,
    );
    return Array.from({ length: Math.max(8, highest) }, (_, index) => index + 1);
  }, [lessons]);

  const byCell = useMemo(() => {
    const map = new Map<string, Lesson>();
    for (const lesson of lessons) {
      map.set(`${lesson.dayOfWeek}:${lesson.period}`, lesson);
    }
    return map;
  }, [lessons]);

  function timeOf(period: number) {
    return periodTimes[String(period)] ?? { start: "—", end: "—" };
  }

  const currentPeriod = periods.find((period) => {
    const { start, end } = timeOf(period);
    if (!start.includes(":")) return false;
    return (
      nowMinutes >= timeToMinutes(start) && nowMinutes < timeToMinutes(end)
    );
  });

  const lessonFor = (day: number, period: number) =>
    byCell.get(`${day}:${period}`) ?? null;

  const editingTime = editing
    ? `${timeOf(editing.period).start}–${timeOf(editing.period).end}`
    : "";

  const dateFor = (day: number) => addDaysISO(today, day - todayDay);
  const dateNumber = (day: number) => Number(dateFor(day).slice(8, 10));
  const monthLabel = new Intl.DateTimeFormat("th-TH-u-ca-gregory", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateFor(days[0])}T12:00:00Z`));

  return (
    <div className="w-full">
      <PageHeader
        title="ตารางเรียน"
        subtitle={
          <>
            <span className="tabular">{lessons.length}</span> คาบ/สัปดาห์
            {currentPeriod ? (
              <span className="font-medium text-primary-text">
                {" "}
                · กำลังเรียนคาบ {currentPeriod}
              </span>
            ) : null}
          </>
        }
      />

      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-muted-foreground">
          {monthLabel}
        </p>
        <div className="flex items-center gap-2">
          <a
            href="/api/schedule"
            download="schedule.json"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "h-11 gap-1.5 rounded-full bg-fill px-3.5 text-[13px]",
            )}
          >
            <Download className="size-4" aria-hidden="true" />
            ดาวน์โหลด
          </a>
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="flex h-11 items-center gap-1.5 rounded-full bg-fill px-3.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-fill-strong"
          >
            <Upload className="size-4" aria-hidden="true" />
            นำเข้า
          </button>
        </div>
      </div>

      {lessons.length === 0 ? (
        <p className="mb-3 rounded-[12px] bg-secondary px-4 py-2.5 text-[13px] leading-relaxed text-secondary-foreground">
          ยังไม่มีตาราง · นำเข้าไฟล์ JSON หรือแตะช่องว่างเพื่อเพิ่มวิชา
        </p>
      ) : null}

      {/* Mobile: week strip + one day */}
      <div className="md:hidden">
        <div
          role="tablist"
          aria-label="เลือกวัน"
          className="-mx-4 mb-3 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {days.map((day) => {
            const active = day === activeDay;
            const isToday = day === todayDay;
            return (
              <button
                key={day}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSelectedDay(day)}
                className="flex h-14 min-w-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-[12px] transition-colors hover:bg-fill"
              >
                <span
                  className={cn(
                    "text-[11px] font-medium",
                    active ? "text-primary-text" : "text-muted-foreground",
                  )}
                >
                  {DAY_SHORT[day - 1]}
                </span>
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full text-[16px] tabular transition-colors",
                    active
                      ? "bg-primary font-semibold text-primary-foreground"
                      : isToday
                        ? "font-semibold text-primary-text"
                        : "text-foreground",
                  )}
                >
                  {dateNumber(day)}
                </span>
              </button>
            );
          })}
        </div>

        <ul className="group-card">
          {periods.map((period) => {
            const lesson = lessonFor(activeDay, period);
            const { start, end } = timeOf(period);
            const next = timeOf(period + 1);
            const gap =
              next.start.includes(":") && end.includes(":")
                ? timeToMinutes(next.start) - timeToMinutes(end)
                : 0;
            const isNow = activeDay === todayDay && period === currentPeriod;

            return (
              <li key={period}>
                <button
                  type="button"
                  onClick={() => setEditing({ dayOfWeek: activeDay, period })}
                  className={cn(
                    "relative flex min-h-[60px] w-full items-center gap-3 px-3 py-2 text-left transition-colors after:pointer-events-none after:absolute after:right-0 after:bottom-0 after:left-[68px] after:h-px after:bg-border/70 hover:bg-fill/60 last:after:hidden",
                    isNow && "bg-secondary",
                  )}
                >
                  <span className="tabular w-14 shrink-0 pl-1 text-[11px] text-muted-foreground">
                    <span
                      className={cn(
                        "block text-[13px] font-semibold",
                        isNow ? "text-primary-text" : "text-foreground",
                      )}
                    >
                      คาบ {period}
                    </span>
                    {start}
                  </span>

                  {lesson ? (
                    <span className="flex min-w-0 flex-1 items-center gap-2.5">
                      <span
                        aria-hidden="true"
                        className="h-9 w-1 shrink-0 rounded-full"
                        style={{
                          backgroundColor: subjectAccent(lesson.subjectCode),
                        }}
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] font-medium">
                          {lesson.subjectName}
                        </span>
                        <span className="block text-[12px] text-muted-foreground">
                          {lesson.subjectCode}
                        </span>
                      </span>
                    </span>
                  ) : (
                    <span className="flex flex-1 items-center gap-1.5 text-[13px] text-muted-foreground">
                      <Plus className="size-4" aria-hidden="true" />
                      ว่าง · แตะเพื่อเพิ่ม
                    </span>
                  )}

                  {isNow ? (
                    <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                      ตอนนี้
                    </span>
                  ) : null}
                </button>

                {gap >= 30 ? (
                  <div className="bg-muted/60 px-3 py-1 pl-[68px] text-[11px] text-muted-foreground">
                    พัก · {end}–{next.start}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Desktop: full week grid */}
      <div className="hidden md:block">
        <div className="group-card max-h-[calc(100dvh-14rem)] overflow-auto">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">ตารางเรียนรายสัปดาห์</caption>
            <thead className="sticky top-0 z-20 bg-card">
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-30 w-[76px] border-b border-border/70 bg-card px-3 py-2.5 text-[12px] font-medium text-muted-foreground"
                >
                  คาบ
                </th>
                {days.map((day) => (
                  <th
                    key={day}
                    scope="col"
                    className={cn(
                      "border-b border-l border-border/70 px-3 py-2",
                      day === todayDay
                        ? "bg-secondary/50 text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    <span className="flex items-baseline gap-1.5">
                      <span className="text-[12.5px] font-semibold">
                        {dayName(day)}
                      </span>
                      <span className="tabular text-[11px]">
                        {dateNumber(day)}
                      </span>
                      {day === todayDay ? (
                        <span
                          aria-hidden="true"
                          className="size-1.5 rounded-full bg-primary"
                        />
                      ) : null}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.map((period) => {
                const { start, end } = timeOf(period);
                const isNowRow = period === currentPeriod;
                return (
                  <tr key={period}>
                    <th
                      scope="row"
                      className={cn(
                        "sticky left-0 z-10 border-b border-border/70 bg-card px-3 py-2 align-top text-[11px] font-normal",
                        isNowRow ? "text-primary-text" : "text-muted-foreground",
                      )}
                    >
                      <span className="tabular block text-[12.5px] font-semibold">
                        {period}
                      </span>
                      <span className="tabular block">{start}</span>
                      <span className="tabular block text-muted-foreground/80">
                        {end}
                      </span>
                    </th>

                    {days.map((day) => {
                      const lesson = lessonFor(day, period);
                      return (
                        <td
                          key={day}
                          className={cn(
                            "h-[72px] min-w-[104px] border-b border-l border-border/70 p-1 align-top",
                            day === todayDay && "bg-secondary/25",
                          )}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setEditing({ dayOfWeek: day, period })
                            }
                            aria-label={
                              lesson
                                ? `${dayName(day)} คาบ ${period} ${lesson.subjectCode} ${lesson.subjectName} · แก้ไข`
                                : `${dayName(day)} คาบ ${period} ว่าง · เพิ่มวิชา`
                            }
                            className={cn(
                              "group flex h-full w-full flex-col justify-center rounded-[8px] px-2 py-1 text-left transition-colors",
                              lesson
                                ? "subject-chip border-l-[3px]"
                                : "border border-dashed border-transparent hover:border-border hover:bg-fill/60",
                            )}
                            style={
                              lesson
                                ? subjectStyle(lesson.subjectCode)
                                : undefined
                            }
                          >
                            {lesson ? (
                              <>
                                <span className="text-[12px] leading-tight font-semibold">
                                  {lesson.subjectCode}
                                </span>
                                <span className="line-clamp-2 text-[12px] leading-tight">
                                  {lesson.subjectName}
                                </span>
                              </>
                            ) : (
                              <span className="flex items-center justify-center text-muted-foreground opacity-30 transition-opacity group-hover:opacity-100">
                                <Plus className="size-4" aria-hidden="true" />
                              </span>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <SlotSheet
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        dayOfWeek={editing?.dayOfWeek ?? 1}
        period={editing?.period ?? 1}
        timeLabel={editingTime}
        lesson={editing ? lessonFor(editing.dayOfWeek, editing.period) : null}
        onSaved={() => {
          router.refresh();
          toast.success("บันทึกตารางแล้ว");
        }}
        onDeleted={() => {
          router.refresh();
          toast("ลบคาบนี้แล้ว");
        }}
      />

      <ImportSheet
        open={importOpen}
        onOpenChange={setImportOpen}
        current={lessons}
        onImported={(count) => {
          router.refresh();
          toast.success("นำเข้าสำเร็จ", {
            description: `ตารางใหม่มี ${count} คาบ`,
          });
        }}
      />
    </div>
  );
}
