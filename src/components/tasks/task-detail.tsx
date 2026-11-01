"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Loader2,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/forms/date-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/segmented";
import { Textarea } from "@/components/ui/textarea";
import type { Task } from "@/lib/db/schema";
import {
  addDaysISO,
  formatThaiDateLong,
} from "@/lib/time";
import type { Priority } from "@/lib/validation";
import { cn } from "@/lib/utils";

type SubjectOption = { code: string; name: string };

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "low", label: "ต่ำ" },
  { value: "normal", label: "ปกติ" },
  { value: "high", label: "สูง" },
];

const selectClass =
  "h-12 w-full appearance-none rounded-[12px] border-0 bg-fill px-4 pr-10 text-[17px] text-foreground outline-none transition-[background-color,box-shadow] focus-visible:ring-2 focus-visible:ring-ring/40";

const blockClass = "px-4 py-3.5";

export function TaskDetail({
  task,
  subjects,
  today,
}: {
  task: Task;
  subjects: SubjectOption[];
  today: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(task.title);
  const [subjectCode, setSubjectCode] = useState(task.subjectCode ?? "");
  const [dueDate, setDueDate] = useState(task.dueDate);
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [notes, setNotes] = useState(task.notes);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      setError("ต้องมีชื่องาน");
      return;
    }

    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          subjectCode: subjectCode || null,
          dueDate,
          priority,
          notes,
        }),
      });
      if (!response.ok) throw new Error("save failed");
      toast.success("บันทึกแล้ว");
      router.refresh();
    } catch {
      setError("บันทึกไม่สำเร็จ · ลองอีกครั้ง");
    } finally {
      setPending(false);
    }
  }

  async function complete() {
    setPending(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: true }),
      });
      if (!response.ok) throw new Error("failed");
      toast.success("เสร็จแล้ว");
      router.push("/tasks");
      router.refresh();
    } catch {
      toast.error("บันทึกไม่สำเร็จ");
      setPending(false);
    }
  }

  async function remove() {
    setPending(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("failed");
      toast("ลบแล้ว");
      router.push("/tasks");
      router.refresh();
    } catch {
      toast.error("ลบไม่สำเร็จ");
      setPending(false);
    }
  }

  const done = task.doneAt !== null;

  return (
    <div className="mx-auto w-full max-w-[640px]">
      <Link
        href="/tasks"
        className="-ml-2 inline-flex h-11 items-center gap-0.5 rounded-full pr-3 pl-1 text-[15px] font-medium text-primary-text"
      >
        <ArrowLeft className="size-[18px]" aria-hidden="true" />
        งาน
      </Link>

      <PageHeader
        title="รายละเอียดงาน"
        subtitle={
          done ? "ทำเสร็จแล้ว" : `กำหนดส่ง ${formatThaiDateLong(dueDate)}`
        }
        className="mt-1"
        action={
          <Button
            type="submit"
            form="task-detail-form"
            disabled={pending}
            className="h-11 rounded-full px-4 lg:hidden"
          >
            {pending ? "กำลังบันทึก…" : "บันทึก"}
          </Button>
        }
      />

      <form id="task-detail-form" onSubmit={save}>
        <div className="group-card divide-y divide-border/70">
          <div className={blockClass}>
            <Label htmlFor="detail-title">ชื่องาน</Label>
            <Input
              id="detail-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              className="mt-1.5 font-medium"
              aria-invalid={error === "ต้องมีชื่องาน" || undefined}
            />
            {error === "ต้องมีชื่องาน" ? (
              <p className="mt-1.5 text-[13px] text-destructive">{error}</p>
            ) : null}
          </div>

          <div className={blockClass}>
            <Label htmlFor="detail-subject">วิชา</Label>
            <div className="relative mt-1.5">
              <select
                id="detail-subject"
                value={subjectCode}
                onChange={(event) => setSubjectCode(event.target.value)}
                className={selectClass}
              >
                <option value="">ไม่ระบุวิชา</option>
                {subjects.map((subject) => (
                  <option key={subject.code} value={subject.code}>
                    {subject.code} · {subject.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
            </div>
          </div>

          <div className={blockClass}>
            <Label htmlFor="detail-date">กำหนดส่ง</Label>
            <div className="mt-1.5">
              <DateField id="detail-date" value={dueDate} onChange={setDueDate} />
            </div>
            <div className="flex flex-wrap gap-1.5 pt-2">
              {[
                { label: "วันนี้", value: today },
                { label: "พรุ่งนี้", value: addDaysISO(today, 1) },
                { label: "สัปดาห์หน้า", value: addDaysISO(today, 7) },
              ].map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => setDueDate(chip.value)}
                  aria-pressed={dueDate === chip.value}
                  className={
                    dueDate === chip.value
                      ? "h-11 rounded-full bg-primary px-4 text-[13px] font-semibold text-primary-foreground"
                      : "h-11 rounded-full bg-fill px-4 text-[13px] font-medium text-foreground transition-colors hover:bg-fill-strong"
                  }
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          <div className={blockClass}>
            <Label>ความสำคัญ</Label>
            <div className="mt-1.5">
              <Segmented
                value={priority}
                onChange={setPriority}
                options={PRIORITIES}
                label="ความสำคัญ"
              />
            </div>
          </div>

          <div className={blockClass}>
            <Label htmlFor="detail-notes">โน้ต</Label>
            <Textarea
              id="detail-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              maxLength={2000}
              className="mt-1.5"
            />
          </div>
        </div>

        {error && error !== "ต้องมีชื่องาน" ? (
          <p role="alert" className="mt-3 text-[13px] text-destructive">
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={pending}
          className="mt-4 hidden h-12 w-full rounded-[12px] text-[16px] lg:flex"
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              กำลังบันทึก…
            </>
          ) : (
            "บันทึกการแก้ไข"
          )}
        </Button>
      </form>

      <div className="group-card mt-4">
        <button
          type="button"
          onClick={complete}
          disabled={pending || done}
          className={cn(
            "flex min-h-[52px] w-full items-center justify-center gap-2 px-4 py-2.5 text-[15px] font-medium after:pointer-events-none after:absolute after:right-0 after:bottom-0 after:left-4 after:h-px after:bg-border/70 last:after:hidden",
            done ? "text-muted-foreground" : "text-primary-text",
          )}
          style={{ position: "relative" }}
        >
          <Check className="size-[18px]" aria-hidden="true" />
          {done ? "ทำเสร็จแล้ว" : "ทำเครื่องหมายว่าเสร็จ"}
        </button>

        <button
          type="button"
          onClick={() => (confirmDelete ? remove() : setConfirmDelete(true))}
          disabled={pending}
          className="flex min-h-[52px] w-full items-center justify-center gap-2 px-4 py-2.5 text-[15px] font-medium text-destructive disabled:opacity-40"
        >
          <Trash2 className="size-[18px]" aria-hidden="true" />
          {confirmDelete ? "ยืนยันลบงานนี้" : "ลบงาน"}
        </button>
      </div>
    </div>
  );
}
