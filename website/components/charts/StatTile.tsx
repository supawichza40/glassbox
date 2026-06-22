"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/Card";
import { cn } from "@/lib/cn";
import { reducedMotion } from "./ChartFrame";

// A scorecard tile: big mono value (optional count-up), label, tiny sub-caption.
// `hero` adds the evidence glow (used for the anchored % tile).

interface Props {
  label: string;
  value: number;
  suffix?: string;
  sub?: string;
  hero?: boolean;
  /** color of the value (defaults to ink). */
  tone?: "ink" | "accent" | "brand" | "bear";
  className?: string;
}

const TONE: Record<NonNullable<Props["tone"]>, string> = {
  ink: "text-ink",
  accent: "text-accent",
  brand: "text-brand-hi",
  bear: "text-bear",
};

export function StatTile({ label, value, suffix = "", sub, hero = false, tone = "ink", className }: Props) {
  const [display, setDisplay] = useState(reducedMotion() ? value : 0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (reducedMotion()) {
      setDisplay(value);
      return;
    }
    if (startedRef.current) {
      setDisplay(value);
      return;
    }
    startedRef.current = true;
    const dur = 700;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(eased * value));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <Card className={cn("flex flex-col justify-between", hero && "glow-evidence border-line-strong", className)}>
      <div className="text-[13px] font-medium text-muted">{label}</div>
      <div className={cn("mono mt-2 text-[34px] font-extrabold leading-none tracking-tight", TONE[tone])}>
        {display}
        {suffix}
      </div>
      {sub ? <div className="mono mt-2 text-[11px] text-faint">{sub}</div> : null}
    </Card>
  );
}
