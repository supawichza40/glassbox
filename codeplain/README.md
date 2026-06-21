# GlassBox × \*codeplain — two ways to build the same frontend

> **Stop prompting. Start speccing.** GlassBox's frontend exists **twice in this repo**:
> once hand-built (vanilla JS + Claude prompting + multi-agent design/QA passes), and once
> **rendered by Codeplain from a 96-line plain-language spec** — now in the **same dark, on-brand
> design language**, driven from the spec. Same product. One is maintained by editing 700+ lines
> of bespoke JS; the other by editing a sentence.
>
> The original UI lives once; the spec-built one is a **dark, on-brand, journey-faithful replica**
> rendered from the spec — same design language, same flow, same states, same claims (not
> pixel-perfect).
>
> This folder is the judge-facing evidence for the **"Best project built with \*codeplain"**
> bounty. Every number is tagged **[measured]** (from this repo / git / the Codeplain CLI) or
> **[estimate]** (reasoned, basis stated). Nothing is invented.

---

## The headline (3-second read)

| | **A — Manual (the original)** | **B — Claude → spec → Codeplain** |
|---|---|---|
| What a human authors | `server/glassbox/static/index.html` (hand-written) | **`glassbox.plain`** (a plain-language spec) |
| Who writes the app code | a human + Claude, by hand | **Codeplain renders it** |
| Source of truth | the code | **the spec** (code is a disposable artifact) |
| Size a human maintains | **709 lines / 55.9 KB** [measured] | **96-line spec** [measured] |
| Build effort | **15 commits over 2 days** + multi-agent design/QA passes [measured] | **one render: ~4 min, 12 credits** [measured] |
| What renders out | n/a | **703 LOC** React/TS + **460 lines of dark CSS** [measured], ~7.3× spec→code leverage |
| Look | the hand-tuned dark original | **dark + on-brand, driven from the spec** [measured] |
| To change the UI | hand-edit code, re-review | **edit one spec line → re-render** |

**One 96-line spec → a working, dark, on-brand React app in ~4 minutes.** The expensive part of
the manual build was never typing — it was the *iteration* (design huddles, red-teams, fix waves
on hand-written code). The spec path moves that iteration **up a level**: you change a sentence in
`glassbox.plain` and re-render, instead of hand-patching 700 lines of bespoke JS.

Full numbers + sources: [`METRICS.md`](./METRICS.md).

---

## Two headline spec-driven proofs

**1. We pinned the backend contract *in the spec*, so the renderer stopped guessing wrong.**
In the v1 render, Codeplain **invented a wrong JSON contract** because the spec named the
endpoints abstractly — the replica failed every live call (HTTP 422). We fixed it the spec-driven
way: `glassbox.plain`'s `***definitions***` now **pin the exact request/response field names** for
`:Decision:`, `:AuditRecord:`, and the four endpoints (`{goalText, asset, risk}`;
`bull.points`/`signalStrengthPct`/`winningSide` as a *string*; a **flat**
`recordId`/`recordHash`/`suiObjectId`; `GET /api/verify/{recordId}` → `{hashMatch,
signatureValid}`; the tamper demo hashing `recordCanonical` client-side). The payoff in v2:
**zero contract gaps** — the render emitted the correct contract and the live journey passed
end-to-end. *Tighten the spec, and the app becomes correct* — the spec-first thesis in one move.

**2. The better the spec, the cleaner the render.** Because the contract **and** the dark design
are now pinned in the spec, the v2 render needed only **3 post-render patch gaps** (Vite env
types, a one-line `Decision` re-export, the FRID-12 switch link) — **down from 10** in v1, and
**zero** of them a contract rewrite. The render also got *on-brand*: dark page (#090c12), a 64px
coloured verdict hero (BUY green / HOLD amber / AVOID red), green/red Bull/Bear cards, the
asymmetric VERIFIED/TAMPER climax — all driven from a **concise** design block in the spec. See
[`RENDER_GAPS.md`](./RENDER_GAPS.md).

---

## The spec-driven setup (the 33% the judges score on)

```
glassbox.plain        ← the source of truth (96 lines of plain English: behaviour + concise dark-design directives)
resources/ui_reference.md  ← the 215-line design brief the spec points at (full pixel detail lives here, not in the spec)
config.yaml           ← Codeplain build config (build-dest: web, template-dir: template)
scripts/
  post-render-patch.sh ← deterministic, idempotent fix for 3 render gaps (Vite env types + Decision re-export + switch link)
web/                   ← the rendered dark React + Vite + TS app (gitignored build artifact)
server/glassbox/static/index.html  ← the original hand-built UI (the "before")
codeplain/
  README.md           ← this file (the pitch)
  BUILD_LOG.md        ← the spec-first journey, FRID by FRID (watch the dark UI grow)
  BOUNTY_MAPPING.md   ← artifact → judging-criterion table
  RENDER_GAPS.md      ← the 3 render gaps + how each folds back upstream into the spec
  METRICS.md          ← the honest, tagged numbers + the credit ledger
  render4.log         ← the successful v2 render transcript (all 12 FRIDs)
  render3.log         ← the failed dense-design render (COMPLEXITY_ERROR at FRID 3 — the lesson)
```

`glassbox.plain` is **12 functional specs (FRIDs)** built on Codeplain's
`typescript-react-app-template`. It reads like a product brief — `:User:`, `:Goal:`,
`:Decision:`, `:AuditRecord:` are *defined concepts* (now with the **exact backend field names
pinned**), and each FRID is one sentence of intent (enter a goal → watch the Bull/Bear debate →
verdict hero → "Prove it" → "Verify" MATCH → edit the signed record → **TAMPER DETECTED**). A
**concise** design block in `***implementation reqs***` carries the dark token palette + the
coloured verdict hero + the Bull/Bear cards + the VERIFIED/TAMPER climax, and *points at*
`resources/ui_reference.md` for the full detail. A non-engineer can read it and tell you exactly
what the app does and roughly how it looks. That is the whole point.

> **Why the design lives in two files:** the first dark render put *all* the pixel detail in the
> spec and Codeplain hit a `COMPLEXITY_ERROR` at FRID 3 ("too complex — break it down",
> [`render3.log`](./render3.log)). Keeping the spec concise and pushing detail into
> `resources/ui_reference.md` — the standard "split to fit the renderer's complexity limit"
> discipline — let the re-render finish all 12 FRIDs ([`render4.log`](./render4.log)).

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

### 2. Render the spec into a dark React app

```bash
CODEPLAIN_API_KEY=<key> codeplain glassbox.plain --force-render --headless
```

~4 min, 12 credits, all 12 FRIDs in one pass, and the output is **dark and on-brand**. The
transcript is [`render4.log`](./render4.log). (The earlier dense-design attempt that hit the
complexity limit is [`render3.log`](./render3.log).)

### 3. Patch the render gaps (idempotent)

```bash
./scripts/post-render-patch.sh
```

The script applies **3 guarded, idempotent gaps**: GAP 1 the missing Vite env types; GAP 2 a
one-line `Decision` re-export from `AnalysisResults.tsx` (the build blocker); GAP 3 the FRID-12
switch link. Each step is guarded by a unique sentinel, so re-running it is a clean no-op
(verified), and the script heals all three **from a fresh render**. There are **no
contract-rewrite gaps** — the pinned spec already makes the renderer emit the correct contract.
See [`RENDER_GAPS.md`](./RENDER_GAPS.md).

### 4. Build / run

```bash
# Backend brain (FastAPI) on :8787
cd server && python3 -m glassbox.server          # serves the API + the original UI at /

# Spec-rendered React app on :5173
cd web && npm install && npm start               # vite dev server

# Production build (verifies the render compiles clean)
cd web && npm run build                          # tsc && vite build  →  ~0.5 s [measured]
```

The React app reads the backend base URL from `VITE_API_BASE_URL` (defaults to
`http://localhost:8787`).

### 5. Switch between the two UIs (FRID 12) — live both ways

The 96-line spec's **12th functional spec** adds a header link **"View the original UI ↗"** that
opens the hand-built original at `VITE_ORIGINAL_UI_URL` (defaults to `http://localhost:8787/`).
The switch is **live in both directions**: the original UI (`:8787/`) carries a "⇄ Codeplain UI ↗"
link to `:5173/`, and the Codeplain app (`:5173/`) carries the FRID 12 "View the original UI ↗"
link back to `:8787/`. So a judge can flip between the **Codeplain-rendered** dark frontend and the
**hand-built** original and compare them side by side, in one click, either way.

This is the demonstration of the spec-first win in one move: **adding a whole new UI affordance
was a single English sentence in `glassbox.plain`**, not a code change. In the committed repo the
link is emitted by the render and normalized idempotently by the patch script's GAP 3. See
[`BUILD_LOG.md`](./BUILD_LOG.md).

---

## Honesty notes (we mean it)

- The rendered app is a **dark, on-brand, journey-faithful replica** of the original, **QA-verified
  PASS** end-to-end against the real backend (Analyze → Decision (HOLD, signal 85 High, 13% size)
  → Bull/Bear debate → "why you should doubt this" → disclaimer → Prove it → audit receipt → tamper
  VERIFIED↔TAMPER → Re-verify on Walrus) — the **same dark GlassBox design language** (page #090c12,
  64px coloured verdict hero, #121821 cards, green/red Bull/Bear, asymmetric VERIFIED/TAMPER), same
  flow, same states, same claims — but **not** a pixel-perfect clone. The proof-receipt section is
  under-styled (a few CSS classes the renderer didn't emit), and there are no bespoke SVG meters or
  micro-animations like the hand-tuned original. **Dark, on-brand, journey-faithful — not
  pixel-perfect.**
- GlassBox is **tamper-evident**, never "tamper-proof". The signature proves origin; the
  on-chain Sui object is an independent anchor (a Sui *epoch*, not a wall-clock timestamp). It
  is an **evidence layer**, not model validation. We never pitch returns or PnL.
- We have **not** won anything. This is a submission.

---

**Built with Claude (spec authoring) + \*codeplain (rendering).** Read
[`BUILD_LOG.md`](./BUILD_LOG.md) for the stage-by-stage journey (incl. the complexity-error
lesson and the dark render) and [`BOUNTY_MAPPING.md`](./BOUNTY_MAPPING.md) for how each artifact
maps to the rubric.
