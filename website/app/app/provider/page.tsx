"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { VerdictPill } from "@/components/VerdictPill";
import { StatTile } from "@/components/charts/StatTile";
import { ThroughputArea } from "@/components/charts/ThroughputArea";
import { VerdictDonut } from "@/components/charts/VerdictDonut";
import { SignalHistogram } from "@/components/charts/SignalHistogram";
import { AnchoredGauge } from "@/components/charts/AnchoredGauge";
import { AgreementBar } from "@/components/charts/AgreementBar";
import { listRecords, subscribe } from "@/lib/store";
import { listVerifyEvents } from "@/lib/verifyEvents";
import { demoRecords, isDemoSyntheticId } from "@/lib/demoDashboard";
import {
  computeScorecard,
  decisionsOverTime,
  verdictMix,
  signalDistribution,
  anchoredFraction,
  baselineAgreement,
} from "@/lib/dashboardMetrics";
import type { StoredRecord } from "@/lib/types";
import { relativeTime, shortHash } from "@/lib/format";

// Merge the deterministic demo seed with the visitor's real session records,
// deduped by recordId (real records win — they stay genuinely verifiable).
function mergeRecords(real: StoredRecord[]): StoredRecord[] {
  const byId = new Map<string, StoredRecord>();
  for (const r of demoRecords()) byId.set(r.audit.recordId, r);
  for (const r of real) byId.set(r.audit.recordId, r); // real overwrites synthetic
  return Array.from(byId.values()).sort((a, b) => b.createdAt - a.createdAt);
}

export default function ProviderDashboard() {
  const [records, setRecords] = useState<StoredRecord[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const load = () => {
      setRecords(mergeRecords(listRecords()));
      setReady(true);
    };
    load();
    return subscribe(load);
  }, []);

  const events = useMemo(() => (ready ? listVerifyEvents() : []), [ready]);

  const score = useMemo(() => computeScorecard(records, events), [records, events]);
  const throughput = useMemo(() => decisionsOverTime(records, 30), [records]);
  const mix = useMemo(() => verdictMix(records), [records]);
  const dist = useMemo(() => signalDistribution(records), [records]);
  const anchored = useMemo(() => anchoredFraction(records), [records]);
  const agreement = useMemo(() => baselineAgreement(records), [records]);

  const n = records.length;
  const cap = `last 30 days · n=${n}`;

  return (
    <AppShell variant="app" maxWidth="app">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="m-0 text-[30px] font-extrabold tracking-tight text-ink">Provider</h1>
          <p className="mt-1 mb-0 text-[15px] text-muted">
            Activity, integrity, and verification across your signed, anchored decisions.
          </p>
        </div>
        <Button href="/app/provider/new" variant="primary" size="lg">
          + Run new analysis
        </Button>
      </div>

      {!ready ? (
        <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="h-28 animate-pulse motion-reduce:animate-none" />
          ))}
        </div>
      ) : n === 0 ? (
        <section className="mt-7">
          <EmptyState
            title="No decisions yet"
            description="Run your first analysis to produce a signed, anchored record. It will appear here and be independently verifiable."
            glyph="◇"
            action={
              <Button href="/app/provider/new" variant="primary">
                Run new analysis
              </Button>
            }
          />
        </section>
      ) : (
        <>
          {/* ── SECTION A — scorecard ───────────────────────────── */}
          <section className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Signed decisions" value={score.signedDecisions} sub="cryptographically signed" />
            <StatTile
              label="Anchored on-chain"
              value={score.anchoredPct}
              suffix="%"
              tone="accent"
              hero
              sub={`${score.anchoredCount}/${score.signedDecisions} on Walrus + Sui`}
            />
            <StatTile label="Independently verified" value={score.independentlyVerified} tone="brand" sub="unique records re-checked" />
            <StatTile label="Tamper attempts caught" value={score.tamperCaught} tone={score.tamperCaught > 0 ? "bear" : "ink"} sub="hash mismatches flagged" />
          </section>

          <div className="mono mt-2 text-[11px] text-faint">
            Avg signal strength {score.avgSignalStrength}% — conviction, not accuracy.
          </div>

          {/* ── SECTION B — charts ──────────────────────────────── */}
          <section className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ThroughputArea data={throughput} caption={cap} />
            </div>
            <VerdictDonut data={mix} caption={cap} />

            <div className="lg:col-span-2">
              <SignalHistogram data={dist} caption={`${cap} · 5 bins`} />
            </div>
            <AnchoredGauge pct={anchored.pct} anchored={anchored.anchored} total={anchored.total} caption={cap} />

            <div className="lg:col-span-3">
              <AgreementBar data={agreement} caption={cap} />
            </div>
          </section>

          {/* ── SECTION C — recent decisions ────────────────────── */}
          <section className="mt-7">
            <h2 className="text-[16px] font-semibold text-ink2">Recent decisions</h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {records.map((r) => {
                const synthetic = isDemoSyntheticId(r.audit.recordId);
                const body = (
                  <Card className={synthetic ? "" : "transition-colors hover:border-line-strong"}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <VerdictPill verdict={r.decision.verdict} size="sm" />
                          <span className="text-[13px] text-muted">{r.asset}</span>
                          {synthetic && (
                            <span className="mono rounded-full border border-line px-1.5 py-0.5 text-[10px] text-faint">
                              demo
                            </span>
                          )}
                        </div>
                        <p className="mt-2 mb-0 line-clamp-2 text-[14px] text-ink2">
                          {r.goalText || "Untitled analysis"}
                        </p>
                      </div>
                      <span className="shrink-0 text-[12px] text-muted">{relativeTime(r.createdAt)}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[12px] text-muted">
                      <span className="mono">{shortHash(r.audit.recordHash, 10, 6)}</span>
                      <span>Signal {r.decision.signalStrengthPct}% · {r.decision.signalBand}</span>
                    </div>
                  </Card>
                );
                // Synthetic demo rows are non-clickable — they aren't in the store,
                // so a /d/[id] link would 404 (and route a visitor to an
                // un-verifiable hash). Only real records link out.
                return synthetic ? (
                  <div key={r.audit.recordId}>{body}</div>
                ) : (
                  <Link key={r.audit.recordId} href={`/app/provider/d/${r.audit.recordId}`} className="no-underline">
                    {body}
                  </Link>
                );
              })}
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}
