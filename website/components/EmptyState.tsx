import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// Empty state — ALWAYS names the next action (design-system rule).
interface EmptyStateProps {
  title: string;
  description?: string;
  glyph?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  glyph = "◇",
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[12px] border border-dashed border-line bg-well px-6 py-12 text-center",
        className,
      )}
    >
      <div aria-hidden className="mb-3 text-3xl text-muted">
        {glyph}
      </div>
      <h3 className="m-0 text-[17px] font-semibold text-ink">{title}</h3>
      {description ? (
        <p className="mx-auto mt-1.5 mb-0 max-w-[44ch] text-[14px] text-muted">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
