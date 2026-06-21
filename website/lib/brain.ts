// Typed fetch wrappers for the FastAPI brain (reuse over HTTP — never rebuilt).
// Base URL from NEXT_PUBLIC_API_BASE (default the local dev brain on :8787).
// Every call degrades gracefully: a thrown BrainError carries a friendly message
// the UI can render as a state, never a crash.

import type {
  AuditRecord,
  Decision,
  HealthResult,
  OutOfScope,
  RiskBand,
  VerifyResult,
} from "./types";

export const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8787"
).replace(/\/$/, "");

export class BrainError extends Error {
  status: number;
  /** True when the brain ran the relevance gate (422 outOfScope) — not a real error. */
  outOfScope: boolean;
  constructor(message: string, status = 0, outOfScope = false) {
    super(message);
    this.name = "BrainError";
    this.status = status;
    this.outOfScope = outOfScope;
  }
}

const OFFLINE_MSG =
  "Can't reach the GlassBox engine. It may be waking up (~30s on a cold start) or offline. Try again in a moment.";

async function jsonFetch<T>(
  path: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<T> {
  const { timeoutMs = 45000, ...rest } = init || {};
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...rest,
      signal: ctrl.signal,
      headers: { "content-type": "application/json", ...(rest.headers || {}) },
    });
  } catch {
    clearTimeout(t);
    throw new BrainError(OFFLINE_MSG, 0);
  }
  clearTimeout(t);

  let body: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    // The relevance gate: 422 { outOfScope, message }.
    const oos = body as Partial<OutOfScope> | null;
    if (res.status === 422 && oos && oos.outOfScope) {
      throw new BrainError(
        oos.message || "That looks off-topic for GlassBox.",
        422,
        true,
      );
    }
    const detail =
      (body as { detail?: string; message?: string } | null)?.detail ||
      (body as { message?: string } | null)?.message ||
      `Request failed (HTTP ${res.status}).`;
    throw new BrainError(detail, res.status);
  }
  return body as T;
}

export function getHealth(): Promise<HealthResult> {
  return jsonFetch<HealthResult>("/api/health", { timeoutMs: 5000 });
}

export function getPubkey(): Promise<{ pubkey: string }> {
  return jsonFetch<{ pubkey: string }>("/api/pubkey", { timeoutMs: 5000 });
}

export interface AnalyzeArgs {
  goalText: string;
  asset?: string;
  risk?: RiskBand;
}

export function analyze(args: AnalyzeArgs): Promise<Decision> {
  return jsonFetch<Decision>("/api/analyze", {
    method: "POST",
    body: JSON.stringify({
      goalText: args.goalText,
      asset: args.asset || "SUI/USDC",
      risk: args.risk || "moderate",
    }),
  });
}

// POST /api/audit -> AuditRecord. The server keys the record by recordHash[:16]
// and returns recordId; we mirror that. recordCanonical is the exact hashed bytes.
export function audit(
  decision: Decision,
  goalText = "",
): Promise<AuditRecord> {
  return jsonFetch<AuditRecord>("/api/audit", {
    method: "POST",
    body: JSON.stringify({ decision, goalText }),
    timeoutMs: 60000,
  });
}

export function verify(recordId: string): Promise<VerifyResult> {
  return jsonFetch<VerifyResult>(
    `/api/verify/${encodeURIComponent(recordId)}`,
    { timeoutMs: 10000 },
  );
}
