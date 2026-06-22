"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { VerdictPill } from "@/components/VerdictPill";
import { listRecords, subscribe } from "@/lib/store";
import type { StoredRecord } from "@/lib/types";
import { relativeTime, shortHash } from "@/lib/format";

export default function ProviderDashboard() {
  const [records, setRecords] = useState<StoredRecord[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const load = () => {
      setRecords(listRecords());
      setReady(true);
    };
    load();
    return subscribe(load);
  }, []);

  return (
    <AppShell variant="app" maxWidth="app">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="m-0 text-[30px] font-extrabold tracking-tight text-ink">
            Provider
          </h1>
          <p className="mt-1 mb-0 text-[15px] text-muted">
            Run an analysis, then anchor a tamper-evident record anyone can verify.
          </p>
        </div>
        <Button href="/app/provider/new" variant="primary" size="lg">
          + Run new analysis
        </Button>
      </div>

      <section className="mt-7">
        <h2 className="text-[16px] font-semibold text-ink2">Recent decisions</h2>
        <div className="mt-3">
          {!ready ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="h-24 animate-pulse motion-reduce:animate-none" />
              <Card className="h-24 animate-pulse motion-reduce:animate-none" />
            </div>
          ) : records.length === 0 ? (
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
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {records.map((r) => (
                <Link
                  key={r.audit.recordId}
                  href={`/app/provider/d/${r.audit.recordId}`}
                  className="no-underline"
                >
                  <Card className="transition-colors hover:border-line-strong">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <VerdictPill verdict={r.decision.verdict} size="sm" />
                          <span className="text-[13px] text-muted">
                            {r.asset}
                          </span>
                        </div>
                        <p className="mt-2 mb-0 line-clamp-2 text-[14px] text-ink2">
                          {r.goalText || "Untitled analysis"}
                        </p>
                      </div>
                      <span className="shrink-0 text-[12px] text-muted">
                        {relativeTime(r.createdAt)}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[12px] text-muted">
                      <span className="mono">
                        {shortHash(r.audit.recordHash, 10, 6)}
                      </span>
                      <span>
                        Signal {r.decision.signalStrengthPct}% ·{" "}
                        {r.decision.signalBand}
                      </span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
