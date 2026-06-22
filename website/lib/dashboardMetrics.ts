// Pure reductions over StoredRecord[] (+ VerifyEvent[]) for the provider dashboard.
//
// CLAIM DISCIPLINE (hard): EVIDENCE product, not trading. Every metric here is
// ACTIVITY, INTEGRITY, or VERIFICATION — there is NO PnL, return, win-rate, or
// "AI accuracy" anywhere. Verdict mix is reported NEUTRALLY (BUY is not a "win").

import type { StoredRecord, Verdict } from "./types";
import type { VerifyEvent } from "./verifyEvents";

export interface Scorecard {
  signedDecisions: number;
  anchoredPct: number; // 0..100, records anchored on-chain / total
  anchoredCount: number;
  independentlyVerified: number; // unique recordIds with a successful verify
  tamperCaught: number; // verify events with hashMatch === false
  avgSignalStrength: number; // "conviction, not accuracy"
}

export interface DayBucket {
  /** epoch ms at local midnight of the day */
  day: number;
  label: string; // short e.g. "6/14"
  count: number;
  cumulative: number;
}

export interface VerdictMix {
  verdict: Verdict;
  count: number;
}

export interface SignalBin {
  label: string; // "0–20" ...
  lo: number;
  hi: number;
  count: number;
}

export interface AgreementMix {
  agreed: number; // baselineVerdict === verdict
  overrode: number; // AI departed from the rule-based baseline
}

function isAnchored(r: StoredRecord): boolean {
  return r.audit.sink === "walrus" && !!r.audit.suiObjectId;
}

/** SCORECARD — the four (+1) headline tiles. */
export function computeScorecard(
  records: StoredRecord[],
  events: VerifyEvent[],
): Scorecard {
  const signedDecisions = records.length;
  const anchoredCount = records.filter(isAnchored).length;
  const anchoredPct = signedDecisions === 0 ? 0 : Math.round((anchoredCount / signedDecisions) * 100);

  const verifiedIds = new Set<string>();
  let tamperCaught = 0;
  for (const e of events) {
    if (e.hashMatch === false) tamperCaught += 1;
    else if (e.hashMatch === true) verifiedIds.add(e.recordId);
  }

  const sumSignal = records.reduce((acc, r) => acc + (r.decision.signalStrengthPct || 0), 0);
  const avgSignalStrength = signedDecisions === 0 ? 0 : Math.round(sumSignal / signedDecisions);

  return {
    signedDecisions,
    anchoredPct,
    anchoredCount,
    independentlyVerified: verifiedIds.size,
    tamperCaught,
    avgSignalStrength,
  };
}

/** C1 — decisions over time, bucketed by day across `days` days (oldest→newest). */
export function decisionsOverTime(records: StoredRecord[], days = 30): DayBucket[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const todayMid = now.getTime();
  const buckets: DayBucket[] = [];
  const counts = new Map<number, number>();

  for (const r of records) {
    const d = new Date(r.createdAt);
    d.setHours(0, 0, 0, 0);
    const key = d.getTime();
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  let cumulativeBefore = 0;
  // count anything older than the window into the starting cumulative
  const windowStart = todayMid - (days - 1) * 86_400_000;
  for (const r of records) if (r.createdAt < windowStart) cumulativeBefore += 1;

  let cumulative = cumulativeBefore;
  for (let i = days - 1; i >= 0; i--) {
    const day = todayMid - i * 86_400_000;
    const count = counts.get(day) || 0;
    cumulative += count;
    const dt = new Date(day);
    buckets.push({
      day,
      label: `${dt.getMonth() + 1}/${dt.getDate()}`,
      count,
      cumulative,
    });
  }
  return buckets;
}

/** C2 — verdict mix (neutral). */
export function verdictMix(records: StoredRecord[]): VerdictMix[] {
  const order: Verdict[] = ["BUY", "HOLD", "AVOID"];
  const m = new Map<Verdict, number>(order.map((v) => [v, 0]));
  for (const r of records) {
    const v = r.decision.verdict;
    if (m.has(v)) m.set(v, (m.get(v) || 0) + 1);
  }
  return order.map((verdict) => ({ verdict, count: m.get(verdict) || 0 }));
}

/** C3 — signal-strength distribution, 5 bins of width 20. */
export function signalDistribution(records: StoredRecord[]): SignalBin[] {
  const bins: SignalBin[] = [
    { label: "0–20", lo: 0, hi: 20, count: 0 },
    { label: "20–40", lo: 20, hi: 40, count: 0 },
    { label: "40–60", lo: 40, hi: 60, count: 0 },
    { label: "60–80", lo: 60, hi: 80, count: 0 },
    { label: "80–100", lo: 80, hi: 100, count: 0 },
  ];
  for (const r of records) {
    const pct = Math.max(0, Math.min(100, r.decision.signalStrengthPct || 0));
    let idx = Math.floor(pct / 20);
    if (idx > 4) idx = 4; // 100 lands in the top bin
    bins[idx].count += 1;
  }
  return bins;
}

/** C4 — anchored on-chain, as a fraction for the gauge. */
export function anchoredFraction(records: StoredRecord[]): { anchored: number; total: number; pct: number } {
  const total = records.length;
  const anchored = records.filter(isAnchored).length;
  const pct = total === 0 ? 0 : Math.round((anchored / total) * 100);
  return { anchored, total, pct };
}

/** C5 — code baseline vs AI agreement (transparency, NOT correctness). */
export function baselineAgreement(records: StoredRecord[]): AgreementMix {
  let agreed = 0;
  let overrode = 0;
  for (const r of records) {
    const f = r.decision.flags;
    const departed = f.llmOverrodeSignals || f.baselineVerdict !== r.decision.verdict;
    if (departed) overrode += 1;
    else agreed += 1;
  }
  return { agreed, overrode };
}
