# BUILD_LOG — the spec-first journey, stage by stage

> This is the **33% spec-quality** evidence: how a 96-line plain-language spec
> (`glassbox.plain`) became a **dark, on-brand, working React app**, FRID by FRID. Read it
> alongside [`render4.log`](./render4.log) (the successful v2 render transcript),
> [`render3.log`](./render3.log) (the complexity-error that taught us to keep the spec concise),
> and the spec itself.
>
> Tags: **[measured]** = from this repo / git / the Codeplain CLI. **[estimate]** = reasoned.

---

## Stage 0 — Author the spec, not the code

The human deliverable is **`glassbox.plain`** — **96 lines** [measured], built on Codeplain's
`typescript-react-app-template`. It is structured like a product brief, not a program:

- **`***definitions***`** — the domain in plain English: `:User:`, `:Goal:`, `:Decision:`,
  `:AuditRecord:`, `:EvidenceCount:`, and the four backend endpoints (`:AnalyzeEndpoint:`,
  `:AuditEndpoint:`, `:VerifyEndpoint:`, `:RehashEndpoint:`). A non-engineer can read this and
  know exactly what the app traffics in. `:Decision:`, `:AuditRecord:`, and the four endpoints
  also **pin the exact backend JSON field names** in prose — still readable English, but precise
  enough that the renderer can't invent a wrong contract.
- **`***implementation reqs***`** — the two env-var defaults (`VITE_API_BASE_URL`,
  `VITE_ORIGINAL_UI_URL`) **plus a concise design block**: the dark token palette (page #090c12,
  card #121821, green #2ed573 / red #ff4d5e / amber #ffc24d / violet #7c5cff / teal #21d4c4), the
  **64px coloured verdict hero** (green BUY / amber HOLD / red AVOID), the green/red Bull/Bear
  cards, and the **asymmetric VERIFIED/TAMPER climax** (TAMPER is the biggest state on the page).
  The block is deliberately *short* — the full pixel detail lives in `resources/ui_reference.md`,
  which the spec points at (see Stage 1.5 for why that split matters).
- **`***functional specs***`** — **12 FRIDs** (Functional Requirement IDs), each one sentence
  of intent. This is the screenplay the renderer follows.

The full visual brief lives outside the spec in `resources/ui_reference.md` (**215 lines**,
distilled from a 4-lens design review) and the working reference implementation is the original
`server/glassbox/static/index.html`. The spec *points at* both, so the renderer inherits the
design intent without the human re-describing every pixel inside the spec.

---

## Stage 1 — Dry-run: catch the bug before spending a credit

```bash
codeplain glassbox.plain --dry-run
```

**One spec bug, caught here, fixed in seconds** [measured]:

```diff
-  - Asset - the market to analyze. For this version the only valid :Asset: is "SUI/USDC".
+  - Asset - the market to analyze. For this version the only valid Asset is "SUI/USDC".
```

`:Asset:` was written as a **concept token** (the `:Name:` syntax) but never *defined* as one —
`Asset` is an attribute of `:Goal:`, not a standalone concept. The dry-run flagged the
undefined reference. The fix was a two-character delete. (A second `--dry-run` issue — a concept
cycle introduced *by* pinning the contract, `:AuditRecord:` ↔ `:VerifyEndpoint:` — was caught and
fixed the same way.) **No render credits burned on a broken spec.** This is the spec-first
feedback loop working exactly as intended: a compiler for intent.

---

## Stage 1.5 — The complexity-error lesson: keep the spec concise, point at the brief

This is a genuine, spec-driven lesson worth featuring. The **first attempt at the dark design**
put **all** the design detail — the full token palette, every measurement, all the staging —
directly into the spec's `***implementation reqs***`. Codeplain has a per-functionality
complexity budget, and that dense block blew it. The render **failed at FRID 3** with a hard
`COMPLEXITY_ERROR` ([`render3.log`](./render3.log)):

```
[00:01:23] ERROR codeplain: {'error': {'message': '... is too complex to be implemented.
Please break down the functionality into smaller parts ...', 'type': 'COMPLEXITY_ERROR',
'details': {'frid': '3', ...}}}
```

The fix is the standard Codeplain discipline (the same one the reference repo teaches as "split
big FRIDs to fit the renderer's complexity limit"): **keep the heavy detail in
`resources/ui_reference.md` and put only CONCISE, high-impact directives in the spec.** We
trimmed the impl-reqs to the token list, the 64px coloured hero, the green/red Bull/Bear cards,
and the asymmetric VERIFIED/TAMPER climax — pointing the renderer at `ui_reference.md` for the
rest. The re-render then completed **all 12 FRIDs in one pass** ([`render4.log`](./render4.log)).
The complexity limit wasn't a defect — it was a forcing function toward the right architecture:
**a concise spec that points at a detailed design brief.**

---

## Stage 2 — Render: watch the dark UI grow from the spec

```bash
CODEPLAIN_API_KEY=<key> codeplain glassbox.plain --force-render --headless
```

Codeplain renders the boilerplate entry point, then walks the FRIDs **in order**, refactoring
the generated code after each one. The full transcript is [`render4.log`](./render4.log). The
sequence below is the "watch the dashboard assemble itself" reveal — each line is one FRID's
intent (one English sentence in the spec):

| FRID | Intent (the one sentence the renderer turned into React) |
|---|---|
| **1** | Header: name "GlassBox", the Bull/Bear tagline, a 3-step guide (Ask → verdict → prove it), and the running `Evidence records: N retained` count. |
| **2** | The standing legal disclaimer beneath every decision — exact, verbatim text (educational tool, high-risk asset, "signal strength is not a probability of profit"). |
| **3** | The goal form: enter a question, asset fixed to SUI/USDC, pick a risk tolerance; reject text shorter than 5 chars with an inline error. |
| **4** | On submit: call `/api/analyze`, show **progress** (not a static spinner) while the agents debate, then render the **64px coloured Verdict hero** + Signal Strength band + position size; reveal the debate first, the verdict a beat later. |
| **5** | The relevance gate: if the input isn't an investing question about SUI/USDC, **do not** produce a decision — show a friendly redirect and keep the user's text. |
| **6** | "Prove it" button → call `/api/audit`, bump `EvidenceCount`, render the signed receipt: record hash, signed-origin line, Walrus chip, on-chain Sui object id linked to an explorer. |
| **7** | After proving: show the signed record in an editable field with **two fingerprints** — the anchored one (fixed) and this record's (live). Identical → green **VERIFIED**; differ → red **TAMPER DETECTED**. Never colour alone. |
| **8** | **The climax.** Edit the record — one changed character instantly recomputes the live fingerprint, flips to **TAMPER DETECTED**, and highlights the differing characters. "Reset" restores; "Try to alter it" does it for you. Make the mismatch the largest state. |
| **9** | "Re-verify on Walrus" → call `/api/verify/{id}`, re-fetch from storage, confirm the anchored fingerprint is intact and the signature valid, as a short confirmation line. |
| **10** | Claim discipline: never use "tamper-proof" or "provable to anyone" anywhere — only "tamper-evident" and "verify". |
| **11** | Every API call shows loading / empty / error states; the app never shows a blank screen on failure. |
| **12** | **The switch.** A header link "View the original UI ↗" that opens the hand-built original at `VITE_ORIGINAL_UI_URL`, so a viewer can flip between the Codeplain-rendered UI and the original at the press of a button. |

### Render results [measured]

- **Wall-clock:** ~4 min 7 s (render-log timestamps `00:00:00 → 00:04:07`).
- **The render came out DARK and on-brand:** page background #090c12, the verdict hero **64px**
  coloured by outcome (BUY green / HOLD amber / AVOID red), cards #121821, green/red Bull/Bear
  cards, the asymmetric VERIFIED/TAMPER climax. The full dark token palette is emitted as CSS
  variables in `web/src/App.css`; the hero is `verdict-text { font-size: 64px }` in
  `web/src/Components.css`.
- **Rendered output (committed):** **703 LOC** of React/TS in `web/src` (`wc`, excl. deps) **+ 460
  lines of CSS** (`App.css` 178 + `Components.css` 282, incl. the dark token system) — *as large
  as* the 709-line hand-tuned original, because it's a full component tree + state + typed API
  client + a dark CSS design system.
- **Leverage:** ~7.3× (703 ts/tsx ÷ 96 spec lines), ~12.1× counting the 460 CSS lines, ~58.6×
  against the 12 FRIDs [measured — line ratio].
- **Complexity-limit hits:** 1 (the dense-design attempt, `render3.log`), then **0** after moving
  the detail to `ui_reference.md` (`render4.log` — all 12 FRIDs in one pass).
- **Credits:** v1 plain render **12**, the failed dense-design attempt **~4**, the successful
  concise-design render **12** → **28 of 50 used, 22 remaining** [measured].

---

## Stage 3 — Post-render patch: only 3 gaps now (down from 10)

```bash
./scripts/post-render-patch.sh
```

The v2 render produced a near-complete app with only **3 small gaps** — down from 10 in the v1
render. The script applies the minimal deterministic, idempotent fix for each [measured — exactly
what `npm run build` reported and what the script repairs]:

1. **GAP 1 — missing `src/vite-env.d.ts`** → `import.meta.env.VITE_*` was untyped (TS2339). The
   script (re)writes the standard triple-slash declaration for both env vars.
2. **GAP 2 — `Decision` not re-exported (TS2459, the build blocker)** → `App.tsx` imports
   `{ AnalysisResults, Decision }` from `'./components/AnalysisResults'`, but that module only
   *imports* `Decision` from `'./AnalysisTypes'` and never re-exports it. The script appends a
   one-line `export type { Decision } from './AnalysisTypes';`.
3. **GAP 3 — FRID-12 switch link** → normalize the header "View the original UI ↗" link
   (`cp-switch` class, spec wording, `VITE_ORIGINAL_UI_URL`), heal-from-scratch if the renderer
   omitted it.

After the patch, `cd web && npm run build` passes: `tsc && vite build` → **built in ~0.5 s**
(502 ms) [measured].

**There are NO contract gaps this time.** In v1 the renderer invented a wrong backend contract
(5 contract gaps → HTTP 422 / false TAMPER), because the spec named the endpoints abstractly. The
spec now pins the exact field names, so the v2 render emitted the **correct** contract — confirmed
by a live drive (next stage). The patch script's own header comment states this: *"there are NO
contract-rewrite GAPs here, unlike older renders."* That is the headline: **the better the spec,
the cleaner the render.**

---

## Stage 3.5 — QA drove it live: PASS end-to-end, no contract surprises

With the build green, QA/engineer drove the rendered dark replica against the **real backend**.
Unlike v1 (where the live drive exposed an invented contract), the v2 render **passed every call**
— because the contract is pinned in the spec. The full live journey is **PASS end-to-end**
[measured]:

Analyze → Decision (HOLD, signal 85 High, 13% size) → Bull/Bear debate → "why you should doubt
this" expander → disclaimer → Prove it → audit receipt (hash, signature, Walrus·Sui chip + object
link) → tamper **VERIFIED↔TAMPER** (edit → TAMPER, reset → VERIFIED, un-edited = MATCH) →
Re-verify on Walrus (200). All calls 200 (or the intended 422 on off-topic input).

The contract pinning that made this clean is the permanent fix, in the spec: `glassbox.plain`'s
`:Decision:` enumerates `bull.points`, `signalStrengthPct`, `signalBand`, `suggestedSizePct`,
`winningSide` as a *string* + `whyResolved`, the real `inputs.*`; `:AuditRecord:` is flat
(`recordId`/`recordHash`/`recordCanonical`/`signature`/`pubkey`/`blobId`/`sink`/`suiObjectId`/
`anchorEpoch`); and the four endpoints pin the request bodies, the `outOfScope` 422, the
`{hashMatch, signatureValid}` verify response, and the tamper demo hashing the edited
`recordCanonical` client-side with Web Crypto (**not** the rehash endpoint).

The full gap-by-gap breakdown is in [`RENDER_GAPS.md`](./RENDER_GAPS.md). The patch script is
**deterministic and idempotent** across all three gaps — each fix is guarded so a second run is a
clean no-op [measured — a second run reports "nothing to do (already patched)"], and it heals all
three from a fresh render.

---

## Stage 4 — The switch is live, both ways (FRID 12 / patch GAP 3)

The spec's final FRID is the side-by-side comparison itself: a header link **"View the original
UI ↗"** pointing at `VITE_ORIGINAL_UI_URL`. It is **live in both directions**: the original UI
(`:8787/`) carries a "⇄ Codeplain UI ↗" link, and the Codeplain app (`:5173/`) carries the FRID 12
link back. A judge running both servers (backend `:8787`, React `:5173`) flips between the
**spec-rendered** dark frontend and the **hand-built** original with one click, either way — the
cleanest possible proof of the bounty's thesis: **Claude to spec + Codeplain to build beats
hand-prompting code, and the spec stays readable by a non-engineer.** In the committed repo the
link is emitted by the render and normalized by the patch's **GAP 3** (idempotent,
heal-from-scratch verified).

---

## The journey in one sentence

A non-engineer-readable, 96-line spec (now carrying concise dark-design directives + a pinned
contract) → dry-run (1 bug, fixed) → a first dense-design render that hit Codeplain's
`COMPLEXITY_ERROR` at FRID 3, taught us to move the pixel detail into `resources/ui_reference.md`
→ a clean re-render of all 12 FRIDs into a **dark, on-brand React app** (~4 min, ~703 LOC + 460
CSS) → just **3 idempotent patch gaps and zero contract rewrites** (down from 10) → QA drove it
live, **PASS end-to-end** → a one-button switch to the original, both ways — versus 709
hand-written lines built over 15 commits and 2 days of multi-agent passes. **The better the spec,
the cleaner the render: pinning the contract and the design in the spec turned 10 gaps into 3 and
made the render come out on-brand.**
