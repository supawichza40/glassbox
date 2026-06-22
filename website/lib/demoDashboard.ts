// Deterministic demo seed so the provider analytics dashboard is NEVER empty.
//
// Record #1 is the REAL anchored DEMO_RECORD (genuinely verifiable). Every other
// record is SYNTHETIC and carries `demo:true`; its id is in DEMO_IDS so the page
// renders synthetic rows as NON-clickable (a visitor is never routed to an
// un-verifiable hash in the store).
//
// CLAIM DISCIPLINE: activity + integrity only. NO PnL / returns / win-rate /
// accuracy fields anywhere in here.

import type { StoredRecord, Verdict, SignalBand, RiskBand } from "./types";
import { DEMO_RECORD } from "./demo";

// A StoredRecord plus the synthetic marker (kept optional so we don't edit types).
export type DemoStoredRecord = StoredRecord & { demo?: boolean };

function bandFor(pct: number): SignalBand {
  if (pct >= 67) return "High";
  if (pct >= 34) return "Medium";
  return "Low";
}

function daysAgo(n: number, hour = 12): number {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d.getTime() - n * 86_400_000;
}

interface Spec {
  id: string;
  asset: string;
  verdict: Verdict;
  signal: number;
  daysAgo: number;
  hour: number;
  walrus: boolean;
  risk: RiskBand;
  goalText: string;
  // transparency: did the AI depart from the rule-based baseline?
  baselineVerdict: Verdict;
  llmOverrodeSignals: boolean;
}

// 15 synthetic specs (record #1, the real demo, is prepended separately → 16 total).
// Verdict mix target over the full 16 (incl. real HOLD demo): ~5 BUY / 7 HOLD / 4 AVOID.
// Synthetic mix: 5 BUY / 6 HOLD / 4 AVOID. ~80% walrus. 3 overrides w/ differing baseline.
const SPECS: Spec[] = [
  // last 7 days — denser
  { id: "a1b2c3d4e5f60718", asset: "BTC/USDC", verdict: "BUY", signal: 78, daysAgo: 0, hour: 9, walrus: true, risk: "moderate", goalText: "Is BTC a good entry here on the pullback?", baselineVerdict: "HOLD", llmOverrodeSignals: true },
  { id: "b2c3d4e5f6071829", asset: "ETH/USDC", verdict: "HOLD", signal: 54, daysAgo: 0, hour: 15, walrus: true, risk: "moderate", goalText: "Should I keep my ETH through the upgrade?", baselineVerdict: "HOLD", llmOverrodeSignals: false },
  { id: "c3d4e5f607182930", asset: "SOL/USDC", verdict: "AVOID", signal: 41, daysAgo: 1, hour: 11, walrus: true, risk: "high", goalText: "Is SOL too risky to add right now?", baselineVerdict: "HOLD", llmOverrodeSignals: true },
  { id: "d4e5f60718293041", asset: "SUI/USDC", verdict: "BUY", signal: 71, daysAgo: 2, hour: 14, walrus: true, risk: "moderate", goalText: "SUI looks oversold — worth a starter position?", baselineVerdict: "BUY", llmOverrodeSignals: false },
  { id: "e5f6071829304152", asset: "BTC/USDC", verdict: "HOLD", signal: 60, daysAgo: 3, hour: 10, walrus: true, risk: "low", goalText: "Hold BTC into the macro print?", baselineVerdict: "HOLD", llmOverrodeSignals: false },
  { id: "f607182930415263", asset: "ETH/USDC", verdict: "BUY", signal: 83, daysAgo: 4, hour: 16, walrus: false, risk: "moderate", goalText: "Add to ETH on this strength?", baselineVerdict: "HOLD", llmOverrodeSignals: true },
  { id: "0718293041526374", asset: "SOL/USDC", verdict: "HOLD", signal: 47, daysAgo: 5, hour: 13, walrus: true, risk: "moderate", goalText: "Trim or hold my SOL bag?", baselineVerdict: "HOLD", llmOverrodeSignals: false },
  { id: "1829304152637485", asset: "SUI/USDC", verdict: "AVOID", signal: 29, daysAgo: 6, hour: 11, walrus: true, risk: "high", goalText: "Is now a bad time to chase SUI?", baselineVerdict: "AVOID", llmOverrodeSignals: false },
  // 8–30 days — sparser
  { id: "2930415263748596", asset: "BTC/USDC", verdict: "HOLD", signal: 56, daysAgo: 9, hour: 12, walrus: true, risk: "low", goalText: "Stay the course on BTC?", baselineVerdict: "HOLD", llmOverrodeSignals: false },
  { id: "304152637485a6b7", asset: "ETH/USDC", verdict: "BUY", signal: 69, daysAgo: 12, hour: 10, walrus: true, risk: "moderate", goalText: "Is ETH setting up for a move?", baselineVerdict: "BUY", llmOverrodeSignals: false },
  { id: "4152637485a6b7c8", asset: "SOL/USDC", verdict: "AVOID", signal: 33, daysAgo: 15, hour: 14, walrus: false, risk: "high", goalText: "Avoid SOL until trend confirms?", baselineVerdict: "AVOID", llmOverrodeSignals: false },
  { id: "52637485a6b7c8d9", asset: "SUI/USDC", verdict: "HOLD", signal: 52, daysAgo: 18, hour: 11, walrus: true, risk: "moderate", goalText: "Hold SUI through consolidation?", baselineVerdict: "HOLD", llmOverrodeSignals: false },
  { id: "637485a6b7c8d9e0", asset: "BTC/USDC", verdict: "BUY", signal: 74, daysAgo: 21, hour: 15, walrus: true, risk: "moderate", goalText: "Dip-buy BTC at support?", baselineVerdict: "HOLD", llmOverrodeSignals: false },
  { id: "7485a6b7c8d9e0f1", asset: "ETH/USDC", verdict: "HOLD", signal: 45, daysAgo: 25, hour: 13, walrus: true, risk: "low", goalText: "Just hold ETH and ignore noise?", baselineVerdict: "HOLD", llmOverrodeSignals: false },
  { id: "85a6b7c8d9e0f102", asset: "SOL/USDC", verdict: "AVOID", signal: 18, daysAgo: 29, hour: 10, walrus: false, risk: "high", goalText: "Steer clear of SOL after the dump?", baselineVerdict: "AVOID", llmOverrodeSignals: false },
];

const DEMO_ID_SET = new Set(SPECS.map((s) => s.id));

/** Synthetic-record id set — used by the page to render those rows non-clickable. */
export function isDemoSyntheticId(id: string): boolean {
  return DEMO_ID_SET.has(id);
}

export const DEMO_IDS = DEMO_ID_SET;

function synthRecord(s: Spec): DemoStoredRecord {
  const iso = new Date(daysAgo(s.daysAgo, s.hour)).toISOString();
  return {
    demo: true,
    goalText: s.goalText,
    asset: s.asset,
    risk: s.risk,
    createdAt: daysAgo(s.daysAgo, s.hour),
    decision: {
      asset: s.asset,
      timestampIso: iso,
      inputs: { asOfIso: iso },
      bull: { points: [], convictionRevised: s.verdict === "BUY" ? 4 : 2, rebuttal: "" },
      bear: { points: [], convictionRevised: s.verdict === "AVOID" ? 4 : 2, rebuttal: "" },
      winningSide: s.verdict === "AVOID" ? "bear" : "bull",
      whyResolved: null,
      verdict: s.verdict,
      riskNote: null,
      suggestedSizePct: 0,
      signalStrengthPct: s.signal,
      signalBand: bandFor(s.signal),
      counterfactual: null,
      blindSpots: [],
      flags: {
        llmOverrodeSignals: s.llmOverrodeSignals,
        baselineVerdict: s.baselineVerdict,
        groundingWarnings: [],
        defaultedInputs: [],
      },
      provenance: { provider: "gemini", fastModel: "gemini-2.5-flash", smartModel: "gemini-2.5-flash" },
    },
    audit: {
      recordId: s.id,
      recordHash: s.id + "deadbeefcafef00d".repeat(3),
      signature: "00".repeat(64),
      pubkey: "c0eac67421c64b3328727a1649a38ba5d90c1267ccedbf0f3aa55d1c3a6263ab",
      sink: s.walrus ? "walrus" : "local",
      blobId: s.walrus ? "blob_" + s.id : null,
      anchorTxDigest: null,
      suiObjectId: s.walrus ? "0x" + s.id + "0".repeat(48) : null,
      anchorEpoch: s.walrus ? 437 - s.daysAgo : null,
      anchorNetwork: s.walrus ? "sui:testnet" : null,
      recordCanonical: "{}",
    },
  };
}

/**
 * ~16 demo records spread over the last ~30 days. Record #1 is the REAL anchored
 * DEMO_RECORD (verifiable); the rest are synthetic (demo:true). Newest first.
 */
export function demoRecords(): DemoStoredRecord[] {
  const real: DemoStoredRecord = { ...(DEMO_RECORD as StoredRecord), createdAt: daysAgo(0, 18) };
  const synth = SPECS.map(synthRecord);
  return [real, ...synth].sort((a, b) => b.createdAt - a.createdAt);
}
