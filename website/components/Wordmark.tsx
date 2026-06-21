import { cn } from "@/lib/cn";

/** GlassBox wordmark — a tiny inline glass/box glyph + the name. */
export function Wordmark({
  className,
  showTagline = false,
}: {
  className?: string;
  showTagline?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        aria-hidden
        className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-brand/60 bg-brand/15 text-[13px] font-bold text-brand"
      >
        ◇
      </span>
      <span className="text-[17px] font-bold tracking-tight text-ink">
        Glass<span className="text-brand">Box</span>
      </span>
      {showTagline ? (
        <span className="hidden text-[12px] text-muted sm:inline">
          · tamper-evident AI decisions
        </span>
      ) : null}
    </span>
  );
}
