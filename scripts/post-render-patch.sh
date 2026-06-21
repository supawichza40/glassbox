#!/usr/bin/env bash
#
# scripts/post-render-patch.sh
# ----------------------------------------------------------------------------
# Deterministic, idempotent post-render patch for the Codeplain-generated
# GlassBox frontend (web/).
#
# Codeplain renders glassbox.plain into a Vite + React + TS app, but the
# renderer leaves a few mechanical compile gaps. This script applies the
# MINIMAL fixes needed to reach a clean `npm run build` and keep the
# "Re-verify on Walrus" verify feature wired end-to-end. It is the documented
# safety net; the real fix belongs upstream in glassbox.plain (see
# codeplain/RENDER_GAPS.md).
#
# Run from the repo root, after a render:
#     ./scripts/post-render-patch.sh
#
# Every step is guarded so re-running is a no-op. macOS BSD tooling assumed
# (perl -i is portable across BSD/GNU; sed -i '' would be macOS-only).
# ----------------------------------------------------------------------------
set -euo pipefail

# Resolve repo root from this script's location so the patch is CWD-agnostic.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
WEB_DIR="${REPO_ROOT}/web"

if [[ ! -d "${WEB_DIR}/src" ]]; then
  echo "[post-render-patch] ERROR: ${WEB_DIR}/src not found. Render web/ first." >&2
  exit 1
fi

echo "[post-render-patch] repo root: ${REPO_ROOT}"
echo "[post-render-patch] patching: ${WEB_DIR}"

changed=0

# ---------------------------------------------------------------------------
# GAP 1 — Vite client types missing.
# `import.meta.env.VITE_API_BASE_URL` is untyped because the renderer never
# emitted src/vite-env.d.ts, so tsc errors with
#   TS2339: Property 'env' does not exist on type 'ImportMeta'
# in config.ts and hooks/useTradeAnalysis.ts. Create the standard triple-slash
# reference file.
# ---------------------------------------------------------------------------
VITE_ENV="${WEB_DIR}/src/vite-env.d.ts"
if [[ ! -f "${VITE_ENV}" ]]; then
  cat > "${VITE_ENV}" <<'EOF'
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
EOF
  echo "[post-render-patch] GAP 1: created src/vite-env.d.ts"
  changed=1
else
  echo "[post-render-patch] GAP 1: src/vite-env.d.ts already present — skip"
fi

# ---------------------------------------------------------------------------
# GAP 2 — App.tsx does not destructure the verify state out of the hook.
# The hook already RETURNS verifyOnWalrus / isVerifying / verificationStatus,
# and the JSX already passes them to <DecisionView/>, but the destructure stops
# at rehashDecision, so tsc errors with TS2304 (cannot find name ...).
# Insert the three names into the destructure, right after rehashDecision.
# Anchored on the unique closing line of the destructure.
# ---------------------------------------------------------------------------
APP="${WEB_DIR}/src/App.tsx"
if grep -q 'verifyOnWalrus' "${APP}" \
   && grep -qE '^\s*rehashDecision,?\s*$' "${APP}" \
   && ! grep -qE '^\s*verifyOnWalrus,?\s*$' "${APP}"; then
  perl -0pi -e 's/(\n[ \t]*rehashDecision)(\n[ \t]*\}\s*=\s*useTradeAnalysis\(FIXED_ASSET\);)/$1,\n    verifyOnWalrus,\n    isVerifying,\n    verificationStatus$2/' "${APP}"
  echo "[post-render-patch] GAP 2: threaded verify state into App.tsx destructure"
  changed=1
else
  echo "[post-render-patch] GAP 2: App.tsx destructure already threaded — skip"
fi

# ---------------------------------------------------------------------------
# GAP 3 — DecisionView destructures fewer props than its interface declares.
# The DecisionViewProps interface already declares onVerify / isVerifying /
# verificationStatus, and the JSX forwards them to <AuditSection/>, but the
# component's parameter destructure stops at onRehash -> TS2304.
# Insert the three names after onRehash in the destructure (NOT the interface).
# Anchored on the unique destructure closer `onRehash\n}) => {`.
# ---------------------------------------------------------------------------
DV="${WEB_DIR}/src/components/DecisionView.tsx"
if grep -qE '^\s*onRehash\s*$' "${DV}" \
   && ! perl -0ne 'exit(/onRehash,\s*\n\s*onVerify,/s ? 0 : 1)' "${DV}"; then
  perl -0pi -e 's/(\n[ \t]*onRehash)(\n\}\)\s*=>\s*\{)/$1,\n  onVerify,\n  isVerifying,\n  verificationStatus$2/' "${DV}"
  echo "[post-render-patch] GAP 3: threaded verify props into DecisionView destructure"
  changed=1
else
  echo "[post-render-patch] GAP 3: DecisionView destructure already threaded — skip"
fi

# ---------------------------------------------------------------------------
# GAP 4 — AuditVerification has dead/broken code after a function's return.
# renderHighlightedHash() correctly ends at its map's `});`, but the renderer
# duplicated a stale change-handler body AFTER it (unreachable), referencing an
# undefined `e`, using `await` outside an async fn, and passing string|null to a
# string setState. This trips three errors (TS2304 / TS1308 / TS2345).
# Delete the dead block: everything from the stray `const newVal = e.target.value;`
# down to its closing `setLiveHash('INVALID_JSON');\n    }` — but keep the
# function's final `};`. The real change-handler (handleEdit/updateHash) above
# is untouched.
# ---------------------------------------------------------------------------
AV="${WEB_DIR}/src/components/AuditVerification.tsx"
# Detect the dead block by its unique signature: the map closer `});` immediately
# followed by a stray `const newVal = e.target.value;`. (A legitimate `const newVal`
# also lives in handleEdit, so we must anchor on the `});`+next-line pair, which only
# occurs in the broken renderHighlightedHash output.) perl -0 returns 0 only on a match.
if perl -0ne 'exit(/\}\);\n[ \t]*const newVal = e\.target\.value;/s ? 0 : 1)' "${AV}"; then
  # Anchor on the map closer `});` (kept) immediately followed by the dead block, and
  # delete everything from `const newVal = ...` through the dead block's
  # `setLiveHash('INVALID_JSON');\n    }` — stopping BEFORE the function's closing `};`.
  # Bounded so it can only ever match this single contiguous block.
  perl -0pi -e "s/(\n[ \t]*\}\);\n)[ \t]*const newVal = e\.target\.value;\n.*?setLiveHash\('INVALID_JSON'\);\n[ \t]*\}\n(?=[ \t]*\};)/\$1/s" "${AV}"
  echo "[post-render-patch] GAP 4: removed dead code from renderHighlightedHash in AuditVerification.tsx"
  changed=1
else
  echo "[post-render-patch] GAP 4: AuditVerification dead code already removed — skip"
fi

# ===========================================================================
# CONTRACT GAPS (5–9) — the renderer invented a WRONG backend contract.
# ---------------------------------------------------------------------------
# glassbox.plain described the endpoints abstractly, so Codeplain guessed the
# JSON field names: it posted {text, asset, riskTolerance} (backend wants
# {goalText, asset, risk}); typed Decision with bullCase/signalStrength.*/
# winningSide.side / nested AuditRecord; omitted the {decision,...} wrappers on
# audit + rehash; verified with the FULL hash and read a non-existent isValid.
# Every one of those is a runtime 422 / crash, not a compile error — so they
# slip past `npm run build`.
#
# The REAL fix is upstream: glassbox.plain now PINS the exact field names in
# :Decision:/:AuditRecord:/:AnalyzeEndpoint:/:AuditEndpoint:/:VerifyEndpoint:/
# :RehashEndpoint: (see codeplain/RENDER_GAPS.md). These five steps are the
# deterministic safety net: each writes the known-good, contract-correct file,
# guarded by a unique "CONTRACT-PINNED (... GAP N)" sentinel so re-running is a
# no-op. They overwrite whatever the renderer produced for these five files.
# Tamper demo: hashes the AuditRecord's recordCanonical bytes client-side with
# Web Crypto SHA-256 (matching server/glassbox/static/index.html), NOT /api/rehash.
# ===========================================================================

write_pinned() {
  # $1 = absolute file path, $2 = GAP label (e.g. "GAP 5"), stdin = file body.
  local target="$1" label="$2"
  if grep -q "CONTRACT-PINNED (post-render-patch ${label})" "${target}" 2>/dev/null; then
    echo "[post-render-patch] ${label}: ${target#${WEB_DIR}/} already contract-pinned — skip"
    cat >/dev/null   # drain heredoc
  else
    cat > "${target}"
    echo "[post-render-patch] ${label}: wrote contract-pinned ${target#${WEB_DIR}/}"
    changed=1
  fi
}

# --- GAP 5 — src/types.ts: Decision/AuditRecord typed to the REAL fields ----
write_pinned "${WEB_DIR}/src/types.ts" "GAP 5" <<'EOF'
/**
 * Core definitions for the GlassBox application.
 * Following :plainDefinitions: specifications.
 *
 * Field names below mirror the EXACT backend JSON contract pinned in
 * glassbox.plain (:Decision: / :AuditRecord:). Do not rename: the backend is
 * authoritative.
 *
 * CONTRACT-PINNED (post-render-patch GAP 5) — do not hand-edit; see
 * scripts/post-render-patch.sh.
 */

export type RiskTolerance = 'low' | 'moderate' | 'high';
export type Asset = 'SUI/USDC';
export type Verdict = 'BUY' | 'HOLD' | 'AVOID';
export type WinningSide = 'bull' | 'bear';
export type SignalBand = 'Low' | 'Medium' | 'High';

export interface Goal {
  text: string; // Min 5 chars
  asset: Asset;
  riskTolerance: RiskTolerance;
}

export interface DebateSide {
  points: string[];
  convictionRevised: number;
  rebuttal: string;
}

export interface DecisionInputs {
  priceUsd: number;
  trendPctVs20MA: number;
  rsi14: number;
  realizedVolPercentile: number;
  deepbookTopDepthUsd: number;
  spreadBps: number;
  drawdownFromHighPct: number;
  asOfIso: string;
}

export interface Decision {
  verdict: Verdict;
  signalStrengthPct: number;
  signalBand: SignalBand;
  suggestedSizePct: number;
  winningSide: WinningSide; // a plain STRING ("bull" | "bear")
  whyResolved: string;
  bull: DebateSide;
  bear: DebateSide;
  riskNote: string; // a plain STRING (one line)
  counterfactual: string;
  blindSpots: string[];
  inputs: DecisionInputs;
  chartSeries: number[];
  flags: {
    baselineVerdict: string;
    llmOverrodeSignals: boolean;
    groundingWarnings: string[];
  };
}

// AuditRecord is FLAT — nothing is nested.
export interface AuditRecord {
  recordId: string; // SHORT id used to re-verify (NOT the full hash)
  recordHash: string; // full sha-256 fingerprint — the anchored fingerprint
  recordCanonical: string; // exact canonical bytes that were hashed
  signature: string;
  pubkey: string;
  sink: string; // "walrus" | "local"
  blobId: string | null;
  suiObjectId: string | null;
  anchorEpoch: number | null;
  anchorNetwork: string | null;
}
EOF

# --- GAP 6 — hooks/useTradeAnalysis.ts: correct request bodies + verify ------
write_pinned "${WEB_DIR}/src/hooks/useTradeAnalysis.ts" "GAP 6" <<'EOF'
import { useState } from 'react';
import { RiskTolerance, Asset, Decision, AuditRecord } from '../types';

/**
 * Custom hook to handle the trade analysis logic.
 * Encapsulates state and side effects for fetching data from the AnalyzeEndpoint.
 *
 * Request/response field names mirror the EXACT backend contract pinned in
 * glassbox.plain (:AnalyzeEndpoint:/:AuditEndpoint:/:VerifyEndpoint:/:RehashEndpoint:).
 *
 * CONTRACT-PINNED (post-render-patch GAP 6) — do not hand-edit; see
 * scripts/post-render-patch.sh.
 */
export const useTradeAnalysis = (asset: Asset) => {
  const [riskTolerance, setRiskTolerance] = useState<RiskTolerance>('moderate');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [decision, setDecision] = useState<Decision | null>(null);
  const [lastGoalText, setLastGoalText] = useState<string>('');
  const [showVerdict, setShowVerdict] = useState<boolean>(false);
  const [rejectionMessage, setRejectionMessage] = useState<string | null>(null);
  const [auditRecord, setAuditRecord] = useState<AuditRecord | null>(null);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);

  const baseUrl = (): string => import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';

  const analyzeTrade = async (goalText: string) => {
    if (goalText.trim().length < 5) {
      setError('The question must be at least 5 characters long.');
      return;
    }

    setError(null);
    setRejectionMessage(null);
    setIsLoading(true);
    setDecision(null);
    setAuditRecord(null);
    setShowVerdict(false);

    const steps = [
      "Gathering market data...",
      "Bull agent constructing case...",
      "Bear agent finding weaknesses...",
      "Finalizing verdict..."
    ];

    let stepIdx = 0;
    const stepInterval = setInterval(() => {
      if (stepIdx < steps.length) {
        setLoadingStep(steps[stepIdx]);
        stepIdx++;
      }
    }, 600);

    try {
      const response = await fetch(`${baseUrl()}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalText, asset, risk: riskTolerance }),
      });

      if (response.status === 422 || response.status === 400) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.outOfScope) {
          setRejectionMessage(errorData.message || "I only analyze whether to buy, hold, or avoid SUI/USDC. Try asking something like: 'Is now a good time to buy SUI based on current liquidity?'");
          setIsLoading(false);
          clearInterval(stepInterval);
          return;
        }
      }

      if (!response.ok) {
        throw new Error(`AnalyzeEndpoint (POST /api/analyze) failed with status: ${response.status} ${response.statusText}`);
      }

      const data: Decision = await response.json();

      clearInterval(stepInterval);
      setIsLoading(false);
      setDecision(data);
      setLastGoalText(goalText);

      setTimeout(() => {
        setShowVerdict(true);
      }, 1000);

    } catch (err) {
      clearInterval(stepInterval);
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : 'Unknown network error';
      setError(`Failed to analyze trade: ${msg}`);
      console.error(`[useTradeAnalysis::Error] ${msg}`, err);
    }
  };

  const rehashDecision = async (decisionData: any): Promise<string | null> => {
    try {
      const response = await fetch(`${baseUrl()}/api/rehash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: decisionData }),
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.recordHash;
    } catch (err) {
      console.error(`[useTradeAnalysis::RehashError] ${err}`);
      return null;
    }
  };

  const auditDecision = async (): Promise<boolean> => {
    if (!decision) return false;

    setIsAuditing(true);
    setError(null); // Clear previous errors
    try {
      const response = await fetch(`${baseUrl()}/api/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, goalText: lastGoalText }),
      });

      if (!response.ok) {
        throw new Error(`AuditEndpoint (POST /api/audit) failed with status: ${response.status} ${response.statusText}`);
      }

      const record: AuditRecord = await response.json();
      setAuditRecord(record);
      setVerificationStatus(null);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Audit failed';
      console.error(`[useTradeAnalysis::AuditError] ${msg}`, err);
      setError(`Audit Failed: ${msg}`);
      setVerificationStatus(`Error during audit: ${msg}`);
      return false;
    } finally {
      setIsAuditing(false);
    }
  };

  const verifyOnWalrus = async (recordId: string): Promise<void> => {
    setIsVerifying(true);
    setVerificationStatus(null);
    try {
      const response = await fetch(`${baseUrl()}/api/verify/${recordId}`);

      if (!response.ok) {
        throw new Error(`VerifyEndpoint returned status ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      // Re-verified only when BOTH the anchored fingerprint matches and the signature is valid.
      if (data.hashMatch && data.signatureValid) {
        setVerificationStatus("✓ Record re-verified on Walrus: Signature valid and fingerprint matches anchor.");
      } else {
        setVerificationStatus("⚠ Verification failed: The remote record does not match or signature is invalid.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown verification error';
      console.error(`[useTradeAnalysis::VerifyError] ${msg}`, err);
      setVerificationStatus(`Verification Error: ${msg}`);
    } finally {
      setIsVerifying(false);
    }
  };

  return {
    riskTolerance,
    setRiskTolerance,
    error,
    setError,
    isLoading,
    loadingStep,
    decision,
    showVerdict,
    rejectionMessage,
    analyzeTrade,
    auditRecord,
    isAuditing,
    isVerifying,
    verificationStatus,
    auditDecision,
    rehashDecision,
    verifyOnWalrus
  };
};
EOF

# --- GAP 7 — components/DecisionView.tsx: render the REAL Decision fields ----
write_pinned "${WEB_DIR}/src/components/DecisionView.tsx" "GAP 7" <<'EOF'
import React, { useState } from 'react';
import { Decision, AuditRecord } from '../types';
import { AuditSection } from './AuditSection';

interface DecisionViewProps {
  decision: Decision;
  showVerdict: boolean;
  auditRecord: AuditRecord | null;
  isAuditing: boolean;
  onAudit: () => Promise<void>;
  onRehash: (data: any) => Promise<string | null>;
  onVerify: (recordId: string) => Promise<void>;
  isVerifying: boolean;
  verificationStatus: string | null;
}

/**
 * Component to display the results of the trade analysis.
 * Field names mirror the EXACT backend :Decision: contract.
 *
 * CONTRACT-PINNED (post-render-patch GAP 7) — do not hand-edit; see
 * scripts/post-render-patch.sh.
 */
export const DecisionView: React.FC<DecisionViewProps> = ({
  decision,
  showVerdict,
  auditRecord,
  isAuditing,
  onAudit,
  onRehash,
  onVerify,
  isVerifying,
  verificationStatus
}) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);

  if (!decision) return null;

  return (
    <div className="decision-display">
      {/* The Debate - Revealed First */}
      <div className="debate-container" style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <div className="bull-case" style={{ flex: 1, borderLeft: '4px solid green', paddingLeft: '10px' }}>
          <h3>Bull Case</h3>
          <ul>{decision.bull.points.map((pt, i) => <li key={i}>{pt}</li>)}</ul>
        </div>
        <div className="bear-case" style={{ flex: 1, borderLeft: '4px solid red', paddingLeft: '10px' }}>
          <h3>Bear Case</h3>
          <ul>{decision.bear.points.map((pt, i) => <li key={i}>{pt}</li>)}</ul>
        </div>
      </div>

      {/* The Verdict Hero - Revealed with Delay */}
      {showVerdict && (
        <div className="verdict-hero" style={{ textAlign: 'center', padding: '20px', backgroundColor: '#f0f4f8', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '3rem', margin: '0' }}>{decision.verdict}</h2>
          <p><strong>Winning Side:</strong> {decision.winningSide.toUpperCase()} - {decision.whyResolved}</p>

          <div className="metrics" style={{ display: 'flex', justifyContent: 'center', gap: '30px', marginTop: '15px' }}>
            <div>
              <span style={{ display: 'block', fontSize: '1.2rem', fontWeight: 'bold' }}>{decision.signalStrengthPct}% ({decision.signalBand})</span>
              <small>rule-based, not a probability of profit</small>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '1.2rem', fontWeight: 'bold' }}>{decision.suggestedSizePct}%</span>
              <small>of your portfolio</small>
            </div>
          </div>
        </div>
      )}

      <AuditSection
        decision={decision}
        showVerdict={showVerdict}
        auditRecord={auditRecord}
        isAuditing={isAuditing}
        onAudit={onAudit}
        onRehash={onRehash}
        onVerify={onVerify}
        isVerifying={isVerifying}
        verificationStatus={verificationStatus}
      />

      {/* Expander Section */}
      <div className="details-expander" style={{ marginTop: '20px' }}>
        <button onClick={() => setIsDetailsOpen(!isDetailsOpen)}>
          {isDetailsOpen ? '▼ Hide details' : '▶ Why you should doubt this'}
        </button>
        {isDetailsOpen && (
          <div className="details-content" style={{ padding: '15px', border: '1px solid #ccc', marginTop: '5px' }}>
            <p><strong>Main Risk:</strong> {decision.riskNote}</p>
            <p><strong>Counterfactual:</strong> {decision.counterfactual}</p>
            <p><strong>Blind Spots:</strong> {decision.blindSpots.join(', ')}</p>
            <div>
              <strong>Market Inputs:</strong>
              <ul>
                <li>Price (USD): {decision.inputs.priceUsd}</li>
                <li>RSI (14): {decision.inputs.rsi14}</li>
                <li>Realized vol percentile: {decision.inputs.realizedVolPercentile}</li>
                <li>DeepBook top depth (USD): {decision.inputs.deepbookTopDepthUsd}</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
EOF

# --- GAP 8 — components/AuditVerification.tsx: hash recordCanonical client-side
write_pinned "${WEB_DIR}/src/components/AuditVerification.tsx" "GAP 8" <<'EOF'
import React, { useState, useEffect, ChangeEvent } from 'react';
import { Decision, AuditRecord } from '../types';

interface AuditVerificationProps {
  decision: Decision;
  auditRecord: AuditRecord;
  onRehash: (data: any) => Promise<string | null>;
}

/**
 * Interactive tamper playground.
 *
 * The editable field holds the AuditRecord's `recordCanonical` bytes — the exact
 * bytes the backend hashed. "This record's fingerprint" is recomputed live by
 * hashing the current editable text with Web Crypto SHA-256 (lowercase hex), and
 * compared to the anchored fingerprint (`recordHash`). Un-edited bytes hash back
 * to `recordHash` -> MATCH. This mirrors the original UI (server/.../index.html)
 * and never re-serializes the Decision object.
 *
 * CONTRACT-PINNED (post-render-patch GAP 8) — do not hand-edit; see
 * scripts/post-render-patch.sh.
 */

async function sha256hex(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export const AuditVerification: React.FC<AuditVerificationProps> = ({
  decision,
  auditRecord,
  onRehash
}) => {
  // onRehash and decision are retained for prop compatibility but the tamper demo
  // hashes recordCanonical client-side (see header).
  void onRehash;
  void decision;

  const [editableRecord, setEditableRecord] = useState<string>('');
  const [liveHash, setLiveHash] = useState<string>('');

  const updateHash = async (content: string) => {
    try {
      const newHash = await sha256hex(content);
      setLiveHash(newHash);
    } catch (err) {
      console.error(`[AuditVerification::updateHash] ${err}`);
      setLiveHash('HASH_COMPUTATION_FAILED');
    }
  };

  useEffect(() => {
    const canonical = auditRecord.recordCanonical || '';
    setEditableRecord(canonical);
    // On first show the un-edited bytes hash back to recordHash (MATCH/VERIFIED).
    setLiveHash(auditRecord.recordHash);
  }, [auditRecord]);

  const handleEdit = async (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setEditableRecord(newVal);
    await updateHash(newVal);
  };

  const handleReset = () => {
    setEditableRecord(auditRecord.recordCanonical || '');
    setLiveHash(auditRecord.recordHash);
  };

  const handleTryToAlter = async () => {
    let v = editableRecord;
    if (v.length === 0) return;
    // Flip one digit (or one letter) — a single-character change, like the original.
    const i = v.search(/[0-9]/);
    if (i >= 0) {
      v = v.slice(0, i) + (v[i] === '9' ? '8' : String(Number(v[i]) + 1)) + v.slice(i + 1);
    } else {
      v = v.replace(/[A-Za-z]/, c => (c === 'a' ? 'b' : 'a'));
    }
    setEditableRecord(v);
    await updateHash(v);
  };

  const renderHighlightedHash = (current: string, target: string) => {
    return current.split('').map((char, i) => {
      const isMismatch = char !== target[i];
      return (
        <span key={i} style={{
          backgroundColor: isMismatch ? '#ff0000' : 'transparent',
          color: isMismatch ? 'white' : 'inherit',
          padding: '0 1px'
        }}>
          {char}
        </span>
      );
    });
  };

  const isMatch = liveHash === auditRecord.recordHash;

  return (
    <div className="verification-playground" style={{ marginTop: '20px', borderTop: '2px solid #333', paddingTop: '20px' }}>
      <p><strong>Verification Playground:</strong> Change any character to see the cryptographic proof fail.</p>

      <div style={{
        textAlign: 'center',
        padding: '20px',
        marginBottom: '20px',
        borderRadius: '8px',
        border: '2px solid',
        borderColor: isMatch ? '#28a745' : '#dc3545',
        backgroundColor: isMatch ? '#f8fff9' : '#fff5f5'
      }}>
        {isMatch ? (
          <div style={{ color: '#28a745', fontSize: '1.5rem', fontWeight: '900', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
            <span>🛡️</span> VERIFIED: TAMPER-EVIDENT MATCH
          </div>
        ) : (
          <div style={{ color: '#dc3545', fontSize: '1.5rem', fontWeight: '900', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
            <span>⚠️</span> TAMPER DETECTED: MISMATCH
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <button onClick={handleReset} style={{ padding: '8px 16px', cursor: 'pointer' }}>Reset to Original</button>
        <button onClick={handleTryToAlter} style={{ padding: '8px 16px', cursor: 'pointer', background: '#dc3545', color: 'white', border: 'none', fontWeight: 'bold' }}>Try to alter it</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
        <div>
          <small style={{ color: '#666' }}>Anchored Fingerprint:</small>
          <code style={{ display: 'block', background: '#e9ecef', padding: '4px', fontSize: '0.7rem', overflowX: 'auto' }}>
            {auditRecord.recordHash}
          </code>
        </div>
        <div>
          <small style={{ color: '#666' }}>This Record's Fingerprint:</small>
          <code style={{ display: 'block', background: isMatch ? '#e9ecef' : '#ffdada', padding: '4px', fontSize: '0.7rem', overflowX: 'auto', minHeight: '1.2rem' }}>
            {liveHash === 'HASH_COMPUTATION_FAILED' ? liveHash : renderHighlightedHash(liveHash, auditRecord.recordHash)}
          </code>
        </div>
      </div>

      <textarea
        value={editableRecord}
        onChange={handleEdit}
        spellCheck={false}
        style={{ width: '100%', height: '150px', fontFamily: 'monospace', fontSize: '0.8rem', padding: '10px' }}
      />
    </div>
  );
};
EOF

# --- GAP 9 — components/AuditSection.tsx: flat AuditRecord + short recordId ---
write_pinned "${WEB_DIR}/src/components/AuditSection.tsx" "GAP 9" <<'EOF'
import React from 'react';
import { Decision, AuditRecord } from '../types';
import { AuditVerification } from './AuditVerification';

interface AuditSectionProps {
  decision: Decision;
  showVerdict: boolean;
  auditRecord: AuditRecord | null;
  isAuditing: boolean;
  onAudit: () => Promise<void>;
  onRehash: (data: any) => Promise<string | null>;
  onVerify: (recordId: string) => Promise<void>;
  isVerifying: boolean;
  verificationStatus: string | null;
}

/**
 * Component handling the "Prove it" logic and Walrus/Sui audit receipts.
 *
 * CONTRACT-PINNED (post-render-patch GAP 9) — do not hand-edit; see
 * scripts/post-render-patch.sh.
 */
export const AuditSection: React.FC<AuditSectionProps> = ({
  decision,
  showVerdict,
  auditRecord,
  isAuditing,
  onAudit,
  onRehash,
  onVerify,
  isVerifying,
  verificationStatus
}) => {
  return (
    <div className="audit-section" style={{ marginTop: '30px', padding: '20px', border: '1px dashed #666', borderRadius: '8px' }}>
      {!auditRecord ? (
        <button
          onClick={onAudit}
          disabled={isAuditing || !showVerdict}
          style={{ padding: '10px 20px', cursor: (isAuditing || !showVerdict) ? 'not-allowed' : 'pointer' }}
        >
          {isAuditing ? 'Generating Proof...' : 'Prove it'}
        </button>
      ) : (
        <div className="audit-receipt" style={{ fontSize: '0.9rem' }}>
          <p style={{ fontWeight: 'bold', color: '#2b5a2b' }}>
            ✓ GlassBox signed this exact decision and wrote its fingerprint to Walrus on Sui, so a single changed character won't match.
          </p>
          <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '4px', marginTop: '10px' }}>
            <div style={{ float: 'right' }}>
              <button
                onClick={() => onVerify(auditRecord.recordId)}
                disabled={isVerifying}
                style={{ fontSize: '0.7rem', cursor: isVerifying ? 'wait' : 'pointer' }}
              >
                {isVerifying ? 'Verifying...' : 'Re-verify on Walrus'}
              </button>
            </div>
            <p><strong>Record Hash:</strong> <code style={{ fontSize: '0.8rem' }}>{auditRecord.recordHash}</code></p>
            <p><strong>Origin:</strong> Signed by GlassBox</p>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '10px' }}>
              <span style={{ background: '#007bff', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>
                Walrus: {auditRecord.sink === 'walrus' ? 'Stored on Walrus · Sui' : 'Local Fallback'}
              </span>
              {auditRecord.suiObjectId && (
                <a
                  href={`https://suiscan.xyz/testnet/object/${auditRecord.suiObjectId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#007bff' }}
                >
                  View on Sui Explorer (Object {auditRecord.suiObjectId.substring(0, 6)}...{auditRecord.anchorEpoch != null ? `, epoch ${auditRecord.anchorEpoch}` : ''})
                </a>
              )}
            </div>
            {verificationStatus && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '10px',
                  borderTop: '1px solid #ddd',
                  fontSize: '0.8rem',
                  color: verificationStatus.includes('Error') || verificationStatus.includes('failed') ? '#c53030' : '#155724',
                  backgroundColor: verificationStatus.includes('Error') || verificationStatus.includes('failed') ? '#fff5f5' : 'transparent'
                }}
              >
                {verificationStatus}
              </div>
            )}
          </div>

          <AuditVerification
            decision={decision}
            auditRecord={auditRecord}
            onRehash={onRehash}
          />
        </div>
      )}
    </div>
  );
};
EOF

# ---------------------------------------------------------------------------
# GAP 10 — FRID 12 (the side-by-side UI switch) post-dates this rendered snapshot
# (the spec gained FRID 12 after the render). Inject the header link the spec
# describes: "View the original UI" -> VITE_ORIGINAL_UI_URL (default :8787). A
# fresh render of the current spec emits this directly; here we reproduce it.
# ---------------------------------------------------------------------------
APP="${WEB_DIR}/src/App.tsx"
if grep -q '<h1>GlassBox</h1>' "${APP}" && ! grep -q 'cp-switch' "${APP}"; then
  perl -0pi -e "s{(<h1>GlassBox</h1>\n)}{\$1          <a className=\"cp-switch\" href={(import.meta.env as any).VITE_ORIGINAL_UI_URL || 'http://localhost:8787/'} style={{ marginLeft: '12px', fontSize: '13px', color: '#2563eb', textDecoration: 'none', border: '1px solid #2563eb', borderRadius: '999px', padding: '3px 10px', whiteSpace: 'nowrap' }}>\xe2\x87\x84 View the original UI \xe2\x86\x97</a>\n}" "${APP}"
  echo "[post-render-patch] GAP 10: injected the original-UI switch link (FRID 12) into App.tsx"
  changed=1
else
  echo "[post-render-patch] GAP 10: switch link already present — skip"
fi

echo ""
if [[ "${changed}" -eq 1 ]]; then
  echo "[post-render-patch] DONE — patches applied."
else
  echo "[post-render-patch] DONE — nothing to do (already patched)."
fi
echo "[post-render-patch] Next: (cd web && npm run build)"
