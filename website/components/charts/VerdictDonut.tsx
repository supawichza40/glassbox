"use client";

import { useState } from "react";
import { ChartFrame, reducedMotion } from "./ChartFrame";
import type { VerdictMix } from "@/lib/dashboardMetrics";
import type { Verdict } from "@/lib/types";

// C2 — Verdict mix DONUT. Verdict colors are IDENTITY ONLY (not win/loss). Center
// shows the total decision count. Neutral framing: this is the distribution of
// calls, not a scoreboard.

const COLOR: Record<Verdict, string> = {
  BUY: "var(--bull)",
  HOLD: "var(--warn)",
  AVOID: "var(--bear)",
};
const GLYPH: Record<Verdict, string> = { BUY: "●", HOLD: "■", AVOID: "◆" };

interface Props {
  data: VerdictMix[];
  caption: string;
}

export function VerdictDonut({ data, caption }: Props) {
  const [active, setActive] = useState<Verdict | null>(null);
  const total = data.reduce((a, d) => a + d.count, 0);
  const C = 110; // viewbox center
  const R = 72;
  const circ = 2 * Math.PI * R;
  const animate = !reducedMotion();

  let offset = 0;
  const segs = data.map((d) => {
    const frac = total === 0 ? 0 : d.count / total;
    const seg = {
      verdict: d.verdict,
      count: d.count,
      frac,
      dash: frac * circ,
      gap: circ - frac * circ,
      rot: (offset / circ) * 360 - 90, // start at top
    };
    offset += frac * circ;
    return seg;
  });

  return (
    <ChartFrame title="Verdict mix" caption={caption}>
      <div className="flex items-center gap-4">
        <svg viewBox="0 0 220 220" width="100%" height="auto" style={{ maxWidth: 200 }} role="img" aria-label="Verdict distribution donut">
          {/* track */}
          <circle cx={C} cy={C} r={R} fill="none" stroke="var(--well)" strokeWidth={14} />
          {segs.map((s) => (
            <circle
              key={s.verdict}
              cx={C}
              cy={C}
              r={R}
              fill="none"
              stroke={COLOR[s.verdict]}
              strokeWidth={active && active !== s.verdict ? 10 : 14}
              strokeLinecap="butt"
              strokeDasharray={`${s.dash} ${s.gap}`}
              transform={`rotate(${s.rot} ${C} ${C})`}
              opacity={active && active !== s.verdict ? 0.45 : 1}
              style={{
                transition: "opacity .15s var(--ease), stroke-width .15s var(--ease)",
                ...(animate
                  ? { strokeDashoffset: 0, animation: "gbDraw .8s var(--ease) both", ["--len" as string]: String(s.dash + s.gap) }
                  : {}),
              }}
              onPointerEnter={() => setActive(s.verdict)}
              onPointerLeave={() => setActive(null)}
            />
          ))}
          <text x={C} y={C - 4} textAnchor="middle" className="mono" fontSize={34} fontWeight={800} fill="var(--ink)">
            {active ? data.find((d) => d.verdict === active)!.count : total}
          </text>
          <text x={C} y={C + 18} textAnchor="middle" className="mono" fontSize={11} fill="var(--faint)">
            {active ? active : "decisions"}
          </text>
        </svg>

        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {data.map((d) => {
            const pct = total === 0 ? 0 : Math.round((d.count / total) * 100);
            return (
              <li
                key={d.verdict}
                className="flex cursor-default items-center gap-2 text-[13px]"
                onPointerEnter={() => setActive(d.verdict)}
                onPointerLeave={() => setActive(null)}
                style={{ opacity: active && active !== d.verdict ? 0.55 : 1 }}
              >
                <span aria-hidden style={{ color: COLOR[d.verdict] }}>{GLYPH[d.verdict]}</span>
                <span className="w-12 font-semibold text-ink2">{d.verdict}</span>
                <span className="mono text-faint">{d.count} · {pct}%</span>
              </li>
            );
          })}
        </ul>
      </div>
    </ChartFrame>
  );
}
