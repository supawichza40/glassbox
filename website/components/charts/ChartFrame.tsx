"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/Card";
import { cn } from "@/lib/cn";

// Shared "instrument panel" wrapper for every hand-rolled SVG chart:
//   Card → header (title + tiny mono caption) → recessed plot well → <svg>.
// The well is the bg-well rounded inset that gives the expensive recessed feel.

export const PLOT = {
  // viewBox geometry shared by the cartesian charts (area / histogram)
  vbW: 520,
  vbH: 240,
  left: 44,
  right: 16,
  top: 16,
  bottom: 28,
};

export function plotBox() {
  const innerW = PLOT.vbW - PLOT.left - PLOT.right;
  const innerH = PLOT.vbH - PLOT.top - PLOT.bottom;
  return { innerW, innerH, x0: PLOT.left, y0: PLOT.top, x1: PLOT.vbW - PLOT.right, y1: PLOT.vbH - PLOT.bottom };
}

export function reducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

interface ChartFrameProps {
  title: string;
  caption: string;
  children: ReactNode;
  className?: string;
  /** extra node rendered right of the title (e.g. a legend) */
  aside?: ReactNode;
}

export function ChartFrame({ title, caption, children, className, aside }: ChartFrameProps) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="m-0 text-[16px] font-semibold text-ink2">{title}</h3>
          <p className="mono mt-0.5 mb-0 text-[11px] text-faint">{caption}</p>
        </div>
        {aside}
      </div>
      <div className="bg-well mt-3 rounded-[10px] border border-line p-3">
        {children}
      </div>
    </Card>
  );
}

/** Horizontal gridlines + left axis ticks. NO verticals (design rule). */
export function GridY({
  ticks,
  fmt = (v: number) => String(v),
}: {
  ticks: { y: number; value: number }[];
  fmt?: (v: number) => string;
}) {
  const { x0, x1 } = plotBox();
  return (
    <g>
      {ticks.map((t, i) => (
        <g key={i}>
          <line
            x1={x0}
            x2={x1}
            y1={t.y}
            y2={t.y}
            stroke="var(--line)"
            strokeOpacity={0.55}
            strokeWidth={1}
          />
          <text
            x={x0 - 8}
            y={t.y + 3.5}
            textAnchor="end"
            className="mono"
            fontSize={11}
            fill="var(--faint)"
          >
            {fmt(t.value)}
          </text>
        </g>
      ))}
    </g>
  );
}
