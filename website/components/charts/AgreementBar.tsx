"use client";

import { useState } from "react";
import { ChartFrame, reducedMotion } from "./ChartFrame";
import type { AgreementMix } from "@/lib/dashboardMetrics";

// C5 — Code baseline vs AI agreement, a single horizontal STACKED BAR.
// TRANSPARENCY framing: "how often the AI departed from the rule-based baseline".
// This is NOT a correctness/accuracy claim — neither segment is "right".
//   agreed = --ink2 (neutral) · AI-overrode = --brand (the evidence accent).

interface Props {
  data: AgreementMix;
  caption: string;
}

export function AgreementBar({ data, caption }: Props) {
  const [active, setActive] = useState<"agreed" | "overrode" | null>(null);
  const total = data.agreed + data.overrode;
  const agreedFrac = total === 0 ? 0 : data.agreed / total;
  const overFrac = total === 0 ? 0 : data.overrode / total;

  const W = 520, H = 60, x0 = 10, barW = W - 20, y = 16, bh = 28;
  const aW = agreedFrac * barW;
  const oW = overFrac * barW;
  const animate = !reducedMotion();

  const pct = (f: number) => Math.round(f * 100);

  return (
    <ChartFrame title="Code baseline vs AI" caption={caption}>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" role="img" aria-label="How often the AI agreed with vs departed from the rule-based baseline">
          {/* track */}
          <rect x={x0} y={y} width={barW} height={bh} rx={4} fill="var(--well)" />
          <g
            style={animate ? ({ transformOrigin: "left", transformBox: "fill-box", animation: "gbGrow .7s var(--ease) both" } as React.CSSProperties) : undefined}
          >
            {aW > 0 && (
              <rect
                x={x0}
                y={y}
                width={aW}
                height={bh}
                rx={4}
                fill="var(--ink2)"
                fillOpacity={active && active !== "agreed" ? 0.45 : 0.9}
                onPointerEnter={() => setActive("agreed")}
                onPointerLeave={() => setActive(null)}
              />
            )}
            {oW > 0 && (
              <rect
                x={x0 + aW}
                y={y}
                width={oW}
                height={bh}
                rx={4}
                fill="var(--brand)"
                fillOpacity={active && active !== "overrode" ? 0.45 : 0.9}
                onPointerEnter={() => setActive("overrode")}
                onPointerLeave={() => setActive(null)}
              />
            )}
          </g>
        </svg>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
          <span className="flex items-center gap-2" onPointerEnter={() => setActive("agreed")} onPointerLeave={() => setActive(null)} style={{ opacity: active && active !== "agreed" ? 0.55 : 1 }}>
            <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: "var(--ink2)" }} />
            <span className="font-semibold text-ink2">Matched baseline</span>
            <span className="mono text-faint">{data.agreed} · {pct(agreedFrac)}%</span>
          </span>
          <span className="flex items-center gap-2" onPointerEnter={() => setActive("overrode")} onPointerLeave={() => setActive(null)} style={{ opacity: active && active !== "overrode" ? 0.55 : 1 }}>
            <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: "var(--brand)" }} />
            <span className="font-semibold text-ink2">AI departed</span>
            <span className="mono text-faint">{data.overrode} · {pct(overFrac)}%</span>
          </span>
        </div>
        <p className="mt-2 mb-0 text-[12px] leading-snug text-muted">
          How often the AI&apos;s verdict departed from the rule-based baseline — a
          transparency signal, <b>not</b> a measure of which was correct.
        </p>
      </div>
    </ChartFrame>
  );
}
