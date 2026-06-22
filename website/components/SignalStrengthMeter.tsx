import type { SignalBand } from "@/lib/types";
import { cn } from "@/lib/cn";

// Signal Strength = how DECISIVE the evidence was (mechanical) — NEVER profit.
// The caveat is inline (not a tooltip), per claim discipline.
//   Bull bar (green) + Bear bar (red) + a direction-NEUTRAL --brand confidence bar.

interface SignalStrengthMeterProps {
  /** 0..5 revised conviction. */
  bullConviction: number;
  bearConviction: number;
  /** 0..100 mechanical signal strength. */
  signalStrengthPct: number;
  band: SignalBand;
  /** Animate the bars growing (staged reveal). */
  reveal?: boolean;
  className?: string;
}

function Bar({
  label,
  pct,
  colorVar,
  valueLabel,
  reveal,
  delayMs = 0,
}: {
  label: string;
  pct: number;
  colorVar: string;
  valueLabel: string;
  reveal?: boolean;
  delayMs?: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-12 shrink-0 text-[13px] font-semibold text-ink2">{label}</span>
      <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-well border border-line">
        <div
          className={cn("absolute inset-y-0 left-0 rounded-full", reveal && "gb-grow")}
          style={{
            width: `${Math.max(0, Math.min(100, pct))}%`,
            background: colorVar,
            animationDelay: reveal ? `${delayMs}ms` : undefined,
          }}
        />
      </div>
      <span className="mono w-12 shrink-0 text-right text-[13px] text-faint">
        {valueLabel}
      </span>
    </div>
  );
}

export function SignalStrengthMeter({
  bullConviction,
  bearConviction,
  signalStrengthPct,
  band,
  reveal = false,
  className,
}: SignalStrengthMeterProps) {
  const net = bullConviction - bearConviction;
  const lean = net > 0 ? "Bull" : net < 0 ? "Bear" : "a draw";

  return (
    <div className={cn("glow-evidence flex flex-col gap-3", className)}>
      <Bar
        label="Bull"
        pct={(bullConviction / 5) * 100}
        colorVar="var(--bull)"
        valueLabel={`${bullConviction}/5`}
        reveal={reveal}
        delayMs={0}
      />
      <Bar
        label="Bear"
        pct={(bearConviction / 5) * 100}
        colorVar="var(--bear)"
        valueLabel={`${bearConviction}/5`}
        reveal={reveal}
        delayMs={120}
      />

      {/* Direction-neutral confidence bar in --brand (never green/red). */}
      <div className="mt-1 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-ink2">Signal Strength</span>
        <span className="mono text-[13px] text-ink">
          {signalStrengthPct}% · <span className="text-brand-hi">{band}</span>
        </span>
      </div>
      <div
        className="relative h-3 overflow-hidden rounded-full bg-well border border-line"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={signalStrengthPct}
        aria-label={`Signal strength ${signalStrengthPct} percent, ${band} — decisiveness of the evidence, not a profit forecast`}
      >
        <div
          className={cn("absolute inset-y-0 left-0 rounded-full", reveal && "gb-grow")}
          style={{
            width: `${Math.max(0, Math.min(100, signalStrengthPct))}%`,
            background: "var(--brand)",
            animationDelay: reveal ? "280ms" : undefined,
          }}
        />
      </div>

      <p className="m-0 text-[13px] leading-snug text-muted">
        Bull {bullConviction} vs Bear {bearConviction} → net {net > 0 ? "+" : ""}
        {net} toward {lean}. Signal Strength measures how <b>decisive</b> the
        evidence was — <b>not</b> a profit or return forecast.
      </p>
    </div>
  );
}
