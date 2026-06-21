# RENDER_GAPS — what the v2 dark render left, and how it folds back upstream

> The v2 "dark design" render of `glassbox.plain` produced a **dark, on-brand, working app** and
> left only **3 small gaps** — down from 10 in the v1 render. There are **no contract gaps this
> time**: because the spec now pins the exact backend JSON field names, the renderer emitted the
> correct contract, and the live journey passed end-to-end without any contract rewrite. The three
> remaining gaps are: **(1)** the Vite client-types declaration, **(2)** a one-line `Decision`
> re-export, and **(3)** the FRID-12 switch-link normalization. This file documents each one, the
> minimal deterministic fix applied by
> [`../scripts/post-render-patch.sh`](../scripts/post-render-patch.sh), and the **upstream fix** —
> the change to `glassbox.plain` (or the template) that would make the patch unnecessary on the
> next render. The discipline that matters for a spec-first project: **the real fix belongs in the
> spec, not in the generated code.**
>
> The headline insight of v2: **the better the spec, the cleaner the render.** v1 left 10 gaps
> (4 mechanical + 5 invented-contract + the switch link) because the spec described the endpoints
> abstractly. Once the contract AND the design were pinned in the spec, the render came out dark,
> on-brand, and contract-correct, and the patch shrank to 3 idempotent gaps. **[measured]**

> **Status (2026-06-21):** `codeplain glassbox.plain --dry-run` compiles clean (exit 0).
> `cd web && npm run build` is clean (`tsc && vite build` ✓ in ~0.5 s). Live journey drive:
> **PASS** end-to-end (analyze → HOLD/85/High → debate → doubt expander → Prove it → receipt →
> tamper VERIFIED↔TAMPER (un-edited = MATCH) → Re-verify on Walrus 200). The render is **dark and
> on-brand** (page #090c12, 64px coloured verdict hero, #121821 cards, green/red Bull/Bear cards,
> asymmetric VERIFIED/TAMPER).

---

## First, the complexity-error lesson (why the spec stays concise)

The first v2 attempt put **all** the design detail (the full token palette, every measurement,
all the staging) directly into the spec's `***implementation reqs***`. Codeplain hit a hard
limit and **failed at FRID 3** (`render3.log`):

```
ERROR codeplain: {'error': {'message': '... is too complex to be implemented. Please break
down the functionality into smaller parts ...', 'type': 'COMPLEXITY_ERROR',
'details': {'frid': '3', ...}}}
```

The renderer has a per-functionality complexity budget; an impl-reqs block that tries to specify
every pixel blows it. We fixed it the standard Codeplain way — **keep the heavy detail in
`resources/ui_reference.md` (215 lines) and put only CONCISE, high-impact directives in the
spec** (the token list, the 64px coloured hero, the green/red Bull/Bear cards, the asymmetric
VERIFIED/TAMPER climax). The re-render (`render4.log`) then completed **all 12 FRIDs in one
pass**. This mirrors the reference repo's "split big FRIDs to fit the renderer's complexity
limit" — the limit isn't a defect, it's a forcing function toward the right architecture: a
concise spec that *points at* a detailed design brief.

---

## The three gaps

### GAP 1 — Vite client types missing / incomplete (TS2339)

`import.meta.env.VITE_API_BASE_URL` and `.VITE_ORIGINAL_UI_URL` are read in `src/App.tsx` (and
`AuditReceiptView.tsx`), but if the renderer doesn't emit `src/vite-env.d.ts`, `import.meta.env`
is untyped and `tsc` errors with *Property 'env' does not exist on type 'ImportMeta'*.

- **Patch:** (re)write the standard triple-slash `src/vite-env.d.ts` declaring **both**
  `VITE_API_BASE_URL` and `VITE_ORIGINAL_UI_URL`. Guarded on the presence of the
  `VITE_ORIGINAL_UI_URL` declaration, so a complete file is a no-op; heals from scratch if absent.
- **Upstream fix:** the `typescript-react-app-template` should ship `vite-env.d.ts` (or Codeplain
  should emit it) whenever a spec reads `import.meta.env`. This is a **template/tooling gap**, not
  a `glassbox.plain` gap — the spec correctly *uses* the env vars.

### GAP 2 — `AnalysisResults.tsx` does not re-export `Decision` (TS2459) — the build blocker

`App.tsx` imports `{ AnalysisResults, Decision }` from `'./components/AnalysisResults'`, but that
module only **imports** `Decision` from `'./AnalysisTypes'` and never re-exports it, so `tsc`
errors: *Module './components/AnalysisResults' declares 'Decision' locally, but it is not
exported.*

- **Patch:** append `export type { Decision } from './AnalysisTypes';` to `AnalysisResults.tsx`
  (anchored on its unique `AuditReceiptView` import line; EOF fallback if the anchor moves).
  Guarded on a sentinel and only applied when `App.tsx` actually imports `Decision` from this
  module and it isn't re-exported yet.
- **Upstream fix:** a **renderer artifact** — the renderer split the types into `AnalysisTypes.tsx`
  but had `App.tsx` import the type from `AnalysisResults.tsx` without threading the re-export.
  Worth reporting upstream; nothing in `glassbox.plain` invites it.

### GAP 3 — FRID 12: the "View the original UI" switch link

The spec's FRID 12 (the side-by-side UI switch) wants a header link reading **"View the original
UI ↗"** pointing at `VITE_ORIGINAL_UI_URL` (default the backend's bundled original UI at
`http://localhost:8787/`). The renderer is inconsistent: it may emit the link with slightly
different text/markup, or omit it.

- **Patch:** normalize to the spec. Three heal paths, all guarded on a `cp-switch` class sentinel
  (a correct link is a no-op): (a) a `cp-switch` link already present → skip; (b) an original-UI
  anchor exists but isn't normalized → add the `cp-switch` class + spec text; (c) no anchor →
  inject a labelled `cp-switch` link right after `<h1>GlassBox</h1>`. This pairs with the original
  UI's own "⇄ Codeplain UI ↗" link back to `:5173/`, so the switch is **live both ways**.
  **[measured]**
- **Upstream fix:** none needed in principle — this is FRID 12; a render emits the link, and GAP 3
  becomes a verified no-op when the renderer happens to emit the exact spec wording. The patch just
  normalizes the wording/markup deterministically.

---

## Why no contract gaps this time

v1 left **5 contract gaps** (GAPs 5–9 in the old version of this doc) where the renderer
**invented a wrong backend contract** — `{text, riskTolerance}` instead of `{goalText, asset,
risk}`, nested `suiAnchor` instead of flat `suiObjectId`/`anchorEpoch`, a tamper demo that hashed
the wrong bytes, etc. Those failed silently at compile time and only blew up at runtime (HTTP
422 / false TAMPER on an un-edited record).

The root cause was that the spec named the endpoints abstractly without pinning the JSON field
names. **That is now fixed in the spec:** `:Decision:`, `:AuditRecord:`, and the four endpoint
definitions in `glassbox.plain` enumerate the **exact** request/response field names (e.g.
`{goalText, asset, risk}`; `bull.points`/`signalStrengthPct`/`winningSide` as a *string*; a
**flat** `recordId`/`recordHash`/`recordCanonical`/`suiObjectId`/`anchorEpoch`; verify →
`{hashMatch, signatureValid}`; the tamper demo hashing the edited `recordCanonical` client-side
with Web Crypto, **not** the rehash endpoint). The v2 render emitted the **correct** contract, and
the live drive passed end-to-end — so the patch script carries **no contract-rewrite GAPs** at
all. The patch's own header comment states this explicitly. That is the spec-first thesis paying
off: tighten the spec once, and the render stops guessing wrong.

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

The Codeplain renderer is **non-deterministic** — each render's component structure differs, so
the exact compile gaps vary run-to-run. The current script targets **this render's** structure
(`App.tsx` owns the form + analyze fetch inline; `AnalysisResults.tsx` holds the debate grid +
verdict hero; `AnalysisTypes.tsx` the types; `AuditReceiptView.tsx` the receipt + tamper demo) and
each step heals from scratch.

```bash
CODEPLAIN_API_KEY=<key> codeplain glassbox.plain --force-render --headless
./scripts/post-render-patch.sh
cd web && npm run build      # tsc && vite build → clean (~0.5 s)
```

## Gap classification (for the upstream report)

| Gap | Class | Root cause | Fix lives in |
|---|---|---|---|
| 1 — missing `vite-env.d.ts` | compile | template/tooling omission | Codeplain template |
| 2 — `Decision` not re-exported from `AnalysisResults.tsx` | compile | renderer artifact (split types, un-threaded re-export) | Codeplain renderer |
| 3 — FRID 12 switch link wording/markup | snapshot | renderer emits inconsistent text | **spec** (FRID 12 — a render emits it; patch normalizes) |

**There are no contract gaps in v2.** All five of v1's contract gaps traced to one root cause —
the spec described the endpoints abstractly and never pinned the JSON field names — and that root
cause is now fixed in `glassbox.plain` (`--dry-run` clean, live drive PASS). The remaining three
gaps are two minor compile fix-ups (one template, one renderer artifact) and one cosmetic
link-wording normalization. **The better the spec, the cleaner the render — 10 gaps became 3.**
