"use client";

import { useState } from "react";
import { ChartFrame, GridY, PLOT, plotBox, reducedMotion } from "./ChartFrame";
import type { SignalBin } from "@/lib/dashboardMetrics";

// C3 — Signal-Strength distribution HISTOGRAM (5 bins). All bars --brand. This is
// "conviction, not accuracy" — how decisive the evidence was, never a profit signal.

interface Props {
  data: SignalBin[];
  caption: string;
}

export function SignalHistogram({ data, caption }: Props) {
  const [active, setActive] = useState<number | null>(null);
  const { innerW, innerH, x0, y1 } = plotBox();
  const maxY = Math.max(1, ...data.map((d) => d.count));
  const animate = !reducedMotion();

  const n = data.length;
  const slot = innerW / n;
  const bw = slot * 0.62;
  const ticks = [0, 0.5, 1].map((f) => ({ y: y1 - f * innerH, value: Math.round(f * maxY) }));

  return (
    <ChartFrame title="Signal-strength distribution" caption={caption}>
      <div className="relative">
        <svg viewBox={`0 0 ${PLOT.vbW} ${PLOT.vbH}`} width="100%" height="auto" role="img" aria-label="Distribution of signal strength across five bins">
          <GridY ticks={ticks} />

          {data.map((d, i) => {
            const h = (d.count / maxY) * innerH;
            const x = x0 + i * slot + (slot - bw) / 2;
            const y = y1 - h;
            const dim = active != null && active !== i;
            return (
              <g key={d.label} onPointerEnter={() => setActive(i)} onPointerLeave={() => setActive(null)}>
                {/* full-slot hover target */}
                <rect x={x0 + i * slot} y={PLOT.top} width={slot} height={innerH} fill="transparent" />
                <g
                  className={animate ? "gb-grow-y" : undefined}
                  style={animate ? ({ ["--i" as string]: String(i), animationDelay: `${i * 60}ms` } as React.CSSProperties) : undefined}
                >
                  <rect x={x} y={y} width={bw} height={Math.max(0, h)} rx={2} fill="var(--brand)" fillOpacity={dim ? 0.55 : 0.9} stroke={active === i ? "var(--brand-hi)" : "none"} strokeWidth={1} />
                  {/* 1px top-edge highlight */}
                  {h > 1 && <rect x={x} y={y} width={bw} height={1} fill="var(--brand-hi)" fillOpacity={dim ? 0.4 : 0.9} />}
                </g>
                <text x={x0 + i * slot + slot / 2} y={y1 + 16} textAnchor="middle" className="mono" fontSize={11} fill="var(--faint)">
                  {d.label}
                </text>
              </g>
            );
          })}

          <line x1={x0} x2={x0 + innerW} y1={y1} y2={y1} stroke="var(--line-strong)" strokeWidth={1} />
        </svg>

        {active != null && (
          <div className="bg-surface2 elev-2 pointer-events-none absolute top-0 z-10 rounded-[10px] border border-line px-3 py-2" style={{ left: `${((x0 + active * slot + slot / 2) / PLOT.vbW) * 100}%`, transform: "translateX(-50%)" }}>
            <div className="mono text-[11px] text-faint">{data[active].label}</div>
            <div className="mono text-[13px] text-brand-hi">{data[active].count} decisions</div>
          </div>
        )}
      </div>
    </ChartFrame>
  );
}
