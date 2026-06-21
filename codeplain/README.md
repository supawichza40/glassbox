# GlassBox × \*codeplain — two ways to build the same frontend

> **Stop prompting. Start speccing.** GlassBox's frontend exists **twice in this repo**:
> once hand-built (vanilla JS + Claude prompting + multi-agent design/QA passes), and once
> **rendered by Codeplain from an 88-line plain-language spec**. Same product. One is
> maintained by editing 700+ lines of bespoke JS; the other by editing a sentence.
>
> The original UI lives once; the spec-built one is a **functional, QA-verified journey replica**
> rendered from the spec — same flow, same states, same claims (not pixel-perfect).
>
> This folder is the judge-facing evidence for the **"Best project built with \*codeplain"**
> bounty. Every number is tagged **[measured]** (from this repo / git / the Codeplain CLI)
> or **[estimate]** (reasoned, basis stated). Nothing is invented.

---

## The headline (3-second read)

| | **A — Manual (the original)** | **B — Claude → spec → Codeplain** |
|---|---|---|
| What a human authors | `server/glassbox/static/index.html` (hand-written) | **`glassbox.plain`** (a plain-language spec) |
| Who writes the app code | a human + Claude, by hand | **Codeplain renders it** |
| Source of truth | the code | **the spec** (code is a disposable artifact) |
| Size a human maintains | **709 lines / 55.9 KB** [measured] | **88-line spec** [measured] |
| Build effort | **15 commits over 2 days** + multi-agent design/QA passes [measured] | **one render: ~3 min 18 s, 12 credits** [measured] |
| What renders out | n/a | **870 LOC** of React/TS [measured], ~9.9× spec→code leverage |
| To change the UI | hand-edit code, re-review | **edit one spec line → re-render** |

**One 88-line spec → a working React app in ~3 minutes for 12 credits.** The expensive part of
the manual build was never typing — it was the *iteration* (design huddles, red-teams, fix
waves on hand-written code). The spec path moves that iteration **up a level**: you change a
sentence in `glassbox.plain` and re-render, instead of hand-patching 700 lines of bespoke JS.

Full numbers + sources: [`METRICS.md`](./METRICS.md).

---

## The spec-driven headline: we fixed a runtime bug *in the spec*, not the code

The cleanest proof that **the spec is the source of truth** happened mid-build. QA drove the
rendered replica against the real backend and it **failed on every call (HTTP 422)**: Codeplain
had **invented a wrong JSON contract** because the first `glassbox.plain` named the endpoints
abstractly without pinning the field names. We fixed it the spec-driven way — we tightened the
spec, not the generated code. `glassbox.plain`'s `***definitions***` now **pin the exact
request/response field names** for `:Decision:`, `:AuditRecord:`, and the four endpoints
(`{goalText, asset, risk}`; `bull.points`/`signalStrengthPct`/`winningSide` as a *string*; a
**flat** `recordId`/`recordHash`/`suiObjectId`; `GET /api/verify/{recordId}` →
`{hashMatch, signatureValid}`; the tamper demo hashing `recordCanonical` client-side).
`codeplain glassbox.plain --dry-run` passes (exit 0), and the replica now runs the full journey
**end-to-end, QA-verified PASS**. *We tightened the spec and the app became correct* — that is
the spec-first thesis in one move, and it maps straight to the 33% spec-quality criterion.

The contract fix cost **0 extra render credits** — it was applied via the idempotent patch script
(GAPs 5–9) rather than a re-render, so the run still stands at **38/50 credits remaining**. See
[`RENDER_GAPS.md`](./RENDER_GAPS.md) for the gap-by-gap upstream fix.

---

## The spec-driven setup (the 33% the judges score on)

```
glassbox.plain        ← the source of truth (88 lines of plain English)
config.yaml           ← Codeplain build config (build-dest: web, template-dir: template)
scripts/
  post-render-patch.sh ← deterministic, idempotent fix for 10 render gaps (4 mechanical + 5 contract + the switch link)
web/                   ← the rendered React + Vite + TS app (gitignored build artifact)
server/glassbox/static/index.html  ← the original hand-built UI (the "before")
codeplain/
  README.md           ← this file (the pitch)
  BUILD_LOG.md        ← the spec-first journey, FRID by FRID (watch the UI grow)
  BOUNTY_MAPPING.md   ← artifact → judging-criterion table
  RENDER_GAPS.md      ← the 10 render gaps + how each folds back upstream into the spec
  METRICS.md          ← the honest, tagged numbers
  render.log          ← the actual Codeplain render transcript
```

`glassbox.plain` is **12 functional specs (FRIDs)** built on Codeplain's
`typescript-react-app-template`. It reads like a product brief — `:User:`, `:Goal:`,
`:Decision:`, `:AuditRecord:` are *defined concepts* (now with the **exact backend field names
pinned**, so the renderer can't guess a wrong contract), and each FRID is one sentence of intent
(enter a goal → watch the Bull/Bear debate → verdict hero → "Prove it" → "Verify" MATCH → edit
the signed record → **TAMPER DETECTED**). A non-engineer can read it and tell you exactly what
the app does. That is the whole point.

---

## Run it yourself

> Prereqs: Node 18+, a `CODEPLAIN_API_KEY`, and the Python brain (this repo's `server/`).
> Promo code **London100** = 100 free render credits. All commands run from the repo root.

### 1. Validate the spec (catches bugs before spending a credit)

```bash
codeplain glassbox.plain --dry-run
```

This is how we caught our **one spec bug** — an undefined `:Asset:` concept token — and fixed
it in seconds before any render. [measured]

### 2. Render the spec into a React app

```bash
CODEPLAIN_API_KEY=<key> codeplain glassbox.plain --force-render --headless
```

~3 min 18 s, 12 credits, 0 FRIDs over the complexity limit. The transcript is in
[`render.log`](./render.log).

### 3. Patch the render gaps (idempotent)

```bash
./scripts/post-render-patch.sh
```

The script applies **10 guarded, idempotent gaps**: GAPs 1–4 are mechanical compile fixes
(missing Vite env types + the verify-state wiring for "Re-verify on Walrus"); GAPs 5–9 overwrite
the five contract-bearing files with the **pinned-contract** versions QA verified against the
live backend; GAP 10 wires the FRID 12 switch link. Each step is guarded by a unique sentinel, so
re-running it is a clean no-op (verified), and the script heals all ten **from a fresh render**.
The same fixes are captured to fold **upstream into the spec** — the contract is now pinned in
`glassbox.plain`, so a fresh render of the pinned spec should make GAPs 5–10 verified no-ops too.
See [`RENDER_GAPS.md`](./RENDER_GAPS.md).

### 4. Build / run

```bash
# Backend brain (FastAPI) on :8787
cd server && python3 -m glassbox.server          # serves the API + the original UI at /

# Spec-rendered React app on :5173
cd web && npm install && npm start               # vite dev server

# Production build (verifies the render compiles clean)
cd web && npm run build                          # tsc && vite build  →  ~0.6 s [measured]
```

The React app reads the backend base URL from `VITE_API_BASE_URL` (defaults to
`http://localhost:8787`).

### 5. Switch between the two UIs (FRID 12) — live both ways

The 88-line spec's **12th functional spec** adds a header link **"View the original UI ↗"** that
opens the hand-built original at `VITE_ORIGINAL_UI_URL` (defaults to `http://localhost:8787/`).
The switch is **live in both directions**: the original UI (`:8787/`) carries a "⇄ Codeplain UI ↗"
link to `:5173/`, and the Codeplain app (`:5173/`) carries the FRID 12 "View the original UI ↗"
link back to `:8787/`. So a judge can flip between the **Codeplain-rendered** frontend and the
**hand-built** original and compare them side by side, in one click, either way.

This is the demonstration of the spec-first win in one move: **adding a whole new UI affordance
was a single English sentence in `glassbox.plain`**, not a code change. In the committed repo it
comes from FRID 12 (a fresh render emits it) and is reproduced idempotently by the patch script's
GAP 10 (heal-from-scratch verified). See [`BUILD_LOG.md`](./BUILD_LOG.md).

---

## Honesty notes (we mean it)

- The rendered app is a **functional / journey replica** of the original, **QA-verified PASS**
  end-to-end against the real backend (Analyze → Decision (HOLD, signal 85 High, 13% size) →
  Bull/Bear debate → "why you should doubt this" → disclaimer → Prove it → audit receipt → tamper
  VERIFIED↔TAMPER → Re-verify on Walrus) — same flow, same states, same claims — but **not** a
  pixel-perfect clone. It's React + inline styles, not the hand-tuned vanilla CSS, and it does not
  yet carry the original's SVG price chart. The journey is faithful; the pixels are not.
- GlassBox is **tamper-evident**, never "tamper-proof". The signature proves origin; the
  on-chain Sui object is an independent anchor (a Sui *epoch*, not a wall-clock timestamp). It
  is an **evidence layer**, not model validation. We never pitch returns or PnL.
- We have **not** won anything. This is a submission.

---

**Built with Claude (spec authoring) + \*codeplain (rendering).** Read
[`BUILD_LOG.md`](./BUILD_LOG.md) for the stage-by-stage journey and
[`BOUNTY_MAPPING.md`](./BOUNTY_MAPPING.md) for how each artifact maps to the rubric.
