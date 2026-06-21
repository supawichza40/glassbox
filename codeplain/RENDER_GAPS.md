# RENDER_GAPS — what the renderer left, and how it folds back upstream

> The Codeplain render of `glassbox.plain` produced a near-complete app, but left **three
> classes of gap**: **4 mechanical compile gaps** (GAPs 1–4); **5 contract gaps** (GAPs 5–9)
> where the renderer invented a WRONG backend contract because the original spec described the
> endpoints abstractly without pinning the JSON field names; and **the FRID 12 switch link**
> (GAP 10), reproduced idempotently so the committed app carries it without a re-render. This
> file documents each one,
> the minimal deterministic fix applied by
> [`../scripts/post-render-patch.sh`](../scripts/post-render-patch.sh), and the **upstream fix**
> — the change to `glassbox.plain` (or the template) that would make the patch unnecessary on
> the next render. The discipline that matters for a spec-first project: **the real fix belongs
> in the spec, not in the generated code.**
>
> The compile gaps are confirmed by `cd web && npm run build` before the patch (errors) and
> after it (clean). The contract gaps are **silent** — they pass `npm run build` and only fail
> at runtime (HTTP 422 / crash on the live backend), so they were caught by a live headless
> drive (`/tmp/gbverify/drive_codeplain.mjs`), not by the compiler. The patch script is
> idempotent — re-running it is a verified no-op, and it heals all 10 from a fresh render.
> **[measured]**

> **Status (2026-06-21):** the contract gaps (5–9) are now PINNED upstream in `glassbox.plain`
> — `:Decision:`, `:AuditRecord:`, and the four endpoint definitions state the EXACT request
> and response field names. `codeplain glassbox.plain --dry-run` compiles clean (exit 0). The
> patch's GAP 5–9 steps remain as the deterministic safety net until a re-render is run against
> the pinned spec and verified. Live journey drive: **PASS** end-to-end (analyze → HOLD/85/High
> → debate → doubt expander → Prove it → receipt → tamper VERIFIED↔TAMPER (un-edited = MATCH)
> → Re-verify on Walrus 200).

---

## The four gaps

### GAP 1 — Missing `src/vite-env.d.ts` (TS2339)

The renderer reads the backend URL from `import.meta.env.VITE_API_BASE_URL` (in `config.ts` and
`hooks/useTradeAnalysis.ts`) but never emitted the Vite client-types declaration, so
`import.meta.env` is untyped and `tsc` errors with *Property 'env' does not exist on type
'ImportMeta'*.

- **Patch:** create the standard triple-slash `src/vite-env.d.ts` declaring
  `ImportMetaEnv.VITE_API_BASE_URL`.
- **Upstream fix:** the `typescript-react-app-template` should ship `vite-env.d.ts` (or
  Codeplain should emit it) whenever a spec reads `import.meta.env`. This is a **template/tooling
  gap**, not a `glassbox.plain` gap — the spec correctly *uses* the env var.

### GAP 2 — `App.tsx` verify state not destructured (TS2304)

`useTradeAnalysis` **returns** `verifyOnWalrus` / `isVerifying` / `verificationStatus`, and the
JSX **passes** them to `<DecisionView/>`, but `App.tsx`'s destructure stops at `rehashDecision`,
so those three names are undefined.

- **Patch:** insert the three names into the destructure, anchored on its unique closing line.
- **Upstream fix:** FRID 9 ("Re-verify on Walrus") describes the *behaviour* but the renderer
  wired only ~⅔ of the data path. Tightening FRID 9 to name the surfaced state (or splitting the
  verify wiring into its own FRID) gives the renderer an unambiguous target.

### GAP 3 — `DecisionView.tsx` verify props not destructured (TS2304)

Symmetric to GAP 2 one component down: `DecisionViewProps` **declares** `onVerify` /
`isVerifying` / `verificationStatus` and the JSX **forwards** them to `<AuditSection/>`, but the
component's parameter destructure stops at `onRehash`.

- **Patch:** insert the three names after `onRehash` in the **destructure** (the interface is
  already correct).
- **Upstream fix:** same as GAP 2 — the "Re-verify" data path crosses three components; a
  sharper FRID 9 closes all of it at once.

### GAP 4 — Dead code after a return in `AuditVerification.tsx` (TS2304 / TS1308 / TS2345)

`renderHighlightedHash()` ends correctly at its map's `});`, but the renderer duplicated a stale
change-handler body **after** it (unreachable) — referencing an undefined `e`, using `await`
outside an async function, and passing `string|null` to a `string` setState.

- **Patch:** delete only the dead block (from the stray `const newVal = e.target.value;` down to
  its `setLiveHash('INVALID_JSON');`), keeping the function's real body and closer. Bounded so it
  can only match this one contiguous block. The live handler above (`handleEdit`/`updateHash`) is
  untouched.
- **Upstream fix:** this is a **renderer artifact** (a duplicated fragment), not a spec
  ambiguity — worth reporting upstream to Codeplain; nothing in `glassbox.plain` invites it.

---

## The five contract gaps (the renderer invented a wrong API contract)

These are the gaps QA's `REPLICA_VERIFICATION.md` flagged as P0/P1. None of them is a compile
error — the rendered code type-checks against its OWN invented `types.ts`. They fail only at
runtime against the real backend (`server/glassbox/`). **Root cause: the original spec named the
endpoints and the Decision/AuditRecord concepts but never pinned the exact JSON field names, so
Codeplain guessed — and guessed wrong.** The fix is upstream: `glassbox.plain` now states the
exact field names; the patch (GAPs 5–9) is the safety net that overwrites the five
contract-bearing files with contract-correct versions, each guarded by a unique
`CONTRACT-PINNED (… GAP N)` sentinel so re-runs are no-ops.

### GAP 5 — `src/types.ts`: Decision/AuditRecord typed to invented fields
The renderer typed `Decision` with `bullCase`/`bearCase`, `winningSide.{side,reason}`,
`signalStrength.{percentage,band}`, `riskNote.{risk,suggestedSize}`, `inputs.{price,rsi,volatility,liquidity}`,
and `AuditRecord` with a **nested** `suiAnchor.{objectId,epoch}` + `walrusBlobId`. The backend
returns `bull.points[]`/`bear.points[]`, `winningSide` (a **string**) + `whyResolved`,
`signalStrengthPct` + `signalBand`, `suggestedSizePct`, `riskNote` (a **string**),
`inputs.{priceUsd,rsi14,realizedVolPercentile,deepbookTopDepthUsd,…}`, and a **flat**
`AuditRecord` (`recordId`, `recordHash`, `recordCanonical`, `signature`, `pubkey`, `sink`,
`blobId`, `suiObjectId`, `anchorEpoch`, `anchorNetwork`).
- **Patch:** write `types.ts` with the real shapes.
- **Upstream fix:** `:Decision:` and `:AuditRecord:` now enumerate the exact field names.

### GAP 6 — `src/hooks/useTradeAnalysis.ts`: wrong request bodies + verify field
Analyze posted `{text, asset, riskTolerance}` → **422** (backend wants `{goalText, asset, risk}`);
audit posted the bare decision and rehash the bare object (backend wants `{decision, goalText}`
and `{decision}`); off-topic was read as `isOffTopic` (backend sends `outOfScope` + `message`);
verify read `data.isValid` (backend returns `{hashMatch, signatureValid}`).
- **Patch:** correct all four bodies + the off-topic and verify field reads.
- **Upstream fix:** the four endpoint definitions now pin the request bodies, the `outOfScope`
  422 shape, and the `{hashMatch, signatureValid}` verify response.

### GAP 7 — `src/components/DecisionView.tsx`: renders invented fields
Read `decision.bullCase.map`, `decision.winningSide.side.toUpperCase()`,
`decision.signalStrength.percentage`, `decision.riskNote.suggestedSize`, `decision.inputs.price`
— all `undefined`/throw on the real payload.
- **Patch:** render `bull.points`/`bear.points`, the `winningSide` string + `whyResolved`,
  `signalStrengthPct`/`signalBand`, `suggestedSizePct`, the `riskNote` string, and the real
  `inputs.*`.
- **Upstream fix:** the analyze functional spec now names the exact fields to render.

### GAP 8 — `src/components/AuditVerification.tsx`: tamper demo hashed the wrong bytes
The renderer made the editable field `JSON.stringify(decision)` and recomputed "this record's
fingerprint" by POSTing it to `/api/rehash` — which would never match `recordHash` (the backend
canonicalizes server-side), so an un-edited record showed a false TAMPER.
- **Patch:** the editable field holds the `recordCanonical` bytes; "this record's fingerprint"
  is recomputed client-side with **Web Crypto SHA-256** (lowercase hex), exactly like the
  original UI (`server/glassbox/static/index.html`). Confirmed: `sha256(recordCanonical) ===
  recordHash`, so an un-edited record shows **MATCH/VERIFIED**; a one-char edit flips to
  **TAMPER**; Reset returns to VERIFIED. **[measured]**
- **Upstream fix:** the tamper functional specs + `:AuditRecord:` now state that the fingerprint
  is the Web-Crypto SHA-256 of the edited `recordCanonical`, and that the rehash endpoint is NOT
  used by the demo.

### GAP 9 — `src/components/AuditSection.tsx`: nested AuditRecord + wrong verify id
Read `auditRecord.walrusBlobId`/`auditRecord.suiAnchor.objectId` (undefined → "Local Fallback",
no Sui link) and called `onVerify(auditRecord.recordHash)` — the **full** hash, but
`/api/verify/{id}` keys on the **short** `recordId` (`{"error":"unknown recordId"}`).
- **Patch:** use flat `sink`/`blobId`/`suiObjectId`/`anchorEpoch`, and pass
  `auditRecord.recordId` to `onVerify`.
- **Upstream fix:** `:AuditRecord:` is flat and `:VerifyEndpoint:` pins `{recordId}` = the short
  id + the `{hashMatch, signatureValid}` response.

---

## The switch link (GAP 10)

### GAP 10 — FRID 12 "View the original UI ↗" header link
`render.log` captured the render of FRIDs 1–11; FRID 12 (the side-by-side switch) was added to
`glassbox.plain` as a single sentence afterward. A fresh render of the current 12-FRID spec emits
the link directly, but the committed `web/` snapshot predates that render, so the patch reproduces
it.
- **Patch:** insert the labelled "View the original UI ↗" header link into `App.tsx`, reading
  `import.meta.env.VITE_ORIGINAL_UI_URL` (default `http://localhost:8787/`), guarded by a unique
  sentinel so a re-run is a no-op. This pairs with the original UI's own "⇄ Codeplain UI ↗" link
  back to `:5173/`, so the switch is **live both ways**. **[measured]**
- **Upstream fix:** none needed — this is FRID 12 in the spec; a fresh render emits it, at which
  point GAP 10 becomes a verified no-op like the others.

---

### Note — breaking the concept cycle in the spec
Pinning the contract initially introduced a `--dry-run` error: *"Found cycles in the concept
graph"* because `:AuditRecord:` referenced `:VerifyEndpoint:` (which references `:AuditRecord:`).
Fixed by phrasing the Record Id description without naming `:VerifyEndpoint:` (the forward
reference lives only in `:VerifyEndpoint:`). `--dry-run` then exits 0.

---

## Why a patch script instead of hand-edits

A spec-first project must keep the generated code **disposable**. Hand-editing `web/` would rot
the moment anyone re-renders. So the gaps live in **one deterministic, idempotent script** that:

- is **safe to re-run** (every step is guarded; a second run reports "nothing to do"),
- is the **documented bridge** while the upstream fixes land, and
- keeps the **spec as the single source of truth** — `glassbox.plain` + the patch script fully
  reproduce a clean build from scratch.

```bash
CODEPLAIN_API_KEY=<key> codeplain glassbox.plain --force-render --headless
./scripts/post-render-patch.sh
cd web && npm run build      # tsc && vite build → clean
```

## Gap classification (for the upstream report)

| Gap | Class | Root cause | Fix lives in |
|---|---|---|---|
| 1 — missing `vite-env.d.ts` | compile | template/tooling omission | Codeplain template |
| 2 — `App.tsx` destructure | compile | partial wiring of FRID 9 | spec (sharpen FRID 9) |
| 3 — `DecisionView.tsx` destructure | compile | partial wiring of FRID 9 | spec (sharpen FRID 9) |
| 4 — dead code after return | compile | renderer artifact (duplicated fragment) | Codeplain renderer |
| 5 — `types.ts` invented Decision/AuditRecord | **contract** | spec never pinned field names | **spec** (`:Decision:`/`:AuditRecord:` — now pinned) |
| 6 — `useTradeAnalysis.ts` wrong request bodies | **contract** | spec never pinned request shapes | **spec** (4 endpoint defs — now pinned) |
| 7 — `DecisionView.tsx` renders invented fields | **contract** | spec never pinned field names | **spec** (analyze functional spec — now pinned) |
| 8 — tamper hashed re-serialized decision | **contract** | spec didn't say *what bytes* to hash | **spec** (tamper specs + `:AuditRecord:` — now pinned) |
| 9 — `AuditSection.tsx` nested record + full-hash verify | **contract** | spec never pinned flat record + short id | **spec** (`:AuditRecord:`/`:VerifyEndpoint:` — now pinned) |
| 10 — FRID 12 switch link | snapshot | `web/` predates the FRID-12 render | **spec** (FRID 12 — a fresh render emits it) |

The four compile gaps split tooling/renderer/spec; **all five contract gaps trace to one root
cause — the spec described the endpoints abstractly and never pinned the JSON field names**, so
the renderer guessed and guessed wrong. That root cause is now fixed in `glassbox.plain`
(`--dry-run` clean). The patch's GAP 5–9 steps remain the deterministic safety net until a
re-render against the pinned spec is run and verified — at which point they should become
verified no-ops, like GAPs 1–4 already are when the renderer happens to emit clean output.
