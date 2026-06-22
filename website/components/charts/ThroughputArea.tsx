"use client";

import { useId, useRef, useState } from "react";
import { ChartFrame, GridY, PLOT, plotBox, reducedMotion } from "./ChartFrame";
import type { DayBucket } from "@/lib/dashboardMetrics";

// C1 — Decisions over time. Cumulative AREA with a --brand line + gradient fill,
// crosshair tooltip snapping to the nearest day. Activity metric only.

interface Props {
  data: DayBucket[];
  caption: string;
}

export function ThroughputArea({ data, caption }: Props) {
  const gradId = useId().replace(/:/g, "");
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const { innerW, innerH, x0, y0, x1, y1 } = plotBox();

  const maxY = Math.max(1, ...data.map((d) => d.cumulative));
  const n = data.length;
  const xAt = (i: number) => (n <= 1 ? x0 : x0 + (i / (n - 1)) * innerW);
  const yAt = (v: number) => y1 - (v / maxY) * innerH;

  const linePts = data.map((d, i) => `${xAt(i)},${yAt(d.cumulative)}`).join(" ");
  const areaPath =
    `M ${x0} ${y1} ` +
    data.map((d, i) => `L ${xAt(i)} ${yAt(d.cumulative)}`).join(" ") +
    ` L ${x1} ${y1} Z`;

  // 4 horizontal ticks
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ y: y1 - f * innerH, value: Math.round(f * maxY) }));

  // approximate path length for the draw animation
  const len = innerW + innerH;
  const animate = !reducedMotion();

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * PLOT.vbW;
    const rel = (px - x0) / Math.max(1, innerW);
    const i = Math.round(rel * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };

  const hv = hover != null ? data[hover] : null;
  const hx = hover != null ? xAt(hover) : 0;
  const hy = hover != null ? yAt(hv!.cumulative) : 0;

  return (
    <ChartFrame title="Decisions over time" caption={caption}>
      <div ref={wrapRef} className="relative">
        <svg viewBox={`0 0 ${PLOT.vbW} ${PLOT.vbH}`} width="100%" height="auto" role="img" aria-label="Cumulative signed decisions over the last 30 days">
          <defs>
            <linearGradient id={`grad-${gradId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
            </linearGradient>
          </defs>

          <GridY ticks={ticks} />

          <path d={areaPath} fill={`url(#grad-${gradId})`} />
          <polyline
            points={linePts}
            fill="none"
            stroke="var(--brand)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            style={
              animate
                ? ({ strokeDasharray: len, ["--len" as string]: String(len), animation: "gbDraw .9s var(--ease) both" } as React.CSSProperties)
                : undefined
            }
          />

          {/* baseline */}
          <line x1={x0} x2={x1} y1={y1} y2={y1} stroke="var(--line-strong)" strokeWidth={1} />

          {hv && (
            <g>
              <line x1={hx} x2={hx} y1={y0} y2={y1} stroke="var(--line-strong)" strokeWidth={1} />
              <circle cx={hx} cy={hy} r={3.5} fill="var(--brand)" stroke="var(--bg)" strokeWidth={1.5} />
            </g>
          )}

          {/* hover capture */}
          <rect
            x={x0}
            y={y0}
            width={innerW}
            height={innerH}
            fill="transparent"
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
          />
        </svg>

        {hv && (
          <div
            className="bg-surface2 elev-2 pointer-events-none absolute z-10 rounded-[10px] border border-line px-3 py-2"
            style={{
              left: `${(hx / PLOT.vbW) * 100}%`,
              top: 0,
              transform: "translateX(-50%)",
            }}
          >
            <div className="mono text-[11px] text-faint">{hv.label}</div>
            <div className="mono text-[13px] text-brand-hi">{hv.cumulative} signed</div>
            <div className="mono text-[11px] text-muted">+{hv.count} that day</div>
          </div>
        )}
      </div>
    </ChartFrame>
  );
}
