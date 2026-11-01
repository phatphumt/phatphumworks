"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Lesson } from "@/lib/db/schema";
import { dayName } from "@/lib/time";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayOfWeek: number;
  period: number;
  timeLabel: string;
  lesson: Lesson | null;
  onSaved: () => void;
  onDeleted: () => void;
};

export function SlotSheet({
  open,
  onOpenChange,
  dayOfWeek,
  period,
  timeLabel,
  lesson,
  onSaved,
  onDeleted,
}: Props) {
  const [subjectCode, setSubjectCode] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    // Reset the editable form from the selected slot whenever the sheet opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSubjectCode(lesson?.subjectCode ?? "");
    setSubjectName(lesson?.subjectName ?? "");
    setError(null);
    setPending(false);
    setConfirmDelete(false);
  }, [open, lesson]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!subjectCode.trim() || !subjectName.trim()) {
      setError("ต้องมีรหัสวิชาและชื่อวิชา");
      return;
    }

    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/slots", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dayOfWeek,
          period,
          subjectCode: subjectCode.trim(),
          subjectName: subjectName.trim(),
        }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "save failed");
      }
      onSaved();
      onOpenChange(false);
    } catch (caught) {
      setError(
        caught instanceof Error && caught.message !== "save failed"
          ? caught.message
          : "บันทึกไม่สำเร็จ · ลองอีกครั้ง",
      );
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    setPending(true);
    try {
      const response = await fetch(
        `/api/slots?dayOfWeek=${dayOfWeek}&period=${period}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error("delete failed");
      onDeleted();
      onOpenChange(false);
    } catch {
      setError("ลบไม่สำเร็จ · ลองอีกครั้ง");
    } finally {
      setPending(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto w-full gap-0 sm:max-w-md">
        <SheetHeader className="pr-14">
          <SheetTitle>
            {lesson ? "แก้ไขคาบเรียน" : "เพิ่มคาบเรียน"}
          </SheetTitle>
          <SheetDescription className="tabular">
            {dayName(dayOfWeek)} · คาบ {period} · {timeLabel}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={submit} className="flex flex-col gap-4 px-5 pb-2">
          <div className="space-y-1.5">
            <Label htmlFor="slot-code">รหัสวิชา</Label>
            <Input
              id="slot-code"
              value={subjectCode}
              onChange={(event) => setSubjectCode(event.target.value)}
              placeholder="ค32101"
              maxLength={20}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="slot-name">ชื่อวิชา</Label>
            <Input
              id="slot-name"
              value={subjectName}
              onChange={(event) => setSubjectName(event.target.value)}
              placeholder="คณิตศาสตร์เพิ่มเติม"
              maxLength={80}
            />
          </div>

          {error ? (
            <p role="alert" className="text-[13px] text-destructive">
              {error}
            </p>
          ) : null}

          <SheetFooter className="-mx-5 flex-row items-center gap-2 px-5">
            {lesson ? (
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
                {confirmDelete ? "ยืนยันลบ" : "ลบคาบนี้"}
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
