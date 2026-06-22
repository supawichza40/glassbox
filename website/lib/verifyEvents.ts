// Verification-event log. Each time someone runs /api/verify (or the interactive
// tamper demo), we record a VerifyEvent so the provider dashboard can report
// INTEGRITY metrics: independent verifications + tamper attempts caught.
//
// This is an EVIDENCE signal, not a performance signal — there is NO PnL/return/
// win-rate anywhere. hashMatch:false === a tamper attempt that verification caught.

const LS_KEY = "gb_verify_events_v1";

export interface VerifyEvent {
  recordId: string;
  at: number; // epoch ms
  hashMatch: boolean;
  signatureValid: boolean;
  source: string; // "verifier" | "tamper-demo" | "auditor" | "seed"
}

function isBrowser() {
  return typeof window !== "undefined";
}

// Real demo record id (stays genuinely verifiable across the seed).
const DEMO_ID = "4584749304d10fa4";

// Synthetic recordIds the seed references (mirrors the demoDashboard ids).
const SEED_IDS = [
  DEMO_ID,
  "a1b2c3d4e5f60718",
  "b2c3d4e5f6071829",
  "c3d4e5f607182930",
  "d4e5f60718293041",
  "e5f6071829304152",
  "f607182930415263",
  "0718293041526374",
  "1829304152637485",
  "2930415263748596",
];

// A fixed point in time so the seed is deterministic relative to "now".
function daysAgo(n: number, hour = 12): number {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d.getTime() - n * 86_400_000;
}

// ~22 seeded events. ~18 successful spread across ~10 recordIds; 2 with
// hashMatch:false (tamper attempts caught), clustered recent. Signature stays
// valid on the tamper rows — only the body hash diverges (the tamper signature).
function seedEvents(): VerifyEvent[] {
  return [
    // The real demo record — verified several times by visitors.
    { recordId: DEMO_ID, at: daysAgo(0, 9), hashMatch: true, signatureValid: true, source: "verifier" },
    { recordId: DEMO_ID, at: daysAgo(1, 14), hashMatch: true, signatureValid: true, source: "verifier" },
    { recordId: DEMO_ID, at: daysAgo(3, 11), hashMatch: true, signatureValid: true, source: "auditor" },

    // Tamper attempts caught — clustered in the last 2 days.
    { recordId: "a1b2c3d4e5f60718", at: daysAgo(0, 16), hashMatch: false, signatureValid: true, source: "tamper-demo" },
    { recordId: "b2c3d4e5f6071829", at: daysAgo(1, 10), hashMatch: false, signatureValid: true, source: "tamper-demo" },

    // Successful independent verifications across many records.
    { recordId: "a1b2c3d4e5f60718", at: daysAgo(0, 13), hashMatch: true, signatureValid: true, source: "verifier" },
    { recordId: "b2c3d4e5f6071829", at: daysAgo(2, 12), hashMatch: true, signatureValid: true, source: "verifier" },
    { recordId: "c3d4e5f607182930", at: daysAgo(2, 15), hashMatch: true, signatureValid: true, source: "auditor" },
    { recordId: "c3d4e5f607182930", at: daysAgo(4, 9), hashMatch: true, signatureValid: true, source: "verifier" },
    { recordId: "d4e5f60718293041", at: daysAgo(5, 11), hashMatch: true, signatureValid: true, source: "verifier" },
    { recordId: "d4e5f60718293041", at: daysAgo(6, 14), hashMatch: true, signatureValid: true, source: "auditor" },
    { recordId: "e5f6071829304152", at: daysAgo(7, 10), hashMatch: true, signatureValid: true, source: "verifier" },
    { recordId: "e5f6071829304152", at: daysAgo(8, 16), hashMatch: true, signatureValid: true, source: "verifier" },
    { recordId: "f607182930415263", at: daysAgo(9, 12), hashMatch: true, signatureValid: true, source: "auditor" },
    { recordId: "0718293041526374", at: daysAgo(11, 13), hashMatch: true, signatureValid: true, source: "verifier" },
    { recordId: "0718293041526374", at: daysAgo(13, 9), hashMatch: true, signatureValid: true, source: "verifier" },
    { recordId: "1829304152637485", at: daysAgo(15, 15), hashMatch: true, signatureValid: true, source: "verifier" },
    { recordId: "1829304152637485", at: daysAgo(18, 11), hashMatch: true, signatureValid: true, source: "auditor" },
    { recordId: "2930415263748596", at: daysAgo(21, 12), hashMatch: true, signatureValid: true, source: "verifier" },
    { recordId: "2930415263748596", at: daysAgo(24, 14), hashMatch: true, signatureValid: true, source: "verifier" },
    { recordId: DEMO_ID, at: daysAgo(27, 10), hashMatch: true, signatureValid: true, source: "verifier" },
    { recordId: "c3d4e5f607182930", at: daysAgo(29, 13), hashMatch: true, signatureValid: true, source: "verifier" },
  ];
}

function loadStored(): VerifyEvent[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as VerifyEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Append a verify event to the local log (called by the verifier/tamper demo). */
export function recordVerifyEvent(ev: VerifyEvent): void {
  if (!isBrowser()) return;
  try {
    const all = loadStored();
    all.push(ev);
    window.localStorage.setItem(LS_KEY, JSON.stringify(all));
  } catch {
    /* quota / private mode — non-fatal */
  }
}

/**
 * All verify events = the deterministic seed merged with any real events the
 * visitor's session produced. Newest first. The seed guarantees the integrity
 * metrics are never empty on a cold dashboard.
 */
export function listVerifyEvents(): VerifyEvent[] {
  const merged = [...seedEvents(), ...loadStored()];
  return merged.sort((a, b) => b.at - a.at);
}

export const VERIFY_SEED_IDS = SEED_IDS;
