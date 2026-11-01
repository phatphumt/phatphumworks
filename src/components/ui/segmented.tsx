"use client";

import { cn } from "@/lib/utils";

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
};

/** iOS segmented control. Sits on a recessed track with a raised thumb. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<SegmentedOption<T>>;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("flex gap-0.5 rounded-[10px] bg-fill p-0.5", className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-11 flex-1 rounded-[8px] px-2 text-[13px] font-medium transition-[background-color,color,box-shadow] duration-150",
              active
                ? "bg-white text-foreground shadow-[0_1px_4px_rgba(0,0,0,0.14),0_0_0_0.5px_rgba(0,0,0,0.05)] dark:bg-[#48484a] dark:shadow-[0_1px_4px_rgba(0,0,0,0.4)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
