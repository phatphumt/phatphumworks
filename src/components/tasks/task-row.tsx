"use client";

import { Check, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/db/schema";
import { subjectAccent } from "@/lib/subjects";
import type { SubjectOption } from "./task-sheet";

type Props = {
  task: Task;
  subjectName?: string;
  overdue?: boolean;
  onToggle: (task: Task) => void;
  onOpen: (task: Task) => void;
  onDelete?: (task: Task) => void;
};

export function TaskRow({
  task,
  subjectName,
  overdue = false,
  onToggle,
  onOpen,
  onDelete,
}: Props) {
  const done = task.doneAt !== null;
  const high = task.priority === "high" && !done;

  return (
    <li className="group relative flex min-h-[64px] items-start gap-2 py-2.5 pr-1 pl-3 after:pointer-events-none after:absolute after:right-0 after:bottom-0 after:left-[52px] after:h-px after:bg-border/70 last:after:hidden">
      {/* 44px target; the visible circle stays 22px so rows keep their rhythm. */}
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={
          done
            ? `ทำเครื่องหมายว่ายังไม่เสร็จ: ${task.title}`
            : `ทำเสร็จ: ${task.title}`
        }
        onClick={() => onToggle(task)}
        className="-my-1.5 flex size-11 shrink-0 items-center justify-center rounded-full"
      >
        <span
          aria-hidden="true"
          className={cn(
            "flex size-[22px] items-center justify-center rounded-full border-[1.5px] transition-colors",
            done
              ? "border-primary bg-primary text-primary-foreground"
              : overdue
                ? "border-destructive bg-card group-hover:border-destructive/70"
                : "border-control bg-card group-hover:border-primary",
          )}
        >
          {done ? <Check className="size-3.5" strokeWidth={3} /> : null}
        </span>
      </button>

      <button
        type="button"
        onClick={() => onOpen(task)}
        className="min-w-0 flex-1 rounded-[8px] pt-0.5 text-left"
      >
        <span
          className={cn(
            "line-clamp-2 block text-[16px] leading-[22px]",
            done ? "text-muted-foreground line-through" : "font-medium",
          )}
        >
          {task.title}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] leading-tight text-muted-foreground">
          {task.subjectCode ? (
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                aria-hidden="true"
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: subjectAccent(task.subjectCode) }}
              />
              <span className="truncate">{subjectName ?? task.subjectCode}</span>
            </span>
          ) : (
            <span>ไม่ระบุวิชา</span>
          )}
          {high ? (
            <span className="font-medium text-warning">สำคัญสูง</span>
          ) : null}
          {done ? <span className="text-muted-foreground">เสร็จแล้ว</span> : null}
        </span>
      </button>

      <button
        type="button"
        aria-label={`ลบงาน: ${task.title}`}
        onClick={() => onDelete?.(task)}
        className={cn(
          "mt-0.5 hidden size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-opacity hover:bg-destructive/10 hover:text-destructive lg:flex lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100",
          !onDelete && "lg:hidden",
        )}
      >
        <Trash2 className="size-4" strokeWidth={1.8} aria-hidden="true" />
      </button>
    </li>
  );
}

export type { SubjectOption };
