# GlassBox frontend — Two ways to build it · the numbers

> **Honesty policy for this doc:** every number is tagged **[measured]** (pulled from this
> repo / git / the Codeplain CLI) or **[estimate]** (clearly reasoned, basis stated). No
> fabricated figures. The goal is an *honest* comparison that still shows the win.

GlassBox's frontend exists **twice in this repo**, built two different ways. This is the
side-by-side.

| | **A — Manual (the original)** | **B — Claude specs → Codeplain builds** |
|---|---|---|
| What a human authors/edits | `server/glassbox/static/index.html` (hand-written) | `glassbox.plain` (a plain-language spec) |
| Who writes the app code | a human + Claude Code, by hand, line by line | **Codeplain renders it** from the spec |
| The "source of truth" | the code itself | the spec (code is a disposable build artifact) |
| To change the UI | hand-edit code (risk of breakage) | edit one spec line → re-render |

## The "before" — manual build (measured from this repo's git history)

- **Hand-written frontend size:** `index.html` = **709 lines / 55,956 bytes** **[measured]** (`wc`)
- **Commits that touched the frontend:** **15** **[measured]** (`git log -- server/glassbox/static/index.html`)
- **Calendar span of the frontend build:** **2026-06-20 → 2026-06-21 (2 days)** **[measured]**
- **How it was actually built:** manual Claude Code prompting + skills + **multiple multi-agent
  passes** (a 7-lens design huddle, design-review + qa red-teams, fix waves). **[measured — visible in this repo's git log + session history]**

## The "after" — Codeplain spec build

- **Spec a human authors:** `glassbox.plain` = **88 lines / 12,596 bytes** **[measured]** (`wc`).
  It grew from 80 to 88 lines when we **pinned the exact backend JSON field names** into the
  `:Decision:`/`:AuditRecord:` and endpoint definitions (the contract fix) — still plain English,
  now precise enough that the renderer can't invent a wrong contract.
- **Functional specs (FRIDs) in the spec:** **12** — the 11 rendered in `render.log`, in order,
  plus FRID 12 (the side-by-side UI switch), now live in the committed app **[measured]**
- **Spec bugs caught by `--dry-run` before any render:** **1** (an undefined `:Asset:` concept
  token), fixed in seconds. A second `--dry-run` issue — a concept cycle introduced *by* pinning
  the contract (`:AuditRecord:` ↔ `:VerifyEndpoint:`) — was also caught and fixed; `--dry-run` now
  passes (exit 0). **[measured]**
- **Codeplain render credits available:** **50 / 50** free trial **[measured — `codeplain --status`]**

### Authoring leverage (measured)

- **88-line spec → 709-line hand-tuned UI** = the human maintains **~8.1× fewer lines** in the
  spec path, and the rendered React app is *larger still* than the vanilla original (full
  component tree + state + API client). **[measured]**

## Render results — measured

| Metric | Value | Source |
|---|---|---|
| Rendered app size (lines of code, committed) | **870** (ts/tsx in `web/src`, incl. the patch's `vite-env.d.ts`, the pinned-contract files + the FRID 12 switch; excl. deps) | [measured] `wc` |
| Raw render output (pre-patch) | **~819** ts/tsx — the +51 lines are the idempotent patch's contract fixes + switch link | [measured] `wc` |
| Spec→code leverage (committed LOC ÷ spec lines) | **~9.9×** (870 ÷ 88), ~72× against the 12 FRIDs | [measured] computed |
| Render wall-clock time | **~3 min 18 s** | [measured] render-log timestamps (00:00 → 00:03:18) |
| Render credits consumed | **12** (50 → 38 remaining); the later contract fix cost **0 extra credits** (patched, not re-rendered) | [measured] `codeplain --status` delta |
| FRIDs that hit a complexity limit | **0** — all rendered FRIDs in one pass | [measured] render log |
| Post-render fixes needed | **10 gaps** — GAPs 1–4 mechanical compile (Vite env types + verify-state wiring + one dead-code block); GAPs 5–9 **contract** (the renderer invented wrong JSON field names → HTTP 422 on the live backend); GAP 10 the switch link. All fixed deterministically and idempotently by `scripts/post-render-patch.sh`, and now pinned upstream in the spec. See `RENDER_GAPS.md`. | [measured] `npm run build` + live drive |
| Build after patch | **clean** — `tsc && vite build` ✓ in ~0.6 s | [measured] `npm run build` |
| `--dry-run` on the pinned spec | **passes (exit 0)** — incl. after pinning the contract field names | [measured] `codeplain --dry-run` |
| Live journey vs real backend | **PASS end-to-end** — analyze → HOLD/85 High/13% → debate → doubt expander → Prove it → receipt → tamper VERIFIED↔TAMPER (un-edited = MATCH) → Re-verify on Walrus 200 | [measured] headless drive |
| Journey-fidelity vs original | functional / journey replica (same flow, states, claims); **not** pixel-perfect (React + inline styles, no SVG chart yet) | review |

**Headline:** one 88-line spec → a **870-line working React app, QA-verified PASS end-to-end, in
~3 minutes for 12 credits**, vs the original **709-line hand-tuned UI built over 15 commits / 2 days**
with manual prompting + multi-agent design/QA passes. The renderer wasn't perfect — it left 4 compile
gaps *and* invented a wrong backend contract (5 contract gaps) — but **we fixed the contract in the
spec** (pinned the field names; `--dry-run` passes) and captured every gap in an idempotent,
re-appliable patch script. The *iteration surface* — even for a runtime contract bug — moved from
"hand-patch the generated code + re-review" to "edit a sentence in the spec." That's the win.

## The pitch (for the Codeplain bounty)

The expensive part of the manual build wasn't typing — it was the **iteration**: design huddles,
red-teams, and fix waves on hand-written code (the 15 commits over 2 days). The spec path moves
that iteration **up a level**: you change a sentence in `glassbox.plain` and re-render, instead of
hand-patching 700 lines of bespoke JS and re-reviewing it. **Faster to change, cheaper to maintain,
and the spec is readable by non-engineers** — which is exactly what "build with Codeplain as your
primary tool" is supposed to feel like.

_Numbers in the render table above are the hard proof — the render has landed, the build is clean after
the idempotent patch, and the live journey is a QA-verified PASS end-to-end. See `BUILD_LOG.md` for the
FRID-by-FRID journey and `RENDER_GAPS.md` for the 10 gaps (4 mechanical + 5 contract + the switch link)
and their upstream fixes — the contract field names are now pinned in the spec, so `--dry-run` passes._
