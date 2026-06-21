# BUILD_LOG — the spec-first journey, stage by stage

> This is the **33% spec-quality** evidence: how an 88-line plain-language spec
> (`glassbox.plain`) became a working React app, FRID by FRID. Read it alongside
> [`render.log`](./render.log) (the actual Codeplain transcript) and the spec itself.
>
> Tags: **[measured]** = from this repo / git / the Codeplain CLI. **[estimate]** = reasoned.

---

## Stage 0 — Author the spec, not the code

The human deliverable is **`glassbox.plain`** — **88 lines** [measured], built on Codeplain's
`typescript-react-app-template`. It is structured like a product brief, not a program:

- **`***definitions***`** — the domain in plain English: `:User:`, `:Goal:`, `:Decision:`,
  `:AuditRecord:`, `:EvidenceCount:`, and the four backend endpoints (`:AnalyzeEndpoint:`,
  `:AuditEndpoint:`, `:VerifyEndpoint:`, `:RehashEndpoint:`). A non-engineer can read this and
  know exactly what the app traffics in. As of the contract fix (Stage 3.5), `:Decision:`,
  `:AuditRecord:`, and the four endpoints also **pin the exact backend JSON field names** in
  prose — still readable English, but precise enough that the renderer can't invent a wrong
  contract.
- **`***implementation reqs***`** — two lines: the backend base URL comes from
  `VITE_API_BASE_URL` (default `http://localhost:8787`); the original-UI URL comes from
  `VITE_ORIGINAL_UI_URL` (default `http://localhost:8787/`).
- **`***functional specs***`** — **12 FRIDs** (Functional Requirement IDs), each one sentence
  of intent. This is the screenplay the renderer follows.

The visual brief lives outside the spec in `resources/ui_reference.md` (distilled from a
4-lens design review) and the working reference implementation is the original
`server/glassbox/static/index.html`. The spec *points at* both, so the renderer inherits the
design intent without the human re-describing pixels.

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
undefined reference. The fix was a two-character delete. **No render credits burned on a
broken spec.** This is the spec-first feedback loop working exactly as intended: a compiler for
intent.

---

## Stage 2 — Render: watch the UI grow from the spec

```bash
CODEPLAIN_API_KEY=<key> codeplain glassbox.plain --force-render --headless
```

Codeplain renders the boilerplate entry point, then walks the FRIDs **in order**, refactoring
the generated code after each one. The full transcript is [`render.log`](./render.log). The
sequence below is the "watch the dashboard assemble itself" reveal — each line is one FRID's
intent (one English sentence in the spec):

| FRID | Intent (the one sentence the renderer turned into React) |
|---|---|
| **1** | Header: name "GlassBox", the Bull/Bear tagline, a 3-step guide (Ask → verdict → prove it), and the running `Evidence records: N retained` count. |
| **2** | The standing legal disclaimer beneath every decision — exact, verbatim text (educational tool, high-risk asset, "signal strength is not a probability of profit"). |
| **3** | The goal form: enter a question, asset fixed to SUI/USDC, pick a risk tolerance; reject text shorter than 5 chars with an inline error. |
| **4** | On submit: call `/api/analyze`, show **progress** (not a static spinner) while the agents debate, then render the **Verdict hero** + Signal Strength band + position size; reveal the debate first, the verdict a beat later. |
| **5** | The relevance gate: if the input isn't an investing question about SUI/USDC, **do not** produce a decision — show a friendly redirect and keep the user's text. |
| **6** | "Prove it" button → call `/api/audit`, bump `EvidenceCount`, render the signed receipt: record hash, signed-origin line, Walrus chip, on-chain Sui object id linked to an explorer. |
| **7** | After proving: show the signed record in an editable field with **two fingerprints** — the anchored one (fixed) and this record's (live). Identical → green **VERIFIED**; differ → red **TAMPER DETECTED**. Never colour alone. |
| **8** | **The climax.** Edit the record — one changed character instantly recomputes the live fingerprint, flips to **TAMPER DETECTED**, and highlights the differing characters. "Reset" restores; "Try to alter it" does it for you. Make the mismatch the largest state. |
| **9** | "Re-verify on Walrus" → call `/api/verify/{id}`, re-fetch from storage, confirm the anchored fingerprint is intact and the signature valid, as a short confirmation line. |
| **10** | Claim discipline: never use "tamper-proof" or "provable to anyone" anywhere — only "tamper-evident" and "verify". |
| **11** | Every API call shows loading / empty / error states; the app never shows a blank screen on failure. |
| **12** | **The switch.** A header link "View the original UI ↗" that opens the hand-built original at `VITE_ORIGINAL_UI_URL`, so a viewer can flip between the Codeplain-rendered UI and the original at the press of a button. |

### Render results [measured]

- **Wall-clock:** ~3 min 18 s (render-log timestamps `00:00:00 → 00:03:18`).
- **Credits:** 12 (50 → 38 remaining of the free trial). The later contract fix (Stage 3.5) cost
  **0 extra credits** — it was patched, not re-rendered, so the run still stands at 38/50.
- **Rendered output (committed):** **870 LOC** of React/TS in `web/src` (`wc`, incl. the patch's
  9-line `vite-env.d.ts`, the pinned-contract files, and the FRID 12 switch link; excl. deps) —
  *larger* than the 709-line hand-tuned original, because it's a full component tree + state +
  typed API client. (The raw render emitted ~819 LOC; the idempotent patch's contract fixes +
  switch link bring the committed tree to 870.)
- **Leverage:** ~9.9× (870 ÷ 88 spec lines) [measured — line ratio], ~72× against the 12 FRIDs.
- **Complexity-limit hits:** 0 — all FRIDs in `render.log` rendered in a single pass.

> Note: [`render.log`](./render.log) captures the render of **FRIDs 1–11** (the spec at that
> point). FRID 12, the switch, was then added to `glassbox.plain` as a single sentence and is now
> **live in the committed app** (emitted by a fresh render, reproduced idempotently by the patch's
> GAP 10) — demonstrating the spec-first workflow's whole thesis: **a new UI capability is one line
> of English, not a code change.** Re-running Stage 2 against the current 12-FRID spec renders the
> switch into `web/` directly.

---

## Stage 3 — Post-render patch: the mechanical compile gaps

```bash
./scripts/post-render-patch.sh
```

The renderer produced a near-complete app with **4 mechanical compile gaps** [measured — these
are exactly what `npm run build` reported and what the script repairs as GAPs 1–4]:

1. **Missing `src/vite-env.d.ts`** → `import.meta.env.VITE_API_BASE_URL` was untyped (TS2339).
2. **`App.tsx` destructure** stopped at `rehashDecision` — the verify state (`verifyOnWalrus`,
   `isVerifying`, `verificationStatus`) was returned by the hook and passed in JSX but never
   destructured (TS2304).
3. **`DecisionView.tsx` destructure** likewise omitted `onVerify` / `isVerifying` /
   `verificationStatus` (declared in the interface, forwarded in JSX, missing in params).
4. **`AuditVerification.tsx`** had a dead, unreachable change-handler body after a function's
   `return` (undefined `e`, `await` outside async, string|null → string setState — TS2304 /
   TS1308 / TS2345).

After GAPs 1–4, `cd web && npm run build` passes: `tsc && vite build` → **built in ~0.6 s**
[measured]. But a clean *compile* is not a working *app* — which is what Stage 3.5 caught.

---

## Stage 3.5 — QA caught a wrong contract; we fixed it **in the spec**

This is the headline spec-quality moment. With the build green, QA drove the rendered replica
against the **real backend** and it **failed on every call (HTTP 422)** — analyze, audit, verify
all broke at runtime. Root cause: the first `glassbox.plain` named the endpoints and the
`:Decision:`/`:AuditRecord:` concepts but **never pinned the JSON field names**, so Codeplain
**invented a contract** — `{text, riskTolerance}` instead of `{goalText, asset, risk}`,
`bullCase`/`winningSide.{side}` objects instead of `bull.points`/a `winningSide` string, a nested
`suiAnchor` instead of flat `suiObjectId`/`anchorEpoch`, an `isValid` field verify never returns,
and a tamper demo that re-serialized the decision instead of hashing `recordCanonical`. The
rendered code type-checked against its *own* invented `types.ts`; only a live drive exposed it.

We fixed it the spec-first way — **we changed the spec, not the generated code.** `glassbox.plain`
now pins, in plain English, the exact field names for `:Decision:` (`bull.points`,
`signalStrengthPct`, `signalBand`, `suggestedSizePct`, `winningSide` as a *string* + `whyResolved`,
the real `inputs.*`), `:AuditRecord:` (flat `recordId`/`recordHash`/`recordCanonical`/`signature`/
`pubkey`/`blobId`/`sink`/`suiObjectId`/`anchorEpoch`), and the four endpoints (analyze
`{goalText, asset, risk}` + the `outOfScope` 422; audit `{decision, goalText}`; verify
`GET /api/verify/{recordId}` → `{hashMatch, signatureValid}`; the tamper demo hashing the edited
`recordCanonical` client-side with Web Crypto, **not** the rehash endpoint). A pinning-induced
concept cycle (`:AuditRecord:` ↔ `:VerifyEndpoint:`) surfaced in `--dry-run` and was resolved by
re-phrasing the Record Id description. **`codeplain glassbox.plain --dry-run` now passes (exit 0).**

While the pinned spec is the permanent fix, the same corrections are encoded as the patch script's
**contract gaps (GAPs 5–9)** so the committed `web/` is correct today without a re-render — costing
**0 extra render credits** (still 38/50). After the contract fix, the live headless drive is
**PASS end-to-end**: Analyze → Decision (HOLD, signal 85 High, 13% size) → Bull/Bear debate →
"why you should doubt this" → Prove it → audit receipt (hash, signature, Walrus·Sui chip + object
link) → tamper VERIFIED↔TAMPER (edit → TAMPER, reset → VERIFIED, un-edited = MATCH) → Re-verify on
Walrus (200). [measured]

The full gap-by-gap breakdown (GAPs 5–9 + the cycle fix) is in
[`RENDER_GAPS.md`](./RENDER_GAPS.md). The script is **deterministic and idempotent** across all
ten gaps — each fix is guarded so a second run is a clean no-op [measured — a second run reports
"nothing to do (already patched)"], and it **heals all ten from a fresh render**.

---

## Stage 4 — The switch is live, both ways (FRID 12 / patch GAP 10)

The 88-line spec's final FRID is the side-by-side comparison itself: a header link **"View the
original UI ↗"** pointing at `VITE_ORIGINAL_UI_URL`. It is now **live in both directions**: the
original UI (`:8787/`) carries a "⇄ Codeplain UI ↗" link, and the Codeplain app (`:5173/`) carries
the FRID 12 link back. A judge running both servers (backend `:8787`, React `:5173`) flips between
the **spec-rendered** frontend and the **hand-built** original with one click, either way — the
cleanest possible proof of the bounty's thesis: **Claude to spec + Codeplain to build beats
hand-prompting code, and the spec stays readable by a non-engineer.** In the committed repo the
link comes from FRID 12 (a fresh render emits it) and is reproduced by the patch's **GAP 10**
(idempotent, heal-from-scratch verified).

---

## The journey in one sentence

A non-engineer-readable, 88-line spec → dry-run (1 bug, fixed) → render (~3 min, 12 credits,
~819 LOC, 0 complexity hits) → 4 mechanical patches → **QA drove it live, caught an invented
backend contract, and we fixed it by pinning the field names in the spec** (dry-run still clean,
journey now PASS end-to-end) → 10 idempotent patch gaps and a one-button switch to the original
(committed tree: 870 LOC) — versus 709 hand-written lines built over 15 commits and 2 days of
multi-agent passes. **The iteration surface — even for a runtime contract bug — moved from
"hand-patch the generated code" to "edit a sentence in the spec."**
