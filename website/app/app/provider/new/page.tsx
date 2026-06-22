"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { VerdictPill } from "@/components/VerdictPill";
import { SignalStrengthMeter } from "@/components/SignalStrengthMeter";
import { CodeVsAISplitPanel } from "@/components/CodeVsAISplitPanel";
import { NarratedSkeleton, SkeletonBar } from "@/components/Skeleton";
import { ErrorState } from "@/components/ErrorState";
import { analyze, audit, BrainError } from "@/lib/brain";
import { saveRecord } from "@/lib/store";
import type { Decision, RiskBand } from "@/lib/types";

const EXAMPLE = "Should I hold SUI for the next 2 weeks? I'm moderate risk.";
const STEPS = [
  "Freezing the market inputs (trend, RSI, volatility, liquidity, drawdown)",
  "The Bull and Bear agents are debating both sides",
  "Cross-examining and scoring conviction",
  "The Risk Arbiter is resolving the verdict",
];

type Phase = "idle" | "analyzing" | "result" | "proving";

export default function NewAnalysisPage() {
  const router = useRouter();
  const [goalText, setGoalText] = useState(EXAMPLE);
  const [risk, setRisk] = useState<RiskBand>("moderate");
  const [phase, setPhase] = useState<Phase>("idle");
  const [decision, setDecision] = useState<Decision | null>(null);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<{ title: string; message: string; warn: boolean } | null>(
    null,
  );
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      if (stepTimer.current) clearInterval(stepTimer.current);
    },
    [],
  );

  function startStepper() {
    setStep(0);
    stepTimer.current = setInterval(
      () => setStep((s) => Math.min(s + 1, STEPS.length - 1)),
      1400,
    );
  }
  function stopStepper() {
    if (stepTimer.current) {
      clearInterval(stepTimer.current);
      stepTimer.current = null;
    }
  }

  async function onAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!goalText.trim()) return;
    setError(null);
    setDecision(null);
    setPhase("analyzing");
    startStepper();
    try {
      const d = await analyze({ goalText, asset: "SUI/USDC", risk });
      setDecision(d);
      setPhase("result");
    } catch (err) {
      const be = err as BrainError;
      setError(
        be.outOfScope
          ? { title: "That's off-topic for GlassBox", message: be.message, warn: true }
          : {
              title: "Couldn't run the analysis",
              message: be.message || "Something went wrong.",
              warn: false,
            },
      );
      setPhase("idle");
    } finally {
      stopStepper();
    }
  }

  async function onProve() {
    if (!decision) return;
    setPhase("proving");
    setError(null);
    try {
      const a = await audit(decision, goalText);
      saveRecord({
        decision,
        audit: a,
        goalText,
        asset: "SUI/USDC",
        risk,
        createdAt: Date.now(),
      });
      router.push(`/app/provider/d/${a.recordId}`);
    } catch (err) {
      const be = err as BrainError;
      setError({
        title: "Couldn't anchor the record",
        message: be.message || "Anchoring failed — try again.",
        warn: false,
      });
      setPhase("result");
    }
  }

  return (
    <AppShell variant="app" maxWidth="app">
      <h1 className="m-0 text-[30px] font-extrabold tracking-tight text-ink">Run an analysis</h1>
      <p className="mt-1 mb-6 max-w-[68ch] text-[15px] text-muted">
        A Bull and a Bear agent debate the call over frozen market inputs; a Risk Arbiter
        resolves the verdict. Then it&apos;s signed and anchored — tamper-evident and
        independently verifiable.
      </p>

      <form onSubmit={onAnalyze}>
        <Card>
          <label
            htmlFor="goal"
            className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-muted"
          >
            Your investing question
          </label>
          <textarea
            id="goal"
            value={goalText}
            onChange={(e) => setGoalText(e.target.value)}
            spellCheck={false}
            rows={2}
            className="w-full resize-y rounded-lg border border-line bg-surface2 p-3 text-[16px] text-ink focus-visible:outline-2 focus-visible:outline-accent"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface2 px-3 py-2 text-[14px] text-ink2">
              <span className="mono">SUI/USDC</span>
              <span className="text-muted">· more soon</span>
            </span>
            <label className="inline-flex items-center gap-2 text-[14px] text-ink2">
              Risk
              <select
                value={risk}
                onChange={(e) => setRisk(e.target.value as RiskBand)}
                className="rounded-lg border border-line bg-surface2 px-3 py-2 text-[14px] text-ink focus-visible:outline-2 focus-visible:outline-accent"
              >
                <option value="low">low</option>
                <option value="moderate">moderate</option>
                <option value="high">high</option>
              </select>
            </label>
            <Button type="submit" variant="primary" disabled={phase === "analyzing"}>
              {phase === "analyzing" ? "Analyzing…" : "Analyze"}
            </Button>
          </div>
        </Card>
      </form>

      {error ? (
        <ErrorState
          className="mt-5"
          tone={error.warn ? "warn" : "error"}
          title={error.title}
          message={error.message}
          action={
            error.warn ? (
              <Button variant="secondary" onClick={() => setGoalText(EXAMPLE)}>
                Use the example question
              </Button>
            ) : undefined
          }
        />
      ) : null}

      {phase === "analyzing" ? (
        <Card className="mt-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-line bg-well p-4">
              <div className="text-[12px] font-bold uppercase tracking-wide text-bull">
                Bull case
              </div>
              <div className="mt-3 flex flex-col gap-2">
                <SkeletonBar />
                <SkeletonBar className="w-4/5" />
                <SkeletonBar className="w-3/5" />
              </div>
            </div>
            <div className="rounded-lg border border-line bg-well p-4">
              <div className="text-[12px] font-bold uppercase tracking-wide text-bear">
                Bear case
              </div>
              <div className="mt-3 flex flex-col gap-2">
                <SkeletonBar />
                <SkeletonBar className="w-4/5" />
                <SkeletonBar className="w-3/5" />
              </div>
            </div>
          </div>
          <div className="mt-5">
            <NarratedSkeleton steps={STEPS} activeStep={step} />
          </div>
        </Card>
      ) : null}

      {phase !== "analyzing" && decision ? (
        <div className="mt-5 flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DebateColumn
              side="Bull"
              color="bull"
              points={decision.bull.points}
              rebuttal={decision.bull.rebuttal}
              conviction={decision.bull.convictionRevised}
            />
            <DebateColumn
              side="Bear"
              color="bear"
              points={decision.bear.points}
              rebuttal={decision.bear.rebuttal}
              conviction={decision.bear.convictionRevised}
            />
          </div>

          <Card className="text-center">
            <div className="text-[12px] font-semibold uppercase tracking-wide text-muted">
              Verdict
            </div>
            <div
              className="gb-verdict mt-3 flex justify-center"
              style={{ animationDelay: "350ms" }}
            >
              <VerdictPill verdict={decision.verdict} size="hero" />
            </div>
            {decision.whyResolved ? (
              <p className="mx-auto mt-3 mb-0 max-w-[60ch] text-[14px] text-ink2">
                {decision.whyResolved}
              </p>
            ) : null}
            <div className="mx-auto mt-5 max-w-[520px] text-left">
              <SignalStrengthMeter
                bullConviction={decision.bull.convictionRevised}
                bearConviction={decision.bear.convictionRevised}
                signalStrengthPct={decision.signalStrengthPct}
                band={decision.signalBand}
                reveal
              />
            </div>
            <p className="mt-4 mb-0 text-[13px] text-muted">
              Suggested size: <b className="text-ink2">{decision.suggestedSizePct}%</b> ·
              decisiveness, not a profit forecast.
            </p>
          </Card>

          <CodeVsAISplitPanel decision={decision} />

          {decision.counterfactual || decision.blindSpots.length ? (
            <Card>
              <h3 className="m-0 text-[15px] font-bold text-ink">Why you should doubt this</h3>
              {decision.riskNote ? (
                <p className="mt-2 mb-0 text-[14px] text-ink2">
                  <b>Biggest risk:</b> {decision.riskNote}
                </p>
              ) : null}
              {decision.counterfactual ? (
                <p className="mt-2 mb-0 text-[14px] text-ink2">
                  <b>Would flip if:</b> {decision.counterfactual}
                </p>
              ) : null}
              {decision.blindSpots.length ? (
                <ul className="mt-2 mb-0 list-disc pl-5 text-[14px] text-ink2">
                  {decision.blindSpots.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              ) : null}
            </Card>
          ) : null}

          <div className="flex justify-center">
            <Button variant="primary" size="lg" onClick={onProve} disabled={phase === "proving"}>
              {phase === "proving" ? "Signing + anchoring…" : "Prove it — sign + anchor"}
            </Button>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}

function DebateColumn({
  side,
  color,
  points,
  rebuttal,
  conviction,
}: {
  side: string;
  color: "bull" | "bear";
  points: string[];
  rebuttal: string;
  conviction: number;
}) {
  return (
    <div
      className="rounded-[12px] border border-line bg-surface p-4"
      style={{
        borderTopWidth: 3,
        borderTopColor: color === "bull" ? "var(--bull)" : "var(--bear)",
      }}
    >
      <div
        className={`flex items-center justify-between text-[12px] font-bold uppercase tracking-wide ${
          color === "bull" ? "text-bull" : "text-bear"
        }`}
      >
        <span>{side} case</span>
        <span className="mono text-faint">{conviction}/5</span>
      </div>
      <ul className="mt-3 mb-0 flex list-none flex-col gap-2 p-0 text-[14px] text-ink2">
        {points.map((p, i) => (
          <li key={i} className="flex gap-2">
            <span aria-hidden className={color === "bull" ? "text-bull" : "text-bear"}>
              •
            </span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
      {rebuttal ? (
        <p className="mt-3 mb-0 border-t border-dashed border-line pt-2 text-[13px] text-muted">
          <b>Rebuttal:</b> {rebuttal}
        </p>
      ) : null}
    </div>
  );
}
