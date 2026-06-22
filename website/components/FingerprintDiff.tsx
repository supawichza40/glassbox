"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { diffCharsHtml } from "@/lib/crypto";

// Shows the anchored fingerprint vs the live (recomputed) one, 4-char chunked,
// with changed characters glowing red (via .gb-diff-char). The parent computes
// liveHash from the edited record and passes both in. On a mismatch, the changed
// chars ignite left-to-right (a fuse) via the Web Animations API.

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
  const liveRef = useRef<HTMLDivElement>(null);

  // Stagger the ignite of each changed char into a left-to-right fuse.
  useEffect(() => {
    const host = liveRef.current;
    if (!host) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const chars = host.querySelectorAll<HTMLElement>(".gb-diff-char");
    chars.forEach((el, i) => {
      el.animate(
        [
          { color: "var(--ink2)", textShadow: "none", transform: "translateY(0)" },
          {
            color: "#fff",
            textShadow: "0 0 10px var(--bear)",
            transform: "translateY(-1px) scale(1.18)",
            offset: 0.4,
          },
          {
            color: "var(--bear)",
            textShadow: "0 0 6px rgba(255,77,94,.55)",
            transform: "none",
          },
        ],
        {
          delay: i * 45,
          duration: 360,
          easing: "cubic-bezier(.16,1,.3,1)",
          fill: "both",
        },
      );
    });
  }, [liveHtml]);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="rounded-lg border border-line bg-well p-3 elev-1">
        <div className="mb-1 text-[12px] uppercase tracking-wide text-muted">
          Anchored fingerprint (sha-256)
        </div>
        <div className="mono break-all text-[13px] leading-relaxed text-ink2">
          {anchoredChunked}
        </div>
      </div>
      <div
        className={cn(
          "rounded-lg border bg-well p-3 elev-1",
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
          ref={liveRef}
          className="mono break-all text-[13px] leading-relaxed text-ink2"
          // diffCharsHtml only emits a fixed safe span class — no user HTML.
          dangerouslySetInnerHTML={{ __html: liveHtml }}
        />
      </div>
    </div>
  );
}
