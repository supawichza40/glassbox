"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { VerdictPill } from "@/components/VerdictPill";
import { CodeVsAISplitPanel } from "@/components/CodeVsAISplitPanel";
import { ReceiptCard } from "@/components/ReceiptCard";
import { InteractiveTamper } from "@/components/InteractiveTamper";
import { EmptyState } from "@/components/EmptyState";
import { CopyButton } from "@/components/CopyButton";
import { getRecord } from "@/lib/store";
import type { StoredRecord } from "@/lib/types";

export default function DecisionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  // undefined = still loading from the store; null = not found.
  const [rec, setRec] = useState<StoredRecord | null | undefined>(undefined);

  useEffect(() => {
    setRec(getRecord(id));
  }, [id]);

  if (rec === undefined) {
    return (
      <AppShell variant="app" maxWidth="app">
        <Card className="h-40 animate-pulse motion-reduce:animate-none" />
      </AppShell>
    );
  }

  if (!rec) {
    return (
      <AppShell variant="app" maxWidth="app">
        <EmptyState
          title="Record not found"
          description="This decision isn't in this browser. In the local demo, records live where they were created. Run a new analysis to produce one."
          glyph="◇"
          action={
            <Button href="/app/provider/new" variant="primary">
              Run new analysis
            </Button>
          }
        />
      </AppShell>
    );
  }

  const { decision, audit } = rec;
  const verifyUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/verify/${audit.recordId}`
      : `/verify/${audit.recordId}`;

  return (
    <AppShell variant="app" maxWidth="app">
      <div className="flex items-center gap-2 text-[13px] text-muted">
        <Link href="/app/provider" className="text-accent no-underline">
          Provider
        </Link>
        <span aria-hidden>/</span>
        <span>Decision</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <VerdictPill verdict={decision.verdict} size="md" />
        <span className="text-[15px] text-ink2">
          {rec.asset} · {rec.risk} risk
        </span>
      </div>
      {decision.whyResolved ? (
        <p className="mt-2 mb-0 max-w-[70ch] text-[14px] text-ink2">{decision.whyResolved}</p>
      ) : null}

      <div className="mt-6 flex flex-col gap-6">
        <section>
          <h2 className="mb-3 text-[16px] font-semibold text-ink2">
            Code computed vs. AI argued
          </h2>
          <CodeVsAISplitPanel decision={decision} />
        </section>

        <ReceiptCard audit={audit} />

        <section>
          <h2 className="mb-3 text-[16px] font-semibold text-ink2">Try to break it</h2>
          <InteractiveTamper
            recordCanonical={audit.recordCanonical}
            recordHash={audit.recordHash}
            verifiedBaseline
          />
        </section>

        <Card>
          <h3 className="m-0 text-[15px] font-bold text-ink">Share this proof</h3>
          <p className="mt-1 mb-3 text-[13px] text-muted">
            Anyone can independently verify it — no account, no GlassBox server in the trust
            path.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="mono max-w-full truncate rounded border border-line bg-well px-3 py-2 text-[13px] text-ink2">
              {verifyUrl}
            </code>
            <CopyButton value={verifyUrl} label="Copy link" />
            <Button href={`/verify/${audit.recordId}`} variant="secondary">
              Open verify page
            </Button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
