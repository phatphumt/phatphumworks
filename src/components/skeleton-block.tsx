import { cn } from "@/lib/utils";

/** Neutral shimmer block shared by the route-level loading skeletons. */
export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-muted", className)}
    />
  );
}
