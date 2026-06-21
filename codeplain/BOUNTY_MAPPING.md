# BOUNTY_MAPPING — every artifact → the criterion it scores

**Bounty:** \*codeplain — "Best project built with \*codeplain" ($1000 + credits).
**Judged:** 33% quality of spec-driven-development setup · 33% presentation ·
33% innovation / creativity · 1% charm.
**Deliverable:** a public GitHub repo with the `.plain` files + configs.

The repo is laid out so a judge can score every criterion in one pass. Each artifact below is
a real file in this repo (paths relative to repo root). The current state is the **v2 "dark
design" render** — the spec now drives a dark, on-brand UI, not the plain v1.

## Artifact → criterion

| Repo artifact | What it is | Primary criterion it satisfies | One-line why |
|---|---|---|---|
| `glassbox.plain` | The 96-line plain-language spec — 12 FRIDs, defined concepts (with the **exact backend field names pinned**), and a **concise dark-design block** in `***implementation reqs***`, on `typescript-react-app-template` | **Spec-driven setup (33%)** | The whole app — behaviour *and* its dark on-brand look — is authored as readable English intent; the spec *is* the source of truth. |
| **The contract-pinning fix** (`:Decision:`/`:AuditRecord:` + the 4 endpoint defs in `glassbox.plain`) | The spec pins the exact JSON field names, so the renderer emits the correct backend contract; `--dry-run` passes and the live drive is clean | **Spec-driven setup (33%)** | The proof that the spec is the source of truth: pin the contract once and the render stops guessing — v2 had **zero contract gaps** (v1 had 5). |
| **The concise-spec / detailed-brief split** (`glassbox.plain` impl-reqs ↔ `resources/ui_reference.md`) | The first dark render crammed all design detail into the spec and hit a `COMPLEXITY_ERROR` at FRID 3; moving the detail to `ui_reference.md` and keeping the spec concise let all 12 FRIDs render | **Spec-driven setup (33%)** | Demonstrates mastery of the renderer's real constraints — the same "split big FRIDs to fit the complexity limit" discipline the reference repo teaches. |
| `resources/ui_reference.md` | The 215-line design brief the spec points at (distilled from a 4-lens design review) | **Spec-driven setup (33%)** | The right architecture: a short readable spec that references a detailed brief, instead of an unrenderable wall of pixels. |
| `config.yaml` / `glassbox.config.yaml` | Codeplain build config (`build-dest: web`, `template-dir: template`) | **Spec-driven setup (33%)** | A real, reproducible Codeplain project — not a one-off prompt. |
| `codeplain/render4.log` | The successful v2 render transcript (all 12 FRIDs render in order, refactor passes, success) | **Spec-driven setup (33%)** | Receipts: shows Codeplain rendering the dark spec, FRID by FRID, with timestamps. |
| `codeplain/render3.log` | The failed dense-design render (`COMPLEXITY_ERROR` at FRID 3) | **Spec-driven setup (33%)** | Honest receipts of the lesson — *and* the fix that followed. |
| `scripts/post-render-patch.sh` | Deterministic, idempotent fix for **3 render gaps** (Vite env types + a one-line `Decision` re-export + the FRID-12 switch link) | **Spec-driven setup (33%)** | A mature, repeatable render→patch→build workflow; **down from 10 gaps in v1** — the better the spec, the cleaner the render. |
| `codeplain/RENDER_GAPS.md` | The 3 gaps + how each folds back **upstream into the spec/template**, plus why there are **no contract gaps** this time | **Spec-driven setup (33%)** | Proves we treat the spec — not the generated code — as the thing to fix. |
| `codeplain/BUILD_LOG.md` | Stage-by-stage journey: author → dry-run → the complexity-error lesson → dark render → 3-gap patch → live PASS → switch | **Presentation (33%)** | The "watch the dark UI grow from the spec" narrative a judge can follow in 60 s. |
| `codeplain/README.md` | The pitch: two-ways-to-build table, headline numbers, exact run commands | **Presentation (33%)** | Scannable in 3 seconds; gives the judge the story and the repro in one screen. |
| `codeplain/METRICS.md` | Honest, tagged ([measured]/[estimate]) before/after numbers + the credit ledger | **Presentation (33%)** | Credibility: the win is shown with sourced numbers, no hype. |
| `web/` (gitignored, rebuildable) | The Codeplain-rendered **dark** React + Vite + TS app (page #090c12, 64px coloured verdict hero, #121821 cards, green/red Bull/Bear, asymmetric VERIFIED/TAMPER) | **Spec-driven setup (33%)** | The proof the spec renders to a working, **on-brand** app (`npm run build` is clean in ~0.5 s). |
| **Both UIs in one repo** + **FRID 12 switch (live both ways)** | `web/` (rendered) vs `server/glassbox/static/index.html` (hand-built), each carrying a one-click link to the other (`:5173/` ⇄ `:8787/`) | **Innovation / creativity (33%)** | A controlled A/B of *the same product built two ways*, switchable in either direction — and now in the **same dark design language** — the comparison **is** the demo. |
| **"The better the spec, the cleaner the render"** | v1 left 10 gaps; pinning the contract + design in the spec dropped v2 to 3 gaps and zero contract rewrites | **Innovation / creativity (33%)** | A real, measured engineering insight about spec-driven development — not a slogan. |
| **The complexity-error lesson** | A dense-design spec hit `COMPLEXITY_ERROR`; the fix was the concise-spec + detailed-brief split | **Innovation / creativity (33%)** | Spec-first shown as a genuine engineering loop with real renderer constraints, honestly surfaced. |
| The dry-run catch (`:Asset:` bug, fixed pre-render) | One spec bug found by `codeplain --dry-run` | **Innovation / creativity (33%)** | Shows spec-first as a real engineering loop: a compiler for intent, not a toy. |
| Claim discipline baked into FRID 10 | "Never say tamper-proof; use tamper-evident/verify" enforced *by the spec* | **Innovation / creativity (33%)** | Product/legal guardrails expressed as a spec line — governance-as-spec. |
| The plain-English `***definitions***` block | `:User:`/`:Goal:`/`:Decision:`/`:AuditRecord:` defined in prose | **Charm (1%)** | A non-engineer can read the spec and understand the whole app — the bounty's tagline made literal. |

## The pitch in one line, per criterion

- **Spec-driven setup (33%):** a 96-line readable spec → a **dark, on-brand** working React app
  via Codeplain, with a real dry-run → render → idempotent-patch → build workflow and the render
  transcript to prove it — *and* two headline proofs that the spec is the source of truth: the
  contract is pinned in the spec (so v2 had **zero contract gaps**), and the dark design is driven
  from a concise spec that points at `resources/ui_reference.md` (the split that got past
  Codeplain's complexity limit).
- **Presentation (33%):** README + BUILD_LOG + tagged METRICS make the before/after win scannable
  in seconds, with exact repro commands, and the render now *looks* the part (dark, on-brand).
- **Innovation / creativity (33%):** the **same product, built two ways, in one repo, switchable
  in either direction by a one-line FRID, and now in the same dark design language** — the
  comparison is the demo; plus a measured insight — **"the better the spec, the cleaner the
  render"** (10 gaps → 3, zero contract rewrites) — and the honestly-surfaced complexity-error
  lesson.
- **Charm (1%):** the spec reads like a product brief a non-engineer can follow —
  "stop prompting, start speccing" made literal.

> Honesty: GlassBox is **tamper-evident**, not tamper-proof; the rendered app is a **dark,
> on-brand, journey-faithful replica** of the original — **QA-verified PASS end-to-end** against
> the real backend, in the same dark design language and journey, but **not** pixel-perfect (the
> proof-receipt section is under-styled and there are no bespoke SVG meters / micro-animations like
> the hand-tuned original); and this is a submission — nothing here claims a win. Numbers are
> tagged in [`METRICS.md`](./METRICS.md).
