# GlassBox Codeplain Replica — Browser Verification

**Verdict: FAIL — the replica is NOT a working journey replica.** The Codeplain React
app (`:5173`) dies on the very first interactive step: clicking **Analyze Trade** with
the canonical question returns **HTTP 422** and renders an "Analysis Error" banner. No
decision, no debate, no verdict, no "Prove it", no tamper demo, no verify — the entire
downstream journey is unreachable. The original (`:8787`) completes the same journey
end-to-end against the **same backend**, so this is a replica defect, not a backend
problem.

Method: headless Chromium (Playwright) driving each UI live; backend in `DEMO_MODE`
(`/api/health` → `ok:true`, `demoMode:true`); canonical question
`"Should I hold SUI for the next 2 weeks? I'm moderate risk."`, risk `moderate`.
Drivers: `/tmp/gbverify/drive_codeplain.mjs`, `/tmp/gbverify/drive_original.mjs`.
Screenshots: `/tmp/gbverify/cp_after_analyze.png` (replica error),
`/tmp/gbverify/orig_decision.png` (original working).

---

## PASS/FAIL per journey step — CODEPLAIN (:5173)

| # | Journey step | Result | Evidence |
|---|--------------|--------|----------|
| 0 | App loads, GlassBox header, disclaimer, empty state | PASS | Header + standing disclaimer render; "Enter a question…" empty state shown |
| 1 | Type canonical question + pick risk (moderate) | PASS | `#goal-text` + `#risk-tolerance` fill cleanly |
| 2 | **Analyze → loading → Decision** | **FAIL (P0)** | `POST /api/analyze` → **422**; UI shows red "Analysis Error: …422 Unprocessable Entity"; console error `[useTradeAnalysis::Error] …422`. No decision object ever set. |
| 3 | Verdict hero (BUY/HOLD/AVOID) + Signal band | **BLOCKED** | Never reached — no decision |
| 4 | Bull vs Bear debate side-by-side | **BLOCKED** | Never reached |
| 5 | "Why you should doubt this" (risk / counterfactual / blind-spots) | **BLOCKED** | Never reached |
| 6 | **Prove it → audit receipt** (fingerprint, signature, Walrus/Sui chip + object link) | **BLOCKED + would FAIL** | Never reached; even if reached, `POST /api/audit` sends bare decision and would **422** (see P1) |
| 7 | Editable signed record + **VERIFIED ↔ TAMPER DETECTED** | **BLOCKED + would FAIL** | Never reached; tamper rehash sends bare decision → `POST /api/rehash` **422** → liveHash becomes `HASH_COMPUTATION_FAILED`, breaking the match/highlight logic |
| 8 | **Re-verify on Walrus** → `GET /api/verify/{id}` | **BLOCKED + would FAIL** | Never reached; passes `recordHash` (full) not `recordId`; backend → `{"error":"unknown recordId"}` and code checks `data.isValid` (a field the backend never returns) |
| — | Claim discipline (no "tamper-proof"/"provable to anyone") | PASS | `grep` of `web/src`: no "tamper-proof", no "provable/prove to anyone"; uses "TAMPER-EVIDENT MATCH" + "Re-verify on Walrus" |

**Network captured on replica:** `422 POST /api/analyze` (then nothing — journey halts).
**Console:** one 422 error + an unrelated 404 (favicon, shared with original).

## ORIGINAL (:8787) — same journey, for comparison (all PASS)

`200 POST /api/analyze` → **HOLD**, 85% High signal, Bull+Bear debate, doubt expander →
`200 POST /api/audit` (receipt w/ signature + Walrus/Sui chip) → tamper flips
**VERIFIED ↔ TAMPER** on alter, resets to VERIFIED → `200 GET /api/verify/743d94f9812ca8d7`.
Fully working, dark Tailwind theme.

---

## Fidelity verdict

**NOT a faithful journey replica — broken on contact.** The replica reproduces the
*static scaffolding* of the journey (header, form, loading/empty/error states, a
DecisionView with debate + verdict-hero + doubt-expander, an AuditSection with receipt +
interactive tamper playground + re-verify button) and the *copy/claim discipline* is
correct. But **every backend call uses the wrong request/response contract**, so none of
the interactive journey actually runs. The first call alone (analyze) hard-stops the user
at an error banner.

Secondary (non-blocking) divergence: this build ships **no Tailwind / no CSS** (deps are
only `react`/`react-dom`; all styling is inline) — it is an unstyled white page, not the
"React/Tailwind look" expected. Noted, but the P0 contract breaks are what fail the
replica.

---

## P0 / P1 defects (with repro + fix location)

### P0 — Analyze sends wrong field names → 422, journey dies at step 1
- **Repro:** load `:5173`, enter canonical question, risk moderate, click "Analyze Trade" → red "Analysis Error … 422".
- **Cause:** `web/src/hooks/useTradeAnalysis.ts` (`analyzeTrade`, ~line 54) posts
  `{ text: goalText, asset, riskTolerance }`. Backend (`POST /api/analyze`, Pydantic)
  requires `{ goalText, asset, risk }` — confirmed `422 {detail:[{loc:["body","goalText"],msg:"Field required"}]}`. Original sends `{goalText, asset, risk}` (static index.html line 372–373).
- **Fix:** `web/src/hooks/useTradeAnalysis.ts` — change request body to
  `JSON.stringify({ goalText, asset, risk: riskTolerance })`.

### P0 — Decision response shape mismatch → would render `undefined`/crash even if analyze were fixed
- **Cause:** `web/src/types.ts` `Decision` + `web/src/components/DecisionView.tsx`
  expect `bullCase`, `bearCase`, `winningSide.{side,reason}`, `signalStrength.{percentage,band}`,
  `riskNote.{risk,suggestedSize}`, `inputs.{price,rsi,volatility,liquidity}`.
  Backend actually returns `bull.points[]`, `bear.points[]`, `winningSide` (a **string**
  `"bull"`), `signalStrengthPct` (85), `signalBand` ("High"), `riskNote` (a **string**),
  `suggestedSizePct` (13), `inputs.{priceUsd,rsi14,realizedVolPercentile,deepbookTopDepthUsd…}`,
  plus `counterfactual`, `blindSpots[]`, `whyResolved`, `chartSeries[]`.
  `decision.winningSide.side.toUpperCase()` and `decision.bullCase.map()` would throw on
  the real payload (`winningSide` is a string; `bullCase` is undefined).
- **Fix:** `web/src/types.ts` + `web/src/components/DecisionView.tsx` — remap to the real
  field names (`bull.points`, `bear.points`, `signalStrengthPct`, `signalBand`,
  `suggestedSizePct`, string `riskNote`, string `winningSide` + `whyResolved`,
  `inputs.priceUsd/rsi14/…`).

### P1 — Audit + Rehash omit the `decision` wrapper → 422
- **Cause:** `web/src/hooks/useTradeAnalysis.ts` `auditDecision` posts the bare `decision`
  object and `rehashDecision` posts the bare parsed object. Backend requires
  `{ decision: {...} }` (audit also expects `goalText`). Confirmed: bare body → `422`;
  `{decision:{...}}` → `200` (rehash → `{recordHash}`, audit → flat keys).
- **Fix:** `web/src/hooks/useTradeAnalysis.ts` — audit body
  `JSON.stringify({ decision, goalText })`; rehash body `JSON.stringify({ decision: parsed })`.

### P1 — AuditRecord shape + verify id/field mismatch → receipt chip wrong, re-verify always "fails"
- **Cause:** `web/src/types.ts` `AuditRecord` expects nested
  `suiAnchor:{objectId,epoch}` + `walrusBlobId`. Backend returns **flat**: `recordId`,
  `recordHash`, `signature`, `pubkey`, `blobId`, `suiObjectId`, `anchorEpoch`,
  `recordCanonical`. So `auditRecord.suiAnchor`/`walrusBlobId` are `undefined` (chip → "Local Fallback", no Sui link).
  Then `verifyOnWalrus` is called with `auditRecord.recordHash` (the **full** hash) — backend keys
  on the short `recordId`, so `GET /api/verify/<fullHash>` → `{"error":"unknown recordId"}`.
  And the code checks `data.isValid`, but verify returns `{hashMatch, signatureValid}` —
  so even a correct id would show "Verification failed".
- **Fix:** `web/src/types.ts` (flatten `AuditRecord`), `web/src/components/AuditSection.tsx`
  (use `blobId`/`suiObjectId`/`anchorEpoch`; pass `auditRecord.recordId` to `onVerify`),
  `web/src/hooks/useTradeAnalysis.ts` `verifyOnWalrus` (check `data.hashMatch && data.signatureValid`).

> Note: the interactive tamper match in `AuditVerification.tsx` compares client `liveHash`
> (from `/api/rehash`) against `auditRecord.recordHash`. With P1 fixed it should flip
> correctly, **but** the editable JSON is `JSON.stringify(decision)` while the backend
> canonicalizes server-side — re-confirm the un-edited record hashes to a MATCH after the
> wrapper fix (the original avoids this by hashing `recordCanonical` client-side via Web Crypto).

## Bottom line
The replica is a faithful *skeleton* with correct claims and a sensible component
structure, but it is **non-functional against the live backend** — wrong field names on
every endpoint. Net root cause: it was coded to an assumed contract, not the real one in
`CLAUDE.md` / the original's `index.html`. Fix the four contract breaks above (all in
`web/src/hooks/useTradeAnalysis.ts`, `web/src/types.ts`, and the two
`web/src/components/*` files) and re-run `/tmp/gbverify/drive_codeplain.mjs` to confirm
the journey completes (analyze → decision → prove → tamper flip → re-verify 200).
