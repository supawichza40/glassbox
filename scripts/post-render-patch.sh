#!/usr/bin/env bash
#
# scripts/post-render-patch.sh
# ----------------------------------------------------------------------------
# Deterministic, idempotent post-render patch for the Codeplain-generated
# GlassBox frontend (web/).
#
# Codeplain renders glassbox.plain into a Vite + React + TS app. The renderer is
# NON-DETERMINISTIC: each render's component structure differs, so the exact
# compile gaps vary run-to-run. This script applies the MINIMAL fixes the
# CURRENT render needs to reach a clean `npm run build` and to satisfy the two
# spec items the renderer tends to drop (the Vite env typing and the FRID-12
# "View the original UI" switch link).
#
# It is the documented safety net; the real fix belongs upstream in
# glassbox.plain. Every step is GUARDED (a sentinel/grep check) so re-running is
# a no-op, and each step HEALS FROM SCRATCH (writes the known-good content even
# if the renderer emitted nothing for it). macOS BSD tooling assumed (perl -i is
# portable across BSD/GNU).
#
# Run from anywhere, after a render:
#     ./scripts/post-render-patch.sh
#     (cd web && npm run build)
#
# ----------------------------------------------------------------------------
# THIS RENDER'S STRUCTURE (what the GAPs below target)
# ----------------------------------------------------------------------------
#   src/App.tsx
#       - owns the form + analyze fetch inline (NO useTradeAnalysis hook),
#       - imports `{ AnalysisResults, Decision }` from
#         './components/AnalysisResults'.
#   src/components/AnalysisResults.tsx
#       - the debate grid + verdict hero + "Prove it"/"Why you should doubt
#         this"; imports Decision/AuditRecord/AnalysisResultsProps from
#         './AnalysisTypes' (it must RE-EXPORT Decision — see GAP 2).
#   src/components/AnalysisTypes.tsx   - the Decision/AuditRecord/props types.
#   src/components/AuditReceiptView.tsx- the receipt + interactive tamper demo
#         (hashes recordCanonical client-side with Web Crypto SHA-256).
#
# The contract (field names) in THIS render is already correct vs. the backend
# (:Decision: / :AuditRecord: pinned in glassbox.plain) and is verified live —
# so there are NO contract-rewrite GAPs here, unlike older renders.
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
# GAP 1 — Vite client types missing / incomplete.
# `import.meta.env.VITE_API_BASE_URL` and `.VITE_ORIGINAL_UI_URL` are read in
# src/App.tsx (and AuditReceiptView.tsx). If the renderer never emitted
# src/vite-env.d.ts, tsc errors with TS2339 ("Property 'env' does not exist on
# type 'ImportMeta'"). Heal-from-scratch: (re)write the standard triple-slash
# reference file declaring BOTH VITE_* names. Guarded on the presence of the
# VITE_ORIGINAL_UI_URL declaration so a complete file is a no-op.
# ---------------------------------------------------------------------------
VITE_ENV="${WEB_DIR}/src/vite-env.d.ts"
if [[ -f "${VITE_ENV}" ]] && grep -q 'VITE_ORIGINAL_UI_URL' "${VITE_ENV}"; then
  echo "[post-render-patch] GAP 1: src/vite-env.d.ts already complete — skip"
else
  cat > "${VITE_ENV}" <<'EOF'
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_ORIGINAL_UI_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
EOF
  echo "[post-render-patch] GAP 1: wrote src/vite-env.d.ts (VITE_API_BASE_URL + VITE_ORIGINAL_UI_URL)"
  changed=1
fi

# ---------------------------------------------------------------------------
# GAP 2 — AnalysisResults.tsx does not re-export `Decision`. (THE build blocker.)
# App.tsx imports `{ AnalysisResults, Decision }` from
# './components/AnalysisResults', but that module only IMPORTS Decision from
# './AnalysisTypes' (it declares it locally) and never re-exports it, so tsc
# errors:
#   TS2459: Module './components/AnalysisResults' declares 'Decision' locally,
#           but it is not exported.
# Fix: append a `export type { Decision } from './AnalysisTypes';` re-export so
# App.tsx's import resolves. Guarded on a sentinel; only applied when App.tsx
# actually imports Decision from this module AND it isn't re-exported yet.
# ---------------------------------------------------------------------------
AR="${WEB_DIR}/src/components/AnalysisResults.tsx"
APP="${WEB_DIR}/src/App.tsx"
if [[ -f "${AR}" ]] \
   && grep -qE "import .*\bDecision\b.* from ['\"]\./components/AnalysisResults['\"]" "${APP}" \
   && ! grep -q "export type { Decision } from './AnalysisTypes'" "${AR}"; then
  # Anchor on the AuditReceiptView import line (unique, present in this render's
  # AnalysisResults.tsx) and insert the re-export right after it.
  perl -0pi -e "s{(import \{ AuditReceiptView \} from '\./AuditReceiptView';\n)}{\$1\n// Re-export Decision so consumers (App.tsx) can import it from this module.\nexport type { Decision } from './AnalysisTypes';\n}" "${AR}"
  if grep -q "export type { Decision } from './AnalysisTypes'" "${AR}"; then
    echo "[post-render-patch] GAP 2: re-exported Decision from components/AnalysisResults.tsx"
    changed=1
  else
    # Fallback: anchor failed (renderer changed the import line) — append at EOF.
    printf "\n// Re-export Decision so consumers (App.tsx) can import it from this module.\nexport type { Decision } from './AnalysisTypes';\n" >> "${AR}"
    echo "[post-render-patch] GAP 2: re-exported Decision (appended at EOF) in components/AnalysisResults.tsx"
    changed=1
  fi
else
  echo "[post-render-patch] GAP 2: Decision re-export already present (or not needed) — skip"
fi

# ---------------------------------------------------------------------------
# GAP 3 — FRID 12: the "View the original UI" switch link.
# The spec's FRID 12 (side-by-side UI switch) wants a header link reading
# "View the original UI ↗" that points at VITE_ORIGINAL_UI_URL (default the
# backend's bundled original UI at http://localhost:8787/). The renderer is
# inconsistent: it may emit a link with different text, or omit it. Normalize to
# the spec. Guarded on the `cp-switch` class sentinel so a correct link is a
# no-op. Two heal paths:
#   (a) a header anchor already uses VITE_ORIGINAL_UI_URL -> upgrade its class +
#       text in place;
#   (b) no such anchor -> inject one right after `<h1>GlassBox</h1>`.
# ---------------------------------------------------------------------------
if [[ ! -f "${APP}" ]]; then
  echo "[post-render-patch] GAP 3: WARN — ${APP} missing, cannot wire switch link" >&2
elif grep -q 'cp-switch' "${APP}"; then
  echo "[post-render-patch] GAP 3: switch link (cp-switch) already present — skip"
elif grep -q 'VITE_ORIGINAL_UI_URL' "${APP}"; then
  # (a) An original-UI anchor exists (renderer emitted one) but isn't normalized.
  # Add the cp-switch class to the existing original-ui-link anchor and set its
  # visible text to the spec wording. Conservative: only touch the className that
  # contains "original-ui-link", and only the link text node we recognize.
  perl -0pi -e "s{className=\"original-ui-link\"}{className=\"original-ui-link cp-switch\"}g" "${APP}"
  perl -0pi -e "s{(<a href=\{ORIGINAL_UI_URL\}[^>]*>)\s*View[^<]*</a>}{\$1\n            View the original UI \xe2\x86\x97\n          </a>}s" "${APP}"
  if grep -q 'cp-switch' "${APP}"; then
    echo "[post-render-patch] GAP 3: normalized existing original-UI link (cp-switch + spec text)"
    changed=1
  else
    echo "[post-render-patch] GAP 3: WARN — could not normalize existing original-UI link" >&2
  fi
elif grep -q '<h1>GlassBox</h1>' "${APP}"; then
  # (b) No original-UI link at all — inject one right after the brand <h1>.
  perl -0pi -e "s{(<h1>GlassBox</h1>\n)}{\$1          <a className=\"original-ui-link cp-switch\" href={(import.meta.env as any).VITE_ORIGINAL_UI_URL || 'http://localhost:8787/'} target=\"_blank\" rel=\"noopener noreferrer\" style={{ marginLeft: '12px', fontSize: '13px', color: '#21d4c4', textDecoration: 'none', whiteSpace: 'nowrap' }}>View the original UI \xe2\x86\x97</a>\n}" "${APP}"
  if grep -q 'cp-switch' "${APP}"; then
    echo "[post-render-patch] GAP 3: injected FRID-12 switch link into App.tsx"
    changed=1
  else
    echo "[post-render-patch] GAP 3: WARN — could not inject switch link (no <h1>GlassBox</h1> anchor matched)" >&2
  fi
else
  echo "[post-render-patch] GAP 3: WARN — no anchor found to wire the switch link" >&2
fi

echo ""
if [[ "${changed}" -eq 1 ]]; then
  echo "[post-render-patch] DONE — patches applied."
else
  echo "[post-render-patch] DONE — nothing to do (already patched)."
fi
echo "[post-render-patch] Next: (cd web && npm run build)"
