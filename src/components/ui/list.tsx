import { cn } from "@/lib/utils";

/** Full-width inset group, the iOS grouped-list container. */
export function ListSection({
  title,
  action,
  footer,
  children,
  className,
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mt-5", className)}>
      {title || action ? (
        <div className="flex items-end justify-between gap-3 px-4 pb-1.5">
          {title ? (
            <h2 className="text-[13px] leading-tight font-medium text-muted-foreground">
              {title}
            </h2>
          ) : (
            <span />
          )}
          {action}
        </div>
      ) : null}
      <div className="group-card">{children}</div>
      {footer ? (
        <p className="px-4 pt-1.5 text-[12px] leading-relaxed text-muted-foreground">
          {footer}
        </p>
      ) : null}
    </section>
  );
}

/**
 * Row shell. The hairline is inset from the left and dropped on the last row,
 * matching iOS grouped lists. Use `inset="text"` when the row starts with an
 * icon so the rule aligns with the label.
 */
export const listRowClass =
  "relative flex min-h-[52px] w-full items-center gap-3 px-4 py-2.5 text-left after:pointer-events-none after:absolute after:right-0 after:bottom-0 after:h-px after:bg-border/70 last:after:hidden";

export function ListRow({
  className,
  inset = "edge",
  ...props
}: React.ComponentProps<"div"> & { inset?: "edge" | "text" }) {
  return (
    <div
      className={cn(
        listRowClass,
        inset === "text" ? "after:left-[52px]" : "after:left-4",
        className,
      )}
      {...props}
    />
  );
}

export function ListValue({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "shrink-0 text-[15px] text-muted-foreground tabular",
        className,
      )}
      {...props}
    />
  );
}

export function ListChevron({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn("size-4 shrink-0 text-muted-foreground/60", className)}
    >
      <path
        d="m9 6 6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
