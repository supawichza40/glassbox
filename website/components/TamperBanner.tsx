"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

// The big state banner. Color + WORD + GLYPH + BORDER-STYLE on every state:
//   verified = SOLID 2px green ✓ · tamper = DASHED 2px red ✗ · warn = amber ◐.
// Only ONE thing animates during TAMPER (the banner SLAM/shake). Honors reduced-motion.

export type BannerStatus = "verified" | "tamper" | "warn" | "neutral";

interface TamperBannerProps {
  status: BannerStatus;
  headline: string;
  sub?: string;
  className?: string;
}

const STYLES: Record<
  BannerStatus,
  { wrap: string; glyph: string; text: string }
> = {
  verified: {
    wrap: "border-solid border-bull bg-bull/10 text-bull",
    glyph: "✓",
    text: "text-bull",
  },
  tamper: {
    wrap: "border-dashed border-bear bg-bear/10 text-bear",
    glyph: "✗",
    text: "text-bear",
  },
  warn: {
    wrap: "border-solid border-warn bg-warn/10 text-warn",
    glyph: "◐",
    text: "text-warn",
  },
  neutral: {
    wrap: "border-solid border-line bg-surface2 text-ink2",
    glyph: "•",
    text: "text-ink2",
  },
};

export function TamperBanner({ status, headline, sub, className }: TamperBannerProps) {
  const s = STYLES[status];
  const ref = useRef<HTMLDivElement>(null);

  // Re-trigger the entry animation whenever status flips (pop for good, shake for bad).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove("gb-pop", "gb-shake", "gb-alarm");
    // force reflow so the animation restarts
    void el.offsetWidth;
    if (status === "tamper") {
      el.classList.add("gb-shake", "gb-alarm");
    } else {
      el.classList.add("gb-pop");
    }
  }, [status, headline]);

  return (
    <div
      ref={ref}
      role="status"
      aria-live="assertive"
      className={cn(
        "rounded-[12px] border-2 px-5 py-6 text-center",
        s.wrap,
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center gap-3 font-extrabold leading-none",
          status === "tamper"
            ? "text-[clamp(30px,8vw,46px)]"
            : "text-[clamp(26px,6vw,40px)]",
          s.text,
        )}
      >
        <span aria-hidden>{s.glyph}</span>
        <span className="tracking-tight">{headline}</span>
      </div>
      {sub ? (
        <p className="mx-auto mt-3 mb-0 max-w-[52ch] text-[14px] leading-snug text-ink2">
          {sub}
        </p>
      ) : null}
    </div>
  );
}
