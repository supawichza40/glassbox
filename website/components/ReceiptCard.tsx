import type { AuditRecord } from "@/lib/types";
import { cn } from "@/lib/cn";
import { chunk4, shortHash } from "@/lib/format";
import { CopyButton } from "./CopyButton";

// Default explorer roots (match the brain's config defaults).
const WALRUS_AGG = "https://aggregator.walrus-testnet.walrus.space";
const SUI_EXPLORER = "https://suiscan.xyz/testnet";

interface ReceiptCardProps {
  audit: AuditRecord;
  /** Override explorer roots if the receipt carries its own. */
  walrusAggregator?: string;
  suiExplorer?: string;
  className?: string;
}

function Row({
  label,
  children,
  copy,
}: {
  label: string;
  children: React.ReactNode;
  copy?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line/70 py-2.5 last:border-0">
      <span className="shrink-0 text-[13px] text-muted">{label}</span>
      <span className="flex min-w-0 items-center gap-2">
        <span className="mono truncate text-[13px] text-ink">{children}</span>
        {copy ? <CopyButton value={copy} /> : null}
      </span>
    </div>
  );
}

export function ReceiptCard({
  audit,
  walrusAggregator = WALRUS_AGG,
  suiExplorer = SUI_EXPLORER,
  className,
}: ReceiptCardProps) {
  const anchored = audit.sink === "walrus" && !!audit.suiObjectId;
  const blobUrl =
    audit.sink === "walrus" && audit.blobId
      ? `${walrusAggregator.replace(/\/$/, "")}/v1/blobs/${audit.blobId}`
      : null;
  const objUrl = audit.suiObjectId
    ? `${suiExplorer.replace(/\/$/, "")}/object/${audit.suiObjectId}`
    : null;

  return (
    <div
      className={cn(
        "rounded-[14px] border border-line bg-well p-4 sm:p-5 elev-1",
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="m-0 text-[12px] font-bold uppercase tracking-wide text-muted">
          Signed receipt
        </h3>
        {/* Honest sink chip: color + word + glyph. Never render un-anchored as anchored. */}
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12px] font-semibold",
            anchored
              ? "border-accent/60 bg-accent/10 text-accent"
              : "border-warn/60 bg-warn/10 text-warn",
          )}
        >
          <span aria-hidden>{anchored ? "⛓" : "◷"}</span>
          {anchored ? "Walrus · Sui testnet" : "Local (not anchored)"}
        </span>
      </div>

      <div className="flex flex-col">
        <Row label="Record hash (sha-256)" copy={audit.recordHash}>
          {shortHash(audit.recordHash, 16, 8)}
        </Row>
        <Row label="Signature (ed25519)" copy={audit.signature}>
          {shortHash(audit.signature, 16, 8)}
        </Row>
        <Row label="Public key" copy={audit.pubkey}>
          {shortHash(audit.pubkey, 16, 8)}
        </Row>
        <Row label="Blob ID" copy={audit.blobId || undefined}>
          {blobUrl ? (
            <a href={blobUrl} target="_blank" rel="noreferrer" className="text-accent">
              {shortHash(audit.blobId, 12, 6)}
            </a>
          ) : (
            shortHash(audit.blobId, 12, 6)
          )}
        </Row>
        <Row label="Sui object (anchor)" copy={audit.suiObjectId || undefined}>
          {objUrl ? (
            <a href={objUrl} target="_blank" rel="noreferrer" className="text-accent">
              {shortHash(audit.suiObjectId, 12, 6)}
            </a>
          ) : (
            shortHash(audit.suiObjectId, 12, 6)
          )}
        </Row>
        {audit.anchorEpoch != null ? (
          <Row label="Storage epoch">{String(audit.anchorEpoch)}</Row>
        ) : null}
      </div>

      <p className="mt-3 mb-0 text-[13px] leading-snug text-muted">
        The signature proves <b>origin</b>; the Sui object is the on-chain{" "}
        <b>anchor</b> (a storage epoch, not a wall-clock timestamp). This is{" "}
        <b>tamper-evident</b>, not tamper-proof.
      </p>

      {/* keep chunk4 available for full-width fingerprint readouts elsewhere */}
      <span className="sr-only mono">{chunk4(audit.recordHash)}</span>
    </div>
  );
}
