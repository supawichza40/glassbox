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
import { DEMO_RECORD } from "@/lib/demo";
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
    // Session records live in the store; /verify/demo falls back to a real seeded record.
    setRec(getRecord(id) ?? (id === "demo" ? DEMO_RECORD : null));
  }, [id]);

  return (
    <AppShell variant="bare" maxWidth="verify">
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
          {/* Lead with the result: the VERIFIED banner + the live tamper widget. */}
          <Card className="glow-evidence">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <VerdictPill verdict={rec.decision.verdict} size="md" />
              <span className="text-[14px] text-muted">
                {rec.asset} · Signal {rec.decision.signalStrengthPct}% · {rec.decision.signalBand}
              </span>
            </div>
            <InteractiveTamper
              recordCanonical={rec.audit.recordCanonical}
              recordHash={rec.audit.recordHash}
              verifiedBaseline
            />
          </Card>

          {/* Explainer + receipt second. */}
          <div>
            <h1 className="m-0 text-[20px] font-extrabold text-ink">
              How this verification works
            </h1>
            <p className="mt-1 mb-0 max-w-[60ch] text-[14px] text-ink2">
              The check above ran on your own device — it recomputed the
              fingerprint and compared it to what was anchored. No GlassBox server
              in the trust path.
            </p>
          </div>

          <ReceiptCard audit={rec.audit} />

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
