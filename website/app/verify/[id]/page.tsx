"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { VerdictPill } from "@/components/VerdictPill";
import { ReceiptCard } from "@/components/ReceiptCard";
import { InteractiveTamper } from "@/components/InteractiveTamper";
import { EmptyState } from "@/components/EmptyState";
import { getRecord } from "@/lib/store";
import type { StoredRecord } from "@/lib/types";

// Public, auth-free (proxy.ts only guards /app/*). Full-bleed verify template.
export default function VerifyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [rec, setRec] = useState<StoredRecord | null | undefined>(undefined);

  useEffect(() => {
    setRec(getRecord(id));
  }, [id]);

  return (
    <AppShell variant="bare" maxWidth="verify">
      <h1 className="m-0 text-[24px] font-extrabold text-ink">Independent verification</h1>
      <p className="mt-1 mb-5 max-w-[60ch] text-[15px] text-ink2">
        Re-check this signed AI decision on your own device — recompute the fingerprint and
        compare it to what was anchored. No GlassBox server in the trust path.
      </p>

      {rec === undefined ? (
        <Card className="h-40 animate-pulse motion-reduce:animate-none" />
      ) : !rec ? (
        <EmptyState
          title="No record in this browser"
          description="In the local demo, a record is verifiable in the browser where it was created. Create one in the demo, then open its verify link here."
          glyph="🔎"
          action={
            <Button href="/login" variant="primary">
              Try the live demo
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-5">
          <Card>
            <div className="flex flex-wrap items-center gap-3">
              <VerdictPill verdict={rec.decision.verdict} size="md" />
              <span className="text-[14px] text-muted">
                {rec.asset} · Signal {rec.decision.signalStrengthPct}% · {rec.decision.signalBand}
              </span>
            </div>
          </Card>

          <ReceiptCard audit={rec.audit} />

          <InteractiveTamper
            recordCanonical={rec.audit.recordCanonical}
            recordHash={rec.audit.recordHash}
            verifiedBaseline
          />

          <p className="text-center text-[13px] text-muted">
            <Link href="/login" className="text-accent no-underline">
              Create signed records of your own →
            </Link>
          </p>
        </div>
      )}
    </AppShell>
  );
}
