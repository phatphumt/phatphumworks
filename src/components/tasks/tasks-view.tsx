"use client";

import { useMemo, useState } from "react";
import {
  ArrowUp,
  ChevronRight,
  ListChecks,
  Loader2,
  Plus,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/db/schema";
import { relativeDateLabel } from "@/lib/time";
import {
  buildGroups,
  filterCounts,
  FILTERS,
  recentlyDone,
  type TaskFilter,
} from "@/lib/group-tasks";
import { TaskRow } from "./task-row";
import { TaskSheet, type SubjectOption } from "./task-sheet";

type Props = {
  initialTasks: Task[];
  subjects: SubjectOption[];
  today: string;
  digestTime: string;
  initialFilter?: TaskFilter;
};

type TaskPayload = {
  title: string;
  subjectCode: string | null;
  dueDate: string;
  priority: Task["priority"];
  notes: string;
};

async function createTask(payload: TaskPayload): Promise<Task> {
  const response = await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("create failed");
  const data = (await response.json()) as { task: Task };
  return {
    ...data.task,
    createdAt: new Date(data.task.createdAt),
    doneAt: data.task.doneAt ? new Date(data.task.doneAt) : null,
  };
}

const CHIPS = FILTERS.filter((option) => option.value !== "done");

export function TasksView({
  initialTasks,
  subjects,
  today,
  digestTime,
  initialFilter = "all",
}: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [filter, setFilter] = useState<TaskFilter>(initialFilter);
  const [subjectCode, setSubjectCode] = useState("");
  const [quick, setQuick] = useState("");
  const [pendingQuick, setPendingQuick] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [showDone, setShowDone] = useState(initialFilter === "done");

  const subjectsByName = useMemo(
    () => new Map(subjects.map((subject) => [subject.code, subject.name])),
    [subjects],
  );

  const groups = useMemo(
    () => buildGroups(tasks, today, filter, subjectCode || null),
    [tasks, today, filter, subjectCode],
  );

  const doneTasks = useMemo(() => {
    const done = recentlyDone(tasks, today);
    return subjectCode
      ? done.filter((task) => task.subjectCode === subjectCode)
      : done;
  }, [tasks, today, subjectCode]);

  const counts = useMemo(() => filterCounts(tasks, today), [tasks, today]);
  const openCount = counts.all;

  const todayEmpty =
    filter === "all" && counts.today === 0 && tasks.length > 0;

  const nextTask = useMemo(
    () =>
      tasks
        .filter((task) => task.doneAt === null && task.dueDate > today)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0] ?? null,
    [tasks, today],
  );

  function replaceTask(updated: Task) {
    setTasks((previous) =>
      previous.map((task) => (task.id === updated.id ? updated : task)),
    );
  }

  function addTask(created: Task) {
    setTasks((previous) => [...previous, created]);
  }

  function removeTaskLocal(id: string) {
    setTasks((previous) => previous.filter((task) => task.id !== id));
  }

  async function quickAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = quick.trim();
    if (!title || pendingQuick) return;

    setPendingQuick(true);
    try {
      const created = await createTask({
        title,
        subjectCode: subjectCode || null,
        dueDate: today,
        priority: "normal",
        notes: "",
      });
      addTask(created);
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

  async function toggle(task: Task) {
    const nextDone = task.doneAt === null;
    const optimistic = {
      ...task,
      doneAt: nextDone ? new Date() : null,
    };
    replaceTask(optimistic);

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: nextDone }),
      });
      if (!response.ok) throw new Error("toggle failed");

      if (nextDone) {
        toast.success("เสร็จแล้ว", {
          action: { label: "เลิกทำ", onClick: () => void toggle(optimistic) },
        });
      }
    } catch {
      replaceTask(task);
      toast.error("บันทึกไม่สำเร็จ");
    }
  }

  async function remove(task: Task) {
    removeTaskLocal(task.id);

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("delete failed");

      toast("ลบแล้ว", {
        action: {
          label: "เลิกทำ",
          onClick: async () => {
            try {
              const restored = await createTask({
                title: task.title,
                subjectCode: task.subjectCode,
                dueDate: task.dueDate,
                priority: task.priority,
                notes: task.notes,
              });
              addTask(restored);
            } catch {
              toast.error("กู้คืนไม่สำเร็จ");
            }
          },
        },
      });
    } catch {
      addTask(task);
      toast.error("ลบไม่สำเร็จ");
    }
  }

  function openCreate() {
    setEditing(null);
    setSheetOpen(true);
  }

  function openEdit(task: Task) {
    setEditing(task);
    setSheetOpen(true);
  }

  return (
    <div className="mx-auto w-full max-w-[720px]">
      <PageHeader
        title="งาน"
        subtitle={
          openCount > 0 ? `${openCount} งานที่ยังไม่เสร็จ` : "ไม่มีงานค้าง"
        }
        action={
          <div className="flex items-center gap-2">
            <div className="relative h-11 rounded-full focus-within:ring-2 focus-within:ring-ring/40">
              <span
                aria-hidden="true"
                className={cn(
                  "pointer-events-none flex h-11 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors",
                  subjectCode
                    ? "bg-primary text-primary-foreground"
                    : "bg-fill text-foreground",
                )}
              >
                <SlidersHorizontal className="size-4" strokeWidth={1.9} />
                {subjectCode || "ทุกวิชา"}
              </span>
              <select
                value={subjectCode}
                onChange={(event) => setSubjectCode(event.target.value)}
                aria-label="กรองตามวิชา"
                className="absolute inset-0 size-full cursor-pointer appearance-none opacity-0"
              >
                <option value="">ทุกวิชา</option>
                {subjects.map((subject) => (
                  <option key={subject.code} value={subject.code}>
                    {subject.code} · {subject.name}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              size="icon"
              onClick={openCreate}
              aria-label="เพิ่มงานโดยระบุรายละเอียด"
              className="size-11 rounded-full shadow-[0_6px_16px_-6px_rgba(0,113,227,0.7)]"
            >
              <Plus className="size-5" strokeWidth={2.4} aria-hidden="true" />
            </Button>
          </div>
        }
      />

      <form onSubmit={quickAdd} className="relative">
        <Plus
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={quick}
          onChange={(event) => setQuick(event.target.value)}
          placeholder="เพิ่มงานวันนี้…"
          aria-label="ชื่องานใหม่"
          maxLength={120}
          enterKeyHint="done"
          className="h-12 pr-14 pl-12 text-[16px]"
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
              <ArrowUp className="size-4" strokeWidth={2.5} aria-hidden="true" />
            )}
          </span>
        </button>
      </form>
      <p className="mt-2 px-1 text-[12px] leading-relaxed text-muted-foreground">
        Enter เพื่อเพิ่มวันนี้ · ปุ่ม + สำหรับระบุวิชาและกำหนดส่ง
      </p>

      <div className="-mx-4 mt-4 flex items-center gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CHIPS.map((option) => {
          const active = filter === option.value;
          const count = counts[option.value];
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              aria-pressed={active}
              className={cn(
                "flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] whitespace-nowrap transition-colors",
                active
                  ? "bg-primary font-semibold text-primary-foreground"
                  : "bg-fill font-medium text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
              <span className="tabular text-[12px]">{count}</span>
            </button>
          );
        })}
      </div>

      {subjectCode ? (
        <p className="mt-2 flex items-center gap-1.5 px-1 text-[12px] text-muted-foreground">
          กรองเฉพาะ {subjectsByName.get(subjectCode) ?? subjectCode}
          <button
            type="button"
            onClick={() => setSubjectCode("")}
            className="font-medium text-primary-text"
          >
            ล้าง
          </button>
        </p>
      ) : null}

      {tasks.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="ยังไม่มีงาน"
          description="เพิ่มงานชิ้นแรก แล้วมันจะไปอยู่ในสรุป Discord คืนนี้"
        >
          <Button onClick={openCreate} className="h-11 rounded-full px-5">
            <Plus className="size-4" aria-hidden="true" />
            เพิ่มงาน
          </Button>
        </EmptyState>
      ) : null}

      {tasks.length > 0 && todayEmpty && nextTask ? (
        <p className="mt-4 rounded-[12px] bg-secondary px-4 py-2.5 text-[13px] leading-relaxed text-secondary-foreground">
          วันนี้ว่าง · ถัดไป: {nextTask.title} ·{" "}
          {relativeDateLabel(nextTask.dueDate, today)}
        </p>
      ) : null}

      {tasks.length > 0 && groups.length === 0 && filter !== "done" ? (
        <EmptyState
          icon={ListChecks}
          title="ไม่มีงานในตัวกรองนี้"
          description="ลองเปลี่ยนตัวกรองหรือล้างวิชาที่เลือกอยู่"
        >
          <Button
            variant="secondary"
            onClick={() => {
              setFilter("all");
              setSubjectCode("");
            }}
            className="h-11 rounded-full px-5"
          >
            ล้างตัวกรอง
          </Button>
        </EmptyState>
      ) : null}

      {filter === "done" && doneTasks.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="ยังไม่มีงานที่ทำเสร็จ"
          description="งานที่ทำเสร็จจะแสดงที่นี่ 7 วัน"
        />
      ) : null}

      {filter === "done" && doneTasks.length > 0 ? (
        <section className="mt-4">
          <h2 className="flex items-center justify-between px-4 py-2 text-[13px] font-semibold text-muted-foreground">
            <span>เสร็จแล้ว</span>
            <span className="tabular font-medium">{doneTasks.length}</span>
          </h2>
          <ul className="group-card">
            {doneTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                subjectName={
                  task.subjectCode
                    ? subjectsByName.get(task.subjectCode)
                    : undefined
                }
                onToggle={toggle}
                onOpen={openEdit}
                onDelete={remove}
              />
            ))}
          </ul>
        </section>
      ) : null}

      <div>
        {filter !== "done"
          ? groups.map((group) => (
              <section key={group.key} className="mt-4">
                <h2
                  className={cn(
                    "sticky top-11 z-20 -mx-4 flex items-center justify-between bg-background px-4 py-2 text-[13px] font-semibold lg:top-[52px]",
                    group.danger ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  <span>{group.label}</span>
                  <span className="tabular font-medium">{group.tasks.length}</span>
                </h2>
                <ul className="group-card">
                  {group.tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      subjectName={
                        task.subjectCode
                          ? subjectsByName.get(task.subjectCode)
                          : undefined
                      }
                      overdue={group.danger}
                      onToggle={toggle}
                      onOpen={openEdit}
                      onDelete={remove}
                    />
                  ))}
                </ul>
              </section>
            ))
          : null}
      </div>

      {filter !== "done" && doneTasks.length > 0 ? (
        <section className="mt-6">
          <button
            type="button"
            onClick={() => setShowDone((value) => !value)}
            aria-expanded={showDone}
            className="flex min-h-11 w-full items-center justify-between px-4 py-2 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <span className="flex items-center gap-1">
              <ChevronRight
                className={cn(
                  "size-4 transition-transform",
                  showDone && "rotate-90",
                )}
                aria-hidden="true"
              />
              เสร็จแล้ว
            </span>
            <span className="tabular font-medium">{doneTasks.length}</span>
          </button>

          {showDone ? (
            <ul className="group-card">
              {doneTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  subjectName={
                    task.subjectCode
                      ? subjectsByName.get(task.subjectCode)
                      : undefined
                  }
                  onToggle={toggle}
                  onOpen={openEdit}
                  onDelete={remove}
                />
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <TaskSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        task={editing}
        subjects={subjects}
        today={today}
        onSaved={(saved) => {
          const exists = tasks.some((task) => task.id === saved.id);
          if (exists) replaceTask(saved);
          else addTask(saved);
          toast.success(editing ? "บันทึกแล้ว" : "เพิ่มแล้ว", {
            description: `สรุปคืนนี้ ${digestTime}`,
          });
        }}
        onDeleted={(id) => {
          removeTaskLocal(id);
          toast("ลบแล้ว");
        }}
      />
    </div>
  );
}
