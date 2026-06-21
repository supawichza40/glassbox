import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// Error state — plain language + ALWAYS a recovery action (design-system rule).
// Color + word + glyph. Used for brain-offline / out-of-scope / failed audit.

export type ErrorTone = "warn" | "error";

interface ErrorStateProps {
  title: string;
  message?: string;
  tone?: ErrorTone;
  action?: ReactNode;
  className?: string;
}

export function ErrorState({
  title,
  message,
  tone = "error",
  action,
  className,
}: ErrorStateProps) {
  const isWarn = tone === "warn";
  return (
    <div
      role="alert"
      className={cn(
        "rounded-[12px] border px-5 py-5",
        isWarn
          ? "border-warn/50 bg-warn/10"
          : "border-bear/50 bg-bear/10",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 text-[16px] font-bold",
          isWarn ? "text-warn" : "text-bear",
        )}
      >
        <span aria-hidden>{isWarn ? "◐" : "✗"}</span>
        {title}
      </div>
      {message ? (
        <p className="mt-1.5 mb-0 max-w-[56ch] text-[14px] leading-snug text-ink2">
          {message}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
