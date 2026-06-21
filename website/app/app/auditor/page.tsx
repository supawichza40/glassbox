"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { VerdictPill } from "@/components/VerdictPill";
import { listRecords, subscribe } from "@/lib/store";
import type { StoredRecord } from "@/lib/types";
import { relativeTime } from "@/lib/format";

export default function AuditorPage() {
  const router = useRouter();
  const [recs, setRecs] = useState<StoredRecord[]>([]);
  const [pasted, setPasted] = useState("");

  useEffect(() => {
    const load = () => setRecs(listRecords());
    load();
    return subscribe(load);
  }, []);

  function go(e: React.FormEvent) {
    e.preventDefault();
    // accept a bare id or a /verify/<id> link
    const id = pasted.trim().split("/").pop()?.split("?")[0] || "";
    if (id) router.push(`/verify/${encodeURIComponent(id)}`);
  }

  return (
    <AppShell variant="app" maxWidth="app">
      <h1 className="m-0 text-[30px] font-extrabold tracking-tight text-ink">Auditor</h1>
      <p className="mt-1 mb-6 max-w-[68ch] text-[15px] text-muted">
        Independently verify any record someone shares with you. Verification runs in your
        browser — no GlassBox server in the trust path.
      </p>

      <Card>
        <form onSubmit={go} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1">
            <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-muted">
              Record ID or verify link
            </span>
            <input
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder="paste a record id or a /verify/… link"
              className="mono w-full rounded-lg border border-line bg-surface2 px-3 py-2.5 text-[14px] text-ink focus-visible:outline-2 focus-visible:outline-accent"
            />
          </label>
          <Button type="submit" variant="primary">
            Verify
          </Button>
        </form>
      </Card>

      <h2 className="mt-7 text-[16px] font-semibold text-ink2">Records in this browser</h2>
      <div className="mt-3">
        {recs.length === 0 ? (
          <EmptyState
            title="Nothing to verify yet"
            description="When a provider shares a signed record with you, paste its link above to re-check it independently — or create one from the Provider seat."
            glyph="◈"
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {recs.map((r) => (
              <Link
                key={r.audit.recordId}
                href={`/verify/${r.audit.recordId}`}
                className="no-underline"
              >
                <Card className="transition-colors hover:border-[#3a4757]">
                  <div className="flex items-center justify-between gap-2">
                    <VerdictPill verdict={r.decision.verdict} size="sm" />
                    <span className="text-[12px] text-muted">{relativeTime(r.createdAt)}</span>
                  </div>
                  <p className="mt-2 mb-0 line-clamp-2 text-[14px] text-ink2">{r.goalText}</p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
