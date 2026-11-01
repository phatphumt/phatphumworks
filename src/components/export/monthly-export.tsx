"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Loader2,
} from "lucide-react";
import { toBlob } from "html-to-image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/db/schema";
import {
  addMonthsToKey,
  formatThaiDate,
  formatThaiDateWithDay,
  formatThaiMonth,
  monthKeyOf,
} from "@/lib/time";
import { subjectAccent } from "@/lib/subjects";

const REPORT_W = 1080;
const REPORT_H = 1350;
const MAX_PNG_ROWS = 18;

type TaskGroup = { date: string; tasks: Task[] };

function isDone(task: Task): boolean {
  return task.doneAt !== null;
}

function groupByDate(list: Task[]): TaskGroup[] {
  const map = new Map<string, Task[]>();
  for (const task of list) {
    const bucket = map.get(task.dueDate);
    if (bucket) bucket.push(task);
    else map.set(task.dueDate, [task]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, tasks]) => ({ date, tasks }));
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "primary" | "success" | "destructive";
}) {
  return (
    <div className="rounded-[22px] bg-card px-6 py-5 ring-1 ring-border/60">
      <p
        className={cn(
          "tabular text-[40px] leading-none font-bold",
          tone === "primary" && "text-primary-text",
          tone === "success" && "text-success",
          tone === "destructive" && "text-destructive",
        )}
      >
        {value}
      </p>
      <p className="mt-1.5 text-[17px] text-muted-foreground">{label}</p>
    </div>
  );
}

function ExportGroup({
  group,
  compact,
}: {
  group: TaskGroup;
  compact: boolean;
}) {
  return (
    <section className="mb-4 break-inside-avoid">
      <div
        className={cn(
          "flex items-baseline gap-2.5",
          compact ? "mb-1" : "mb-2",
        )}
      >
        <h3
          className={cn(
            "leading-tight font-semibold",
            compact ? "text-[17px]" : "text-[19px]",
          )}
        >
          {formatThaiDateWithDay(group.date)}
        </h3>
        <span className="tabular text-[16px] text-muted-foreground">
          {group.tasks.length}
        </span>
        <span className="mb-1 h-px flex-1 bg-border" />
      </div>
      <ul className={compact ? "space-y-1" : "space-y-1.5"}>
        {group.tasks.map((task) => {
          const done = isDone(task);
          return (
            <li
              key={task.id}
              className={cn(
                "flex items-center bg-card ring-1 ring-border/50",
                compact
                  ? "gap-2 rounded-[12px] px-3 py-1"
                  : "gap-2.5 rounded-[14px] px-4 py-2",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "shrink-0 rounded-full",
                  compact ? "size-2" : "size-2.5",
                )}
                style={{ backgroundColor: subjectAccent(task.subjectCode) }}
              />
              <span
                className={cn(
                  "min-w-0 flex-1 truncate leading-snug",
                  compact ? "text-[17px]" : "text-[19px]",
                  done && "text-muted-foreground line-through",
                )}
              >
                {task.title}
              </span>
              {task.subjectCode ? (
                <span
                  className={cn(
                    "shrink-0 font-medium text-muted-foreground",
                    compact ? "text-[13px]" : "text-[14px]",
                  )}
                >
                  {task.subjectCode}
                </span>
              ) : null}
              {task.priority === "high" && !done ? (
                <span
                  className={cn(
                    "shrink-0 rounded-full bg-destructive/10 font-semibold text-destructive",
                    compact
                      ? "px-1.5 py-0 text-[12px]"
                      : "px-2 py-0.5 text-[13px]",
                  )}
                >
                  ด่วน
                </span>
              ) : null}
              {done ? (
                <Check
                  className={cn(
                    "shrink-0 text-success",
                    compact ? "size-3.5" : "size-4",
                  )}
                  strokeWidth={2.6}
                  aria-hidden="true"
                />
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

type Props = {
  tasks: Task[];
  today: string;
};

export function MonthlyExport({ tasks, today }: Props) {
  const [month, setMonth] = useState(() => monthKeyOf(today));
  const [busy, setBusy] = useState(false);
  const [scale, setScale] = useState(0.32);
  const frameRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const currentMonth = monthKeyOf(today);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const update = () => {
      const width = frame.clientWidth;
      if (width > 0) setScale(width / REPORT_W);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  const monthTasks = useMemo(
    () => tasks.filter((task) => monthKeyOf(task.dueDate) === month),
    [tasks, month],
  );

  const openTasks = useMemo(
    () => monthTasks.filter((task) => !isDone(task)),
    [monthTasks],
  );
  const doneTasks = useMemo(
    () => monthTasks.filter((task) => isDone(task)),
    [monthTasks],
  );

  const overdue = useMemo(
    () => openTasks.filter((task) => task.dueDate < today).length,
    [openTasks, today],
  );

  const pngTasks = useMemo(() => {
    const openShown = openTasks.slice(0, MAX_PNG_ROWS);
    const room = Math.max(MAX_PNG_ROWS - openShown.length, 0);
    return groupByDate([
      ...openShown,
      ...doneTasks.slice(0, room),
    ]).flatMap((group) => group.tasks);
  }, [openTasks, doneTasks]);

  const pngGroups = useMemo(() => groupByDate(pngTasks), [pngTasks]);
  const half = Math.ceil(pngTasks.length / 2);
  const leftGroups = useMemo(
    () => groupByDate(pngTasks.slice(0, half)),
    [pngTasks, half],
  );
  const rightGroups = useMemo(
    () => groupByDate(pngTasks.slice(half)),
    [pngTasks, half],
  );

  const shownRows = pngTasks.length;
  const compact = shownRows > 12 || pngGroups.length > 6;
  const overflow = monthTasks.length - shownRows;

  const printGroups = useMemo(() => groupByDate(monthTasks), [monthTasks]);

  const monthTitle = formatThaiMonth(month);

  function goMonth(delta: number) {
    setMonth((value) => addMonthsToKey(value, delta));
  }

  async function exportPng() {
    const node = reportRef.current;
    if (!node || busy) return;
    setBusy(true);
    try {
      const blob = await toBlob(node, {
        width: REPORT_W,
        height: REPORT_H,
        pixelRatio: 2,
        cacheBust: true,
        style: { transform: "none" },
      });
      if (!blob) throw new Error("empty canvas");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `work-${month}.png`;
      link.href = url;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
      toast.success("ดาวน์โหลด PNG แล้ว", {
        description: `${REPORT_W * 2} × ${REPORT_H * 2} px · 4:5`,
      });
    } catch {
      toast.error("สร้าง PNG ไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  function exportPdf() {
    const previous = document.title;
    document.title = `work-${month}`;
    const restore = () => {
      document.title = previous;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
    window.setTimeout(restore, 4000);
  }

  return (
    <main className="min-h-screen bg-background px-4 py-5 print:min-h-0 print:bg-white print:p-0">
      <div className="mx-auto w-full max-w-[720px] print:max-w-none">
        <div className="flex items-center justify-between gap-3 print:hidden">
          <Link
            href="/settings"
            className="inline-flex h-11 items-center gap-1.5 rounded-full pr-3 pl-1 text-[15px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
            ตั้งค่า
          </Link>
          <span className="text-[13px] font-medium text-muted-foreground">
            ส่งออกงาน
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 print:hidden">
          <button
            type="button"
            onClick={() => goMonth(-1)}
            aria-label="เดือนก่อนหน้า"
            className="flex size-11 items-center justify-center rounded-full bg-fill text-foreground transition-colors hover:bg-fill-strong"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>

          <div className="text-center">
            <h1 className="text-[24px] leading-tight font-bold">{monthTitle}</h1>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {monthTasks.length} งาน ·{" "}
              {month === currentMonth ? "เดือนนี้" : "ย้อนหลัง"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => goMonth(1)}
            aria-label="เดือนถัดไป"
            className="flex size-11 items-center justify-center rounded-full bg-fill text-foreground transition-colors hover:bg-fill-strong"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 print:hidden">
          <Button
            type="button"
            onClick={exportPng}
            disabled={busy || monthTasks.length === 0}
            className="h-11 flex-1 rounded-full px-4 text-[14px]"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="size-4" aria-hidden="true" />
            )}
            PNG · 4:5
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={exportPdf}
            disabled={monthTasks.length === 0}
            className="h-11 flex-1 rounded-full px-4 text-[14px]"
          >
            <FileText className="size-4" aria-hidden="true" />
            PDF · A4
          </Button>
        </div>

        <p className="mt-2 text-center text-[12px] leading-relaxed text-muted-foreground print:hidden">
          PNG จะแสดงงานที่ยังไม่เสร็จก่อน · PDF มีงานครบทุกวันของเดือน
        </p>

        <div className="mt-5 print:hidden">
          <div
            ref={frameRef}
            className="relative mx-auto aspect-[4/5] w-full max-w-[560px] overflow-hidden rounded-[26px] bg-background ring-1 ring-border/60"
          >
            <div
              className="origin-top-left"
              style={{ transform: `scale(${scale})` }}
            >
              <div
                ref={reportRef}
                className="flex h-[1350px] w-[1080px] flex-col overflow-hidden bg-background p-12 text-foreground"
              >
                <div className="relative overflow-hidden rounded-[32px] bg-primary px-12 py-9 text-primary-foreground">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-24 -right-16 size-[300px] rounded-full bg-white/10"
                  />
                  <div className="relative flex items-start justify-between gap-8">
                    <div className="min-w-0">
                      <p className="text-[21px] font-medium opacity-80">
                        สรุปงานรายเดือน
                      </p>
                      <h2 className="mt-1.5 text-[60px] leading-none font-bold">
                        {monthTitle}
                      </h2>
                      <p className="mt-3 text-[21px] opacity-80">
                        งานของฉัน · School Tasks
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="tabular text-[76px] leading-none font-bold">
                        {monthTasks.length}
                      </p>
                      <p className="mt-1 text-[19px] opacity-80">งานในเดือนนี้</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-4">
                  <Stat label="เสร็จแล้ว" value={doneTasks.length} tone="success" />
                  <Stat label="คงเหลือ" value={openTasks.length} tone="primary" />
                  <Stat label="เกินกำหนด" value={overdue} tone="destructive" />
                </div>

                <div className="mt-6 flex min-h-0 flex-1 flex-col">
                  {pngGroups.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center rounded-[24px] bg-card ring-1 ring-border/50">
                      <p className="text-[22px] text-muted-foreground">
                        ไม่มีงานในเดือนนี้
                      </p>
                    </div>
                  ) : (
                    <div className="grid min-h-0 flex-1 grid-cols-2 gap-x-10 overflow-hidden">
                      <div>
                        {leftGroups.map((group) => (
                          <ExportGroup
                            key={group.date}
                            group={group}
                            compact={compact}
                          />
                        ))}
                      </div>
                      <div>
                        {rightGroups.map((group) => (
                          <ExportGroup
                            key={group.date}
                            group={group}
                            compact={compact}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {overflow > 0 ? (
                    <p className="pt-1 text-[17px] text-muted-foreground">
                      และอีก {overflow} รายการ · ดูทั้งหมดในไฟล์ PDF
                    </p>
                  ) : null}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-[17px] text-muted-foreground">
                  <span>งานของฉัน · สรุปงานรายเดือน</span>
                  <span>สร้างเมื่อ {formatThaiDate(today, true)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* A4 print document — hidden on screen, full list in print. */}
        <div className="hidden print:block">
          <div className="border-b-2 border-neutral-800 pb-4">
            <p className="text-[10px] font-semibold tracking-[0.18em] text-neutral-500 uppercase">
              งานของฉัน · School Tasks
            </p>
            <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
              <h1 className="text-[26px] leading-tight font-bold text-black">
                สรุปงาน · {monthTitle}
              </h1>
              <p className="text-[11px] text-neutral-500">
                สร้างเมื่อ {formatThaiDate(today, true)}
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[12px] text-neutral-700">
            <span>
              ทั้งหมด <b className="text-black">{monthTasks.length}</b> งาน
            </span>
            <span>
              เสร็จแล้ว <b className="text-black">{doneTasks.length}</b>
            </span>
            <span>
              คงเหลือ <b className="text-black">{openTasks.length}</b>
            </span>
            <span>
              เกินกำหนด <b className="text-black">{overdue}</b>
            </span>
          </div>

          {printGroups.length === 0 ? (
            <p className="mt-8 text-[13px] text-neutral-500">
              ไม่มีงานในเดือนนี้
            </p>
          ) : (
            printGroups.map((group) => (
              <section key={group.date} className="mt-5">
                <h2 className="flex items-baseline justify-between border-b border-neutral-300 pb-1 text-[13px] font-semibold text-black">
                  <span>{formatThaiDateWithDay(group.date)}</span>
                  <span className="tabular text-[11px] font-normal text-neutral-500">
                    {group.tasks.length}
                  </span>
                </h2>
                <ul>
                  {group.tasks.map((task) => {
                    const done = isDone(task);
                    return (
                      <li
                        key={task.id}
                        className="flex break-inside-avoid items-start gap-2 border-b border-neutral-200 py-1.5 text-[12px]"
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            "mt-[3px] inline-flex size-3 shrink-0 items-center justify-center rounded-[3px] border text-[9px] leading-none font-bold",
                            done
                              ? "border-neutral-800 text-black"
                              : "border-neutral-400 text-transparent",
                          )}
                        >
                          ✓
                        </span>
                        <span
                          className={cn(
                            "min-w-0 flex-1 text-black",
                            done && "text-neutral-500 line-through",
                          )}
                        >
                          {task.title}
                        </span>
                        {task.subjectCode ? (
                          <span className="shrink-0 text-[11px] text-neutral-500">
                            {task.subjectCode}
                          </span>
                        ) : null}
                        {task.priority === "high" && !done ? (
                          <span className="shrink-0 text-[11px] font-semibold text-black">
                            ด่วน
                          </span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </div>
      </div>

      <span className="sr-only" aria-live="polite">
        {busy ? "กำลังสร้าง PNG" : ""}
      </span>
    </main>
  );
}
