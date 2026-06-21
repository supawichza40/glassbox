"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fieldDiff,
  isSecureCryptoContext,
  prettyVal,
  sha256Hex,
  tamperOneChar,
  type FieldDiffRow,
} from "@/lib/crypto";
import { Button } from "./Button";
import { FingerprintDiff } from "./FingerprintDiff";
import { TamperBanner } from "./TamperBanner";

// REAL client-side tamper: edit recordCanonical -> recompute SHA-256 (Web Crypto)
// -> compare to recordHash -> TAMPER DETECTED. Mirrors verify.html exactly.
//
// `verifiedBaseline` controls the MATCH banner copy: when the record was
// independently verified (signature + (optional) Walrus), a match says VERIFIED;
// otherwise it says MATCHES (the hash lines up on this device).

interface InteractiveTamperProps {
  recordCanonical: string;
  recordHash: string;
  /** When true, a hash MATCH shows "VERIFIED"; else "MATCHES". */
  verifiedBaseline?: boolean;
  className?: string;
}

export function InteractiveTamper({
  recordCanonical,
  recordHash,
  verifiedBaseline = false,
  className,
}: InteractiveTamperProps) {
  const [value, setValue] = useState(recordCanonical);
  const [liveHash, setLiveHash] = useState(recordHash);
  const [rows, setRows] = useState<FieldDiffRow[]>([]);
  const [diffNote, setDiffNote] = useState<string | null>(null);
  const [secure, setSecure] = useState(true);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setSecure(isSecureCryptoContext());
  }, []);

  // keep in sync if the record prop changes (e.g. after a fresh audit)
  useEffect(() => {
    setValue(recordCanonical);
    setLiveHash(recordHash);
    setRows([]);
    setDiffNote(null);
  }, [recordCanonical, recordHash]);

  const recompute = useCallback(
    async (text: string) => {
      if (!isSecureCryptoContext()) return;
      const h = await sha256Hex(text);
      setLiveHash(h);
      if (h === recordHash) {
        setRows([]);
        setDiffNote(null);
        return;
      }
      try {
        const r = fieldDiff(recordCanonical, text);
        if (r.length) {
          setRows(r.slice(0, 8));
          setDiffNote(null);
        } else {
          setRows([]);
          setDiffNote(
            "Whitespace or formatting changed — the bytes differ, so the fingerprint no longer matches.",
          );
        }
      } catch {
        setRows([]);
        setDiffNote(
          "The record is no longer valid JSON — so it can't be the record that was signed.",
        );
      }
    },
    [recordCanonical, recordHash],
  );

  function onEdit(text: string) {
    setValue(text);
    void recompute(text);
  }

  function tamperForMe() {
    const next = tamperOneChar(value);
    onEdit(next);
    taRef.current?.focus();
  }

  function reset() {
    onEdit(recordCanonical);
  }

  const match = liveHash === recordHash;

  const banner = useMemo(() => {
    if (match) {
      return verifiedBaseline
        ? {
            status: "verified" as const,
            headline: "VERIFIED",
            sub: "This record matches its anchored fingerprint, byte for byte, and was signed by the published key.",
          }
        : {
            status: "neutral" as const,
            headline: "MATCHES",
            sub: "The record hashes to the anchored fingerprint on this device. Connect to re-check it against the Walrus copy and the published signature.",
          };
    }
    return {
      status: "tamper" as const,
      headline: "TAMPER DETECTED",
      sub: "The fingerprint no longer matches what was anchored. Even a single changed character breaks it.",
    };
  }, [match, verifiedBaseline]);

  if (!secure) {
    return (
      <div className={className}>
        <TamperBanner
          status="warn"
          headline="NEEDS A SECURE (HTTPS) CONNECTION"
          sub="Your browser only allows in-page cryptographic verification over HTTPS or on localhost. The underlying record is real either way."
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <TamperBanner status={banner.status} headline={banner.headline} sub={banner.sub} />

      <div className="mt-4">
        <label className="mb-1.5 block text-[13px] text-muted">
          The signed record — change <b className="text-ink2">any single character</b>{" "}
          and watch the fingerprint break. Put it back and it verifies again.
        </label>
        <textarea
          ref={taRef}
          value={value}
          spellCheck={false}
          onChange={(e) => onEdit(e.target.value)}
          aria-label="The signed record — edit any character to tamper with it"
          className="gb-scroll mono h-48 w-full resize-y rounded-lg border border-line bg-well p-3 text-[12.5px] leading-relaxed text-ink2 focus-visible:outline-2 focus-visible:outline-accent"
        />
      </div>

      <div className="mt-4">
        <FingerprintDiff anchoredHash={recordHash} liveHash={liveHash} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="danger" onClick={tamperForMe}>
          Alter one character for me
        </Button>
        <Button variant="ghost" onClick={reset}>
          Reset — put it back
        </Button>
      </div>

      {!match ? (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-bear/50 border-dashed bg-bear/10 p-4"
        >
          <div className="mb-2 text-[13px] font-bold text-bear">
            What changed
          </div>
          {rows.length ? (
            <div className="flex flex-col gap-1.5">
              {rows.map((r) => (
                <div
                  key={r.field}
                  className="flex flex-wrap items-center gap-2 text-[13px]"
                >
                  <span className="mono text-ink2">{r.field}</span>
                  <span className="mono text-bear/80 line-through">
                    {prettyVal(r.old)}
                  </span>
                  <span aria-hidden className="text-muted">
                    →
                  </span>
                  <span className="mono text-ink">{prettyVal(r.now)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="m-0 text-[13px] text-ink2">{diffNote}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
