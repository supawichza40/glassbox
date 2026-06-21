import type { Decision } from "@/lib/types";
import { cn } from "@/lib/cn";
import { VerdictPill } from "./VerdictPill";

// Shows the deterministic, code-only baseline verdict vs the AI debate's verdict,
// and surfaces the override banner when flags.llmOverrodeSignals is true. This is
// the "evidence layer, not a black box" story — code computes the baseline; the
// LLM only debates.

interface CodeVsAISplitPanelProps {
  decision: Decision;
  className?: string;
}

export function CodeVsAISplitPanel({ decision, className }: CodeVsAISplitPanelProps) {
  const baseline = decision.flags.baselineVerdict;
  const ai = decision.verdict;
  const overrode = decision.flags.llmOverrodeSignals;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-line bg-well p-4">
          <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-muted">
            <span aria-hidden>{"</>"}</span> Deterministic baseline
          </div>
          <VerdictPill verdict={baseline} size="sm" />
          <p className="mt-2 mb-0 text-[13px] leading-snug text-muted">
            Computed by code from the raw signals (RSI, trend, drawdown,
            manipulation flag) — no model in the loop.
          </p>
        </div>
        <div className="rounded-lg border border-line bg-well p-4">
          <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-muted">
            <span aria-hidden>🗣</span> AI debate resolved
          </div>
          <VerdictPill verdict={ai} size="sm" />
          <p className="mt-2 mb-0 text-[13px] leading-snug text-muted">
            The Bull/Bear/Arbiter debate&apos;s verdict. The Signal Strength and
            position size are computed by code, not the model.
          </p>
        </div>
      </div>

      {overrode ? (
        <div className="rounded-lg border border-warn/60 border-dashed bg-warn/10 px-4 py-3">
          <div className="flex items-center gap-2 text-[14px] font-bold text-warn">
            <span aria-hidden>⚠</span> AI overrode the baseline
          </div>
          <p className="mt-1 mb-0 text-[13px] leading-snug text-ink2">
            The rule-based baseline said{" "}
            <span className="font-bold">{baseline}</span> but the debate resolved{" "}
            <span className="font-bold">{ai}</span> — a 2-step move. The full
            reasoning is in the debate above; this disagreement is recorded in the
            signed record, not hidden.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-line bg-surface2 px-4 py-2.5">
          <p className="m-0 text-[13px] text-muted">
            <span className="font-semibold text-ink2">In agreement</span> — the AI
            debate landed on the same verdict the deterministic baseline did.
          </p>
        </div>
      )}
    </div>
  );
}
