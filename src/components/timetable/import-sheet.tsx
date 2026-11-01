"use client";

import { useMemo, useState } from "react";
import { FileJson, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Lesson } from "@/lib/db/schema";
import { scheduleSchema, type LessonInput, type PeriodTimes } from "@/lib/validation";
import { dayName } from "@/lib/time";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  current: Lesson[];
  onImported: (count: number) => void;
};

type Diff = {
  added: LessonInput[];
  removed: Lesson[];
  changed: { from: Lesson; to: LessonInput }[];
};

function diffLessons(current: Lesson[], incoming: LessonInput[]): Diff {
  const key = (lesson: { dayOfWeek: number; period: number }) =>
    `${lesson.dayOfWeek}:${lesson.period}`;

  const before = new Map(current.map((lesson) => [key(lesson), lesson]));
  const after = new Map(incoming.map((lesson) => [key(lesson), lesson]));

  const added = incoming.filter((lesson) => !before.has(key(lesson)));
  const removed = current.filter((lesson) => !after.has(key(lesson)));
  const changed: Diff["changed"] = [];

  for (const lesson of incoming) {
    const previous = before.get(key(lesson));
    if (
      previous &&
      (previous.subjectCode !== lesson.subjectCode ||
        previous.subjectName !== lesson.subjectName)
    ) {
      changed.push({ from: previous, to: lesson });
    }
  }

  return { added, removed, changed };
}

export function ImportSheet({ open, onOpenChange, current, onImported }: Props) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [parsed, setParsed] = useState<LessonInput[] | null>(null);
  const [parsedPeriodTimes, setParsedPeriodTimes] = useState<PeriodTimes | null>(
    null,
  );

  const diff = useMemo(
    () => (parsed ? diffLessons(current, parsed) : null),
    [parsed, current],
  );

  function reset() {
    setText("");
    setParsed(null);
    setParsedPeriodTimes(null);
    setError(null);
    setPending(false);
  }

  function parse(value: string) {
    setText(value);
    setParsed(null);
    setParsedPeriodTimes(null);
    setError(null);
    if (!value.trim()) return;

    let json: unknown;
    try {
      json = JSON.parse(value);
    } catch {
      setError("JSON ไม่ถูกต้อง · ตรวจเครื่องหมายคำพูดและวงเล็บ");
      return;
    }

    const normalized = Array.isArray(json) ? { lessons: json } : json;
    const result = scheduleSchema.safeParse(normalized);

    if (!result.success) {
      const issue = result.error.issues[0];
      setError(
        `รูปแบบไม่ถูกต้อง · ${issue?.path.join(".") ?? ""} ${issue?.message ?? ""}`,
      );
      return;
    }

    const lessons = result.data.lessons ?? [];
    const hasL = Array.isArray(result.data.lessons);
    const seen = new Set<string>();
    if (hasL) {
      for (const lesson of lessons) {
        const key = `${lesson.dayOfWeek}:${lesson.period}`;
        if (seen.has(key)) {
          setError(
            `มีวิชาซ้ำในช่อง วัน ${dayName(lesson.dayOfWeek)} คาบ ${lesson.period}`,
          );
          return;
        }
        seen.add(key);
      }
    }

    const times = result.data.periodTimes;
    if (times) {
      const periodsToCheck = lessons.map((lesson) => lesson.period);
      const incomplete = periodsToCheck.find((period) => {
        const slot = times[String(period)];
        return !slot || !slot.start || !slot.end;
      });
      if (incomplete) {
        setError(`periodTimes คาบ ${incomplete} ต้องมีทั้ง start และ end`);
        return;
      }
    }

    if (!hasL && !times) {
      setError("ต้องมี lessons หรือ periodTimes");
      return;
    }

    setParsed(hasL ? lessons : null);
    setParsedPeriodTimes(times ?? null);
  }

  async function confirm() {
    if (!parsed && !parsedPeriodTimes) return;
    setPending(true);
    setError(null);

    try {
      const payload: {
        lessons?: LessonInput[];
        periodTimes?: PeriodTimes;
      } = {};
      if (parsed) payload.lessons = parsed;
      if (parsedPeriodTimes) payload.periodTimes = parsedPeriodTimes;
      const response = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "import failed");
      }
      onImported(parsed?.length ?? 0);
      onOpenChange(false);
      reset();
    } catch (caught) {
      setError(
        caught instanceof Error && caught.message !== "import failed"
          ? caught.message
          : "นำเข้าไม่สำเร็จ · ลองอีกครั้ง",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <SheetContent
        side="bottom"
        className="mx-auto w-full gap-0 overflow-y-auto sm:max-w-lg"
      >
        <SheetHeader className="pr-14">
          <SheetTitle>นำเข้าตารางเรียน</SheetTitle>
          <SheetDescription>
            วาง JSON หรือเลือกไฟล์ · ระบบจะแสดงสิ่งที่เปลี่ยนก่อนบันทึก
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-5 pb-2">
          <div className="space-y-1.5">
            <Label htmlFor="import-json">JSON</Label>
            <Textarea
              id="import-json"
              value={text}
              onChange={(event) => parse(event.target.value)}
              rows={8}
              spellCheck={false}
              placeholder={'{\n  "lessons": [\n    { "dayOfWeek": 1, "period": 1,\n      "subjectCode": "ค32101",\n      "subjectName": "คณิตศาสตร์เพิ่มเติม" }\n  ]\n}'}
              className="font-mono text-[13px]"
            />
          </div>

          <label className="inline-flex h-11 cursor-pointer items-center gap-2 self-start rounded-full bg-fill px-4 text-[13px] font-medium text-foreground transition-colors hover:bg-fill-strong">
            <FileJson className="size-4" aria-hidden="true" />
            เลือกไฟล์ .json
            <input
              type="file"
              accept=".json,application/json"
              className="sr-only"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                parse(await file.text());
                event.target.value = "";
              }}
            />
          </label>

          {error ? (
            <p role="alert" className="text-[13px] text-destructive">
              {error}
            </p>
          ) : null}

          {diff || parsedPeriodTimes ? (
            <div className="rounded-[12px] bg-muted/60 p-3 text-[13px]">
              {diff ? (
                <>
                  <p className="font-medium">
                    จะเปลี่ยนแปลง{" "}
                    <span className="tabular">
                      เพิ่ม {diff.added.length} · ลบ {diff.removed.length} · แก้{" "}
                      {diff.changed.length}
                    </span>
                  </p>
                  {diff.added.length + diff.removed.length + diff.changed.length ===
                  0 ? (
                    <p className="mt-1.5 text-muted-foreground">
                      ไม่มีการเปลี่ยนแปลงจากตารางเดิม
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1">
                      {diff.added.slice(0, 3).map((lesson) => (
                        <li
                          key={`a-${lesson.dayOfWeek}-${lesson.period}`}
                          className="text-primary-text"
                        >
                          + {dayName(lesson.dayOfWeek)} คาบ {lesson.period}{" "}
                          {lesson.subjectCode} {lesson.subjectName}
                        </li>
                      ))}
                      {diff.removed.slice(0, 3).map((lesson) => (
                        <li
                          key={`r-${lesson.dayOfWeek}-${lesson.period}`}
                          className="text-destructive"
                        >
                          − {dayName(lesson.dayOfWeek)} คาบ {lesson.period}{" "}
                          {lesson.subjectCode} {lesson.subjectName}
                        </li>
                      ))}
                      {diff.changed.slice(0, 3).map(({ from, to }) => (
                        <li key={`c-${from.dayOfWeek}-${from.period}`}>
                          ~ {dayName(from.dayOfWeek)} คาบ {from.period}{" "}
                          {from.subjectCode} → {to.subjectCode}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : null}
              {parsedPeriodTimes ? (
                <p className="mt-1.5 text-muted-foreground">
                  เวลาคาบจะถูกแทนที่ด้วยค่าจากไฟล์ (
                  {Object.keys(parsedPeriodTimes).length} คาบ)
                </p>
              ) : null}
            </div>
          ) : null}

          <SheetFooter className="-mx-5 flex-row justify-end gap-2 px-5">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-11"
            >
              ยกเลิก
            </Button>
            <Button
              type="button"
              onClick={confirm}
              disabled={(!parsed && !parsedPeriodTimes) || pending}
              className="h-11 min-w-28"
            >
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  กำลังนำเข้า…
                </>
              ) : (
                "ยืนยัน"
              )}
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
