"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUp,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  Loader2,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Lesson, Task } from "@/lib/db/schema";
import {
  formatThaiDateLong,
  minutesSinceMidnightBangkok,
  relativeDateLabel,
  timeToMinutes,
} from "@/lib/time";
import type { PeriodTimes } from "@/lib/validation";
import { PageHeader } from "@/components/ui/page-header";
import { TaskRow } from "@/components/tasks/task-row";

type Props = {
  today: string;
  todayDay: number;
  initialNowMinutes: number;
  lessons: Lesson[];
  periodTimes: PeriodTimes;
  tasks: Task[];
  digestTime: string;
};

type Row =
  | { type: "lesson"; period: number; lesson: Lesson }
  | { type: "free"; from: number; to: number };

export function TodayView({
  today,
  todayDay,
  initialNowMinutes,
  lessons,
  periodTimes,
  tasks,
  digestTime,
}: Props) {
  const [nowMinutes, setNowMinutes] = useState(initialNowMinutes);
  const [items, setItems] = useState<Task[]>(tasks);
  const [quick, setQuick] = useState("");
  const [pendingQuick, setPendingQuick] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(
      () => setNowMinutes(minutesSinceMidnightBangkok()),
      30_000,
    );
    return () => clearInterval(timer);
  }, []);

  const timeOf = (period: number) =>
    periodTimes[String(period)] ?? { start: "—", end: "—" };

  const todaysLessons = useMemo(
    () =>
      lessons
        .filter((lesson) => lesson.dayOfWeek === todayDay)
        .sort((a, b) => a.period - b.period),
    [lessons, todayDay],
  );

  const subjectNames = useMemo(
    () =>
      new Map(
        lessons.map((lesson) => [lesson.subjectCode, lesson.subjectName]),
      ),
    [lessons],
  );

  const rows = useMemo<Row[]>(() => {
    if (todaysLessons.length === 0) return [];
    const byPeriod = new Map(todaysLessons.map((l) => [l.period, l]));
    const last = Math.max(...todaysLessons.map((lesson) => lesson.period));
    const output: Row[] = [];
    let freeStart: number | null = null;

    for (let period = 1; period <= last; period += 1) {
      const lesson = byPeriod.get(period);
      if (lesson) {
        if (freeStart !== null) {
          output.push({ type: "free", from: freeStart, to: period - 1 });
          freeStart = null;
        }
        output.push({ type: "lesson", period, lesson });
      } else if (freeStart === null) {
        freeStart = period;
      }
    }
    if (freeStart !== null) {
      output.push({ type: "free", from: freeStart, to: last });
    }
    return output;
  }, [todaysLessons]);

  const nextLesson = useMemo(() => {
    for (const lesson of todaysLessons) {
      const { end } = timeOf(lesson.period);
      if (!end.includes(":")) continue;
      if (timeToMinutes(end) > nowMinutes) return lesson;
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todaysLessons, nowMinutes]);

  const currentLesson = useMemo(() => {
    for (const lesson of todaysLessons) {
      const { start, end } = timeOf(lesson.period);
      if (!start.includes(":") || !end.includes(":")) continue;
      if (
        nowMinutes >= timeToMinutes(start) &&
        nowMinutes < timeToMinutes(end)
      ) {
        return lesson;
      }
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todaysLessons, nowMinutes]);

  const allEnded = useMemo(() => {
    if (todaysLessons.length === 0) return true;
    const last = todaysLessons[todaysLessons.length - 1];
    const { end } = timeOf(last.period);
    return end.includes(":") && timeToMinutes(end) <= initialNowMinutes;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todaysLessons, initialNowMinutes]);

  const [scheduleOpen, setScheduleOpen] = useState(!allEnded);

  const open = items.filter((task) => task.doneAt === null);
  const dueToday = open.filter((task) => task.dueDate === today);
  const overdue = open.filter((task) => task.dueDate < today);
  const doneToday = items.filter(
    (task) =>
      task.doneAt !== null &&
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Bangkok",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(task.doneAt) === today,
  );

  async function toggle(task: Task) {
    const nextDone = task.doneAt === null;
    const optimistic = { ...task, doneAt: nextDone ? new Date() : null };
    setItems((previous) =>
      previous.map((item) => (item.id === task.id ? optimistic : item)),
    );

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: nextDone }),
      });
      if (!response.ok) throw new Error("failed");
      if (nextDone) {
        toast.success("เสร็จแล้ว", {
          action: { label: "เลิกทำ", onClick: () => void toggle(optimistic) },
        });
      }
    } catch {
      setItems((previous) =>
        previous.map((item) => (item.id === task.id ? task : item)),
      );
      toast.error("บันทึกไม่สำเร็จ");
    }
  }

  async function quickAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = quick.trim();
    if (!title || pendingQuick) return;

    setPendingQuick(true);
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          subjectCode: null,
          dueDate: today,
          priority: "normal",
          notes: "",
        }),
      });
      if (!response.ok) throw new Error("create failed");
      const data = (await response.json()) as { task: Task };
      setItems((previous) => [
        ...previous,
        {
          ...data.task,
          createdAt: new Date(data.task.createdAt),
          doneAt: data.task.doneAt ? new Date(data.task.doneAt) : null,
        },
      ]);
      setQuick("");
      toast.success("เพิ่มแล้ว", {
        description: `จะอยู่ในสรุปคืนนี้ ${digestTime}`,
      });
    } catch {
      toast.error("เพิ่มงานไม่สำเร็จ");
    } finally {
      setPendingQuick(false);
    }
  }

  const hero = currentLesson ?? nextLesson;
  const heroTime = hero ? timeOf(hero.period) : null;
  const heroProgress =
    hero && currentLesson && heroTime
      ? Math.min(
          100,
          Math.max(
            0,
            ((nowMinutes - timeToMinutes(heroTime.start)) /
              Math.max(
                1,
                timeToMinutes(heroTime.end) - timeToMinutes(heroTime.start),
              )) *
              100,
          ),
        )
      : 0;

  return (
    <div className="mx-auto w-full max-w-[720px]">
      <PageHeader title="วันนี้" subtitle={formatThaiDateLong(today)} />

      {todaysLessons.length === 0 ? (
        <div className="rounded-[16px] bg-card p-4 shadow-[0_0_0_0.5px_rgba(0,0,0,0.04)]">
          <p className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground">
            <CalendarDays className="size-4" aria-hidden="true" />
            วันนี้ไม่มีเรียน
          </p>
          <p className="mt-1 text-[15px]">
            {open.length > 0
              ? `มีงานค้างอยู่ ${open.length} งาน`
              : "เคลียร์งานหมดแล้ว พักได้เต็มที่"}
          </p>
        </div>
      ) : hero && heroTime ? (
        <div className="rounded-[16px] bg-secondary p-4">
          <p className="text-[13px] font-semibold text-primary-text">
            {currentLesson
              ? `กำลังเรียน · เหลือ ${timeToMinutes(heroTime.end) - nowMinutes} นาที`
              : `คาบถัดไป · อีก ${timeToMinutes(heroTime.start) - nowMinutes} นาที`}
          </p>
          <p className="mt-1 line-clamp-2 text-[22px] leading-snug font-semibold">
            {hero.subjectName}
          </p>
          <p className="tabular mt-1 text-[13px] text-secondary-foreground">
            คาบ {hero.period} · {heroTime.start}–{heroTime.end} ·{" "}
            {hero.subjectCode}
          </p>
          {currentLesson ? (
            <div
              className="mt-3 h-[3px] overflow-hidden rounded-full bg-primary/15"
              role="progressbar"
              aria-valuenow={Math.round(heroProgress)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="ความคืบหน้าของคาบ"
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500"
                style={{ width: `${heroProgress}%` }}
              />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-[16px] bg-card p-4 shadow-[0_0_0_0.5px_rgba(0,0,0,0.04)]">
          <p className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground">
            <Check className="size-4 text-success" aria-hidden="true" />
            เรียนจบแล้ววันนี้
          </p>
          <p className="mt-1 text-[15px]">
            {open.length > 0
              ? `เหลือ ${open.length} งานที่ยังไม่เสร็จ`
              : "ไม่มีงานค้าง ทำครบแล้ว"}
          </p>
        </div>
      )}

      {overdue.length > 0 ? (
        <section className="mt-5">
          <div className="flex items-center justify-between px-4 pb-1.5">
            <h2 className="text-[13px] font-semibold text-destructive">
              เกินกำหนด
            </h2>
            <span className="tabular text-[13px] font-medium text-destructive">
              {overdue.length}
            </span>
          </div>
          <ul className="group-card">
            {overdue.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                subjectName={
                  task.subjectCode
                    ? subjectNames.get(task.subjectCode)
                    : undefined
                }
                overdue
                onToggle={toggle}
                onOpen={() => router.push(`/t/${task.id}`)}
              />
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-5">
        <div className="flex items-center justify-between px-4 pb-1.5">
          <h2 className="text-[13px] font-semibold text-muted-foreground">
            วันนี้
          </h2>
          <span className="tabular text-[13px] font-medium text-muted-foreground">
            {dueToday.length}
          </span>
        </div>

        <form onSubmit={quickAdd} className="relative mb-2">
          <Plus
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            value={quick}
            onChange={(event) => setQuick(event.target.value)}
            placeholder="เพิ่มงานวันนี้…"
            aria-label="ชื่องานใหม่สำหรับวันนี้"
            maxLength={120}
            enterKeyHint="done"
            className="h-12 w-full rounded-[12px] bg-card pr-14 pl-12 text-[16px] text-foreground shadow-[0_0_0_0.5px_rgba(0,0,0,0.04)] outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          <button
            type="submit"
            aria-label="เพิ่มงานวันนี้"
            disabled={!quick.trim() || pendingQuick}
            className="absolute top-1/2 right-0.5 flex size-11 -translate-y-1/2 items-center justify-center rounded-full disabled:opacity-40"
          >
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-full transition-colors",
                quick.trim()
                  ? "bg-primary text-primary-foreground"
                  : "bg-fill text-muted-foreground",
              )}
            >
              {pendingQuick ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <ArrowUp
                  className="size-4"
                  strokeWidth={2.5}
                  aria-hidden="true"
                />
              )}
            </span>
          </button>
        </form>

        {dueToday.length === 0 ? (
          <div className="group-card px-4 py-3">
            <p className="text-[13px] text-muted-foreground">
              ยังไม่มีงานที่ต้องส่งวันนี้
            </p>
          </div>
        ) : (
          <ul className="group-card">
            {dueToday.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                subjectName={
                  task.subjectCode
                    ? subjectNames.get(task.subjectCode)
                    : undefined
                }
                onToggle={toggle}
                onOpen={() => router.push(`/t/${task.id}`)}
              />
            ))}
          </ul>
        )}
      </section>

      {rows.length > 0 ? (
        <section className="mt-6">
          <button
            type="button"
            onClick={() => setScheduleOpen((value) => !value)}
            aria-expanded={scheduleOpen}
            className="flex w-full items-center justify-between px-4 py-2 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <span className="flex items-center gap-1">
              <ChevronRight
                className={cn(
                  "size-4 transition-transform",
                  scheduleOpen && "rotate-90",
                )}
                aria-hidden="true"
              />
              ตารางวันนี้
            </span>
            <span className="tabular font-medium">
              {todaysLessons.length} คาบ
            </span>
          </button>

          {scheduleOpen ? (
            <ul className="group-card">
              {rows.map((row) => {
                if (row.type === "free") {
                  return (
                    <li
                      key={`free-${row.from}`}
                      className="relative px-4 py-2.5 pl-[72px] text-[12px] text-muted-foreground after:pointer-events-none after:absolute after:right-0 after:bottom-0 after:left-[72px] after:h-px after:bg-border/70 last:after:hidden"
                    >
                      ว่าง{" "}
                      {row.from === row.to
                        ? `คาบ ${row.from}`
                        : `คาบ ${row.from}–${row.to}`}
                    </li>
                  );
                }

                const { start, end } = timeOf(row.period);
                const isNow = row.period === currentLesson?.period;
                const isPast =
                  end.includes(":") && timeToMinutes(end) <= nowMinutes;

                return (
                  <li
                    key={`lesson-${row.period}`}
                    className={cn(
                      "relative flex min-h-[56px] items-center gap-3 px-3 py-2 after:pointer-events-none after:absolute after:right-0 after:bottom-0 after:left-[72px] after:h-px after:bg-border/70 last:after:hidden",
                      isNow && "bg-secondary",
                    )}
                  >
                    <span className="tabular w-[60px] shrink-0 pl-1 text-[11px] text-muted-foreground">
                      <span
                        className={cn(
                          "block text-[13px] font-semibold",
                          isNow ? "text-primary-text" : "text-foreground",
                        )}
                      >
                        {start}
                      </span>
                      {end}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "line-clamp-1 block text-[15px] font-medium",
                          isPast && !isNow && "text-muted-foreground",
                        )}
                      >
                        {row.lesson.subjectName}
                      </span>
                      <span className="text-[12px] text-muted-foreground">
                        คาบ {row.period} · {row.lesson.subjectCode}
                      </span>
                    </span>
                    {isNow ? (
                      <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                        ตอนนี้
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>
      ) : null}

      <p className="mt-7 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-[12px] text-muted-foreground">
        <Clock className="size-3.5" aria-hidden="true" />
        สรุปงานทาง Discord {digestTime}
        {doneToday.length > 0 ? (
          <>
            <span aria-hidden="true">·</span>
            <Check className="size-3.5 text-success" aria-hidden="true" />
            ทำเสร็จแล้ว {doneToday.length}
          </>
        ) : null}
      </p>
      <p className="mt-2 text-center text-[12px] text-muted-foreground">
        งานที่เลยกำหนดจะถูกเตือนซ้ำทุกวันจนกว่าจะทำเสร็จ
      </p>

      <span className="sr-only">
        {overdue.length > 0
          ? `มีงานเกินกำหนด ${overdue.length} รายการ`
          : `ไม่มีงานเกินกำหนด`}{" "}
        {open.length > 0
          ? `ถัดไป ${relativeDateLabel(open[0].dueDate, today)}`
          : ""}
      </span>
    </div>
  );
}
