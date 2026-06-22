"use client";

import { ChartFrame, reducedMotion } from "./ChartFrame";

// C4 — Anchored on-chain GAUGE (270° arc). --well track + --accent value arc,
// big mono % in the center. Integrity metric: share of records anchored on-chain.

interface Props {
  pct: number; // 0..100
  anchored: number;
  total: number;
  caption: string;
}

// Build an SVG arc path for a 270° gauge (start bottom-left, sweep clockwise).
function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const p = (deg: number) => {
    const a = (deg * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const [x1, y1] = p(startDeg);
  const [x2, y2] = p(endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

export function AnchoredGauge({ pct, anchored, total, caption }: Props) {
  const cx = 110, cy = 110, r = 80;
  // 270° sweep centered at bottom: from 135° to 405° (=45°)
  const START = 135, SWEEP = 270;
  const valEnd = START + (Math.max(0, Math.min(100, pct)) / 100) * SWEEP;

  // total arc length for the dashoffset sweep animation
  const arcLen = (SWEEP / 360) * 2 * Math.PI * r;
  const animate = !reducedMotion();

  return (
    <ChartFrame title="Anchored on-chain" caption={caption}>
      <div className="flex items-center justify-center">
        <svg viewBox="0 0 220 220" width="100%" height="auto" style={{ maxWidth: 200 }} role="img" aria-label={`${pct}% of records anchored on-chain`}>
          {/* track */}
          <path d={arcPath(cx, cy, r, START, START + SWEEP)} fill="none" stroke="var(--well)" strokeWidth={16} strokeLinecap="round" />
          {/* value */}
          {pct > 0 && (
            <path
              d={arcPath(cx, cy, r, START, valEnd)}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={16}
              strokeLinecap="round"
              style={
                animate
                  ? ({ strokeDasharray: arcLen, strokeDashoffset: 0, ["--len" as string]: String(arcLen), animation: "gbDraw 1s var(--ease) both" } as React.CSSProperties)
                  : undefined
              }
            />
          )}
          <text x={cx} y={cy + 2} textAnchor="middle" className="mono" fontSize={40} fontWeight={800} fill="var(--ink)">
            {pct}%
          </text>
          <text x={cx} y={cy + 26} textAnchor="middle" className="mono" fontSize={11} fill="var(--faint)">
            {anchored}/{total} anchored
          </text>
        </svg>
      </div>
    </ChartFrame>
  );
}
