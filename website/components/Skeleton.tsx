import { cn } from "@/lib/cn";

// Skeleton — NEVER a bare spinner. When steps are given, it narrates them
// (design-system rule: loading states narrate). Honors reduced-motion via CSS.

export function SkeletonBar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-3 w-full animate-pulse rounded bg-line/60 motion-reduce:animate-none",
        className,
      )}
    />
  );
}

interface NarratedSkeletonProps {
  steps: string[];
  /** Index of the step currently in progress (0-based). */
  activeStep?: number;
  className?: string;
}

/** A narrated loading state — shows the pipeline steps so the wait feels earned. */
export function NarratedSkeleton({
  steps,
  activeStep = 0,
  className,
}: NarratedSkeletonProps) {
  return (
    <div className={cn("flex flex-col gap-2.5", className)} aria-live="polite">
      {steps.map((s, i) => {
        const done = i < activeStep;
        const active = i === activeStep;
        return (
          <div key={i} className="flex items-center gap-3">
            <span
              aria-hidden
              className={cn(
                "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px]",
                done
                  ? "border-bull/60 text-bull"
                  : active
                    ? "border-brand text-brand"
                    : "border-line text-muted",
              )}
            >
              {done ? "✓" : active ? "◌" : i + 1}
            </span>
            <span
              className={cn(
                "text-[14px]",
                done ? "text-ink2" : active ? "text-ink" : "text-muted",
              )}
            >
              {s}
              {active ? (
                <span className="ml-2 inline-block animate-pulse motion-reduce:animate-none text-brand">
                  …
                </span>
              ) : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}
