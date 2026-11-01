"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatThaiDateLong, todayISO } from "@/lib/time";

const MONTHS_FULL = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
] as const;

/** Monday-first column labels. */
const WEEKDAY_COLUMNS = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"] as const;

const pad = (n: number) => String(n).padStart(2, "0");

function parseISO(iso: string): { y: number; m: number; d: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) {
    const now = todayISO().split("-").map(Number);
    return { y: now[0], m: now[1], d: now[2] };
  }
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

/** Gregorian-only date field with an inline Thai calendar (never พ.ศ.). */
export function DateField({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: string;
  onChange: (iso: string) => void;
}) {
  const selected = parseISO(value);
  const today = todayISO();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState({ y: selected.y, m: selected.m });

  useEffect(() => {
    // The calendar month follows the form value when the parent changes it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setView({ y: selected.y, m: selected.m });
    // Only follow the value when it changes; month browsing stays local.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const cells = useMemo(() => {
    const firstIndex =
      (new Date(Date.UTC(view.y, view.m - 1, 1)).getUTCDay() + 6) % 7;
    const daysInMonth = new Date(Date.UTC(view.y, view.m, 0)).getUTCDate();
    return Array.from({ length: 42 }, (_, index) => {
      const day = index - firstIndex + 1;
      return day >= 1 && day <= daysInMonth ? day : null;
    });
  }, [view]);

  const shiftMonth = (delta: number) => {
    setView((current) => {
      const raw = current.m + delta;
      const y = current.y + Math.floor((raw - 1) / 12);
      const m = ((raw - 1) % 12 + 12) % 12 + 1;
      return { y, m };
    });
  };

  const selectDay = (day: number) => {
    onChange(`${view.y}-${pad(view.m)}-${pad(day)}`);
    setOpen(false);
  };

  return (
    <div
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          setOpen(false);
        }
      }}
    >
      <button
        id={id}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
        className="flex h-12 w-full items-center justify-between gap-3 rounded-[12px] bg-fill px-4 text-left transition-colors hover:bg-fill-strong focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <span className="text-[17px]">{formatThaiDateLong(value)}</span>
        <CalendarDays
          className="size-[18px] shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="เลือกวันที่"
          className="mt-2 rounded-[14px] bg-card p-2 shadow-[0_0_0_0.5px_rgba(0,0,0,0.06),0_10px_28px_-14px_rgba(0,0,0,0.25)] dark:shadow-[0_0_0_0.5px_rgba(255,255,255,0.08),0_10px_28px_-14px_rgba(0,0,0,0.8)]"
        >
          <div className="flex items-center justify-between px-1 pb-1">
            <button
              type="button"
              aria-label="เดือนก่อน"
              onClick={() => shiftMonth(-1)}
              className="flex size-11 items-center justify-center rounded-full text-primary-text transition-colors hover:bg-fill"
            >
              <ChevronLeft className="size-[18px]" aria-hidden="true" />
            </button>
            <p aria-live="polite" className="text-[15px] font-semibold">
              {MONTHS_FULL[view.m - 1]} {view.y}
            </p>
            <button
              type="button"
              aria-label="เดือนถัดไป"
              onClick={() => shiftMonth(1)}
              className="flex size-11 items-center justify-center rounded-full text-primary-text transition-colors hover:bg-fill"
            >
              <ChevronRight className="size-[18px]" aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-y-1 pb-1">
            {WEEKDAY_COLUMNS.map((label) => (
              <span
                key={label}
                aria-hidden="true"
                className="flex h-7 items-center justify-center text-[11px] font-medium text-muted-foreground"
              >
                {label}
              </span>
            ))}

            {cells.map((day, index) => {
              if (day === null) {
                return <span key={`blank-${index}`} aria-hidden="true" />;
              }
              const iso = `${view.y}-${pad(view.m)}-${pad(day)}`;
              const isSelected = iso === value;
              const isToday = iso === today;
              return (
                <div key={iso} className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => selectDay(day)}
                    aria-pressed={isSelected}
                    aria-label={`${day} ${MONTHS_FULL[view.m - 1]} ${view.y}`}
                    className={cn(
                      "flex size-11 items-center justify-center rounded-full text-[15px] tabular transition-colors",
                      isSelected
                        ? "bg-primary font-semibold text-primary-foreground"
                        : isToday
                          ? "font-semibold text-primary-text hover:bg-fill"
                          : "text-foreground hover:bg-fill",
                    )}
                  >
                    {day}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
