import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-5 flex items-end justify-between gap-4 pt-1 md:mb-6",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-[32px] leading-[1.12] font-bold md:text-[34px]">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
            {subtitle}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0 pb-0.5">{action}</div> : null}
    </div>
  );
}
