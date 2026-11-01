import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center px-6 py-12 text-center",
        className,
      )}
    >
      <span className="mb-3 flex size-14 items-center justify-center rounded-full bg-secondary text-primary-text">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <p className="text-[17px] font-semibold">{title}</p>
      {description ? (
        <p className="mt-1 max-w-xs text-[13px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}
