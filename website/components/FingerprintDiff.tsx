import { cn } from "@/lib/cn";
import { diffCharsHtml } from "@/lib/crypto";

// Shows the anchored fingerprint vs the live (recomputed) one, 4-char chunked,
// with changed characters glowing red (via .gb-diff-char). Pure presentation:
// the parent computes liveHash from the edited record and passes both in.

interface FingerprintDiffProps {
  anchoredHash: string;
  liveHash: string;
  className?: string;
}

export function FingerprintDiff({ anchoredHash, liveHash, className }: FingerprintDiffProps) {
  const match = anchoredHash === liveHash;
  // Per-char diff (monospace, wraps). 4-char grouping is applied to the plain
  // anchored line; the live line keeps the per-char diff so changed chars glow.
  const liveHtml = diffCharsHtml(anchoredHash, liveHash);
  const anchoredChunked = (anchoredHash.match(/.{1,4}/g) || [anchoredHash]).join(" ");

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="rounded-lg border border-line bg-well p-3">
        <div className="mb-1 text-[12px] uppercase tracking-wide text-muted">
          Anchored fingerprint (sha-256)
        </div>
        <div className="mono break-all text-[13px] leading-relaxed text-ink2">
          {anchoredChunked}
        </div>
      </div>
      <div
        className={cn(
          "rounded-lg border bg-well p-3",
          match ? "border-bull/50" : "border-bear/60 border-dashed",
        )}
      >
        <div className="mb-1 flex items-center gap-2 text-[12px] uppercase tracking-wide text-muted">
          This record&apos;s fingerprint
          <span className={cn("font-bold", match ? "text-bull" : "text-bear")}>
            {match ? "✓ match" : "✗ differs"}
          </span>
        </div>
        <div
          className="mono break-all text-[13px] leading-relaxed text-ink2"
          // diffCharsHtml only emits a fixed safe span class — no user HTML.
          dangerouslySetInnerHTML={{ __html: liveHtml }}
        />
      </div>
    </div>
  );
}
