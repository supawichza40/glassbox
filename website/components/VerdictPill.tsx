import type { Verdict } from "@/lib/types";
import { cn } from "@/lib/cn";

// Color + WORD + GLYPH for every verdict (non-color a11y rule).
//   BUY = bull green ▲ · HOLD = warn amber ■ · AVOID = bear red ▼
const MAP: Record<Verdict, { glyph: string; color: string; bg: string; border: string }> = {
  BUY: { glyph: "▲", color: "text-bull", bg: "bg-bull/10", border: "border-bull/55" },
  HOLD: { glyph: "■", color: "text-warn", bg: "bg-warn/10", border: "border-warn/55" },
  AVOID: { glyph: "▼", color: "text-bear", bg: "bg-bear/10", border: "border-bear/55" },
};

export type VerdictPillSize = "sm" | "md" | "hero";

interface VerdictPillProps {
  verdict: Verdict;
  size?: VerdictPillSize;
  className?: string;
}

export function VerdictPill({ verdict, size = "md", className }: VerdictPillProps) {
  const m = MAP[verdict] ?? MAP.HOLD;
  if (size === "hero") {
    // Verdict hero: 64/800, its own POP beat in the staged reveal.
    return (
      <div
        className={cn(
          "inline-flex items-center gap-3 font-extrabold leading-none",
          m.color,
          className,
        )}
        role="status"
        aria-label={`Verdict: ${verdict}`}
      >
        <span aria-hidden className="text-[0.85em]">
          {m.glyph}
        </span>
        <span className="text-[clamp(40px,9vw,64px)] tracking-tight">{verdict}</span>
      </div>
    );
  }
  const pad = size === "sm" ? "px-2 py-0.5 text-[13px]" : "px-3 py-1 text-[15px]";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-bold",
        pad,
        m.color,
        m.bg,
        m.border,
        className,
      )}
      aria-label={`Verdict ${verdict}`}
    >
      <span aria-hidden>{m.glyph}</span>
      {verdict}
    </span>
  );
}
