// Shared types mirroring the FastAPI brain's HTTP contract.
// Source of truth: server/glassbox/decision.py, audit.py, main.py.
// Keep field names EXACT — the interactive tamper hashes recordCanonical byte-for-byte.

export type Verdict = "BUY" | "HOLD" | "AVOID";
export type SignalBand = "Low" | "Medium" | "High";
export type RiskBand = "low" | "moderate" | "high";

export interface DecisionSide {
  points: string[];
  convictionRevised: number; // 0..5
  rebuttal: string;
}

export interface DecisionFlags {
  llmOverrodeSignals: boolean;
  baselineVerdict: Verdict;
  groundingWarnings: string[];
  defaultedInputs: string[];
}

// The Decision returned by POST /api/analyze. `inputs` is an open enum bag
// (rsi14, trendPctVs20MA, realizedVolPercentile, asOfIso, …) — kept loose on purpose.
export interface Decision {
  asset: string;
  timestampIso: string | null;
  inputs: Record<string, unknown>;
  bull: DecisionSide;
  bear: DecisionSide;
  winningSide: "bull" | "bear" | null;
  whyResolved: string | null;
  verdict: Verdict;
  riskNote: string | null;
  suggestedSizePct: number;
  signalStrengthPct: number;
  signalBand: SignalBand;
  counterfactual: string | null;
  blindSpots: string[];
  flags: DecisionFlags;
  provenance: { provider: string; fastModel: string; smartModel: string };
  // chartSeries is presentation-only and stripped before hashing — never required.
  chartSeries?: unknown;
}

// 422 body when the input is off-topic (the relevance gate).
export interface OutOfScope {
  outOfScope: true;
  message: string;
}

// The AuditRecord returned by POST /api/audit.
export interface AuditRecord {
  recordId: string;
  recordHash: string;
  signature: string;
  pubkey: string;
  sink: string; // "walrus" | "local"
  blobId: string | null;
  anchorTxDigest: string | null;
  suiObjectId: string | null;
  anchorEpoch: number | null;
  anchorNetwork: string | null;
  recordCanonical: string; // EXACT bytes that were hashed (PII-free)
}

// GET /api/verify/{id}
export interface VerifyResult {
  hashMatch: boolean;
  signatureValid: boolean;
  error?: string;
}

export interface HealthResult {
  ok: boolean;
  provider: string;
  fastModel: string;
  smartModel: string;
  auditSink: string;
  anchor: string;
  execution: string;
  demoMode: boolean;
}

// What we persist locally so /d/[id] and /verify/[id] render without a DB.
export interface StoredRecord {
  decision: Decision;
  audit: AuditRecord;
  goalText: string;
  asset: string;
  risk: RiskBand;
  createdAt: number; // epoch ms
}
