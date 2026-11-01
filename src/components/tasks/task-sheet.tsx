"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/forms/date-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Task } from "@/lib/db/schema";
import { addDaysISO } from "@/lib/time";
import type { Priority } from "@/lib/validation";

export type SubjectOption = { code: string; name: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  subjects: SubjectOption[];
  today: string;
  defaultDueDate?: string;
  onSaved: (task: Task) => void;
  onDeleted: (id: string) => void;
};

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "low", label: "ต่ำ" },
  { value: "normal", label: "ปกติ" },
  { value: "high", label: "สูง" },
];

const selectClass =
  "h-12 w-full appearance-none rounded-[12px] border-0 bg-fill px-4 pr-10 text-[17px] text-foreground outline-none transition-[background-color,box-shadow] focus-visible:ring-2 focus-visible:ring-ring/40";

export function TaskSheet({
  open,
  onOpenChange,
  task,
  subjects,
  today,
  defaultDueDate,
  onSaved,
  onDeleted,
}: Props) {
  const [title, setTitle] = useState("");
  const [subjectCode, setSubjectCode] = useState<string>("");
  const [dueDate, setDueDate] = useState(today);
  const [priority, setPriority] = useState<Priority>("normal");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    // Reset the editable form from the selected task whenever the sheet opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTitle(task?.title ?? "");
    setSubjectCode(task?.subjectCode ?? "");
    setDueDate(task?.dueDate ?? defaultDueDate ?? today);
    setPriority(task?.priority ?? "normal");
    setNotes(task?.notes ?? "");
    setError(null);
    setPending(false);
    setConfirmDelete(false);
  }, [open, task, today, defaultDueDate]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError("ต้องมีชื่องาน");
      return;
    }

    setPending(true);
    setError(null);

    const payload = {
      title: trimmed,
      subjectCode: subjectCode || null,
      dueDate,
      priority,
      notes,
    };

    try {
      const response = await fetch(
        task ? `/api/tasks/${task.id}` : "/api/tasks",
        {
          method: task ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) throw new Error("request failed");

      const data = (await response.json()) as {
        task?: Task;
      };

      const saved: Task =
        data.task ??
        ({
          ...task!,
          ...payload,
          subjectCode: payload.subjectCode,
          priority: payload.priority,
        } as Task);

      onSaved({
        ...saved,
        createdAt: saved.createdAt ? new Date(saved.createdAt) : new Date(),
        doneAt: saved.doneAt ? new Date(saved.doneAt) : null,
      });
      onOpenChange(false);
    } catch {
      setError("บันทึกไม่สำเร็จ · ลองอีกครั้ง");
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!task) return;
    setPending(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("delete failed");
      onDeleted(task.id);
      onOpenChange(false);
    } catch {
      setError("ลบไม่สำเร็จ · ลองอีกครั้ง");
    } finally {
      setPending(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto w-full gap-0 overflow-y-auto sm:max-w-lg"
      >
        <SheetHeader className="pr-14">
          <SheetTitle>{task ? "แก้ไขงาน" : "เพิ่มงาน"}</SheetTitle>
          <SheetDescription className="sr-only">
            กรอกชื่องาน วิชา กำหนดส่ง และความสำคัญ
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={submit} className="flex flex-col gap-4 px-5 pb-2">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">ชื่องาน</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="เช่น การบ้านบทที่ 4"
              aria-invalid={error === "ต้องมีชื่องาน" || undefined}
              aria-describedby={error ? "task-title-error" : undefined}
              maxLength={120}
            />
            {error === "ต้องมีชื่องาน" ? (
              <p id="task-title-error" className="text-[13px] text-destructive">
                {error}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-subject">วิชา</Label>
            <div className="relative">
              <select
                id="task-subject"
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

          <div className="space-y-1.5">
            <Label htmlFor="task-date">กำหนดส่ง</Label>
            <DateField id="task-date" value={dueDate} onChange={setDueDate} />
            <div className="flex flex-wrap gap-1.5 pt-1">
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

          <div className="space-y-1.5">
            <Label>ความสำคัญ</Label>
            <Segmented
              value={priority}
              onChange={setPriority}
              options={PRIORITIES}
              label="ความสำคัญ"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-notes">โน้ต</Label>
            <Textarea
              id="task-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)"
              maxLength={2000}
            />
          </div>

          {error && error !== "ต้องมีชื่องาน" ? (
            <p role="alert" className="text-[13px] text-destructive">
              {error}
            </p>
          ) : null}

          <SheetFooter className="-mx-5 flex-row items-center gap-2 px-5 pt-3">
            {task ? (
              <Button
                type="button"
                variant={confirmDelete ? "destructive" : "ghost"}
                onClick={() =>
                  confirmDelete ? remove() : setConfirmDelete(true)
                }
                disabled={pending}
                className={confirmDelete ? "h-11" : "h-11 text-destructive"}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                {confirmDelete ? "ยืนยันลบ" : "ลบ"}
              </Button>
            ) : null}
            <Button
              type="submit"
              disabled={pending}
              className="ml-auto h-11 min-w-28"
            >
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  กำลังบันทึก…
                </>
              ) : (
                "บันทึก"
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
