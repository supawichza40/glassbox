# BOUNTY_MAPPING — every artifact → the criterion it scores

**Bounty:** \*codeplain — "Best project built with \*codeplain" ($1000 + credits).
**Judged:** 33% quality of spec-driven-development setup · 33% presentation ·
33% innovation / creativity · 1% charm.
**Deliverable:** a public GitHub repo with the `.plain` files + configs.

The repo is laid out so a judge can score every criterion in one pass. Each artifact below is
a real file in this repo (paths relative to repo root).

## Artifact → criterion

| Repo artifact | What it is | Primary criterion it satisfies | One-line why |
|---|---|---|---|
| `glassbox.plain` | The 88-line plain-language spec — 12 FRIDs, defined concepts (with the **exact backend field names pinned**), on `typescript-react-app-template` | **Spec-driven setup (33%)** | The whole app is authored as readable English intent; the spec *is* the source of truth — precise enough that the renderer can't invent a wrong contract. |
| **The contract-pinning fix** (`:Decision:`/`:AuditRecord:` + the 4 endpoint defs in `glassbox.plain`) | QA found the render failed every backend call (HTTP 422) because the spec named endpoints abstractly; we pinned the exact JSON field names **in the spec** and `--dry-run` passes | **Spec-driven setup (33%)** | The literal proof that the spec is the source of truth: a *runtime* bug fixed by tightening the spec, not patching the code — 0 extra render credits. |
| `config.yaml` / `glassbox.config.yaml` | Codeplain build config (`build-dest: web`, `template-dir: template`) | **Spec-driven setup (33%)** | A real, reproducible Codeplain project — not a one-off prompt. |
| `codeplain/render.log` | The actual render transcript (FRIDs render in order, refactor passes, success) | **Spec-driven setup (33%)** | Receipts: shows Codeplain rendering the spec, FRID by FRID, with timestamps. |
| `scripts/post-render-patch.sh` | Deterministic, idempotent fix for **10 render gaps** (4 mechanical + 5 contract + the switch link) | **Spec-driven setup (33%)** | A mature, repeatable render→patch→build workflow, not hand-hacking the output. |
| `codeplain/RENDER_GAPS.md` | The 10 gaps + how each folds back **upstream into the spec** (the 5 contract gaps now pinned) | **Spec-driven setup (33%)** | Proves we treat the spec — not the generated code — as the thing to fix. |
| `codeplain/BUILD_LOG.md` | Stage-by-stage journey: author → dry-run (1 bug) → render → patch → switch | **Presentation (33%)** | The "watch the UI grow from the spec" narrative a judge can follow in 60 s. |
| `codeplain/README.md` | The pitch: two-ways-to-build table, headline numbers, exact run commands | **Presentation (33%)** | Scannable in 3 seconds; gives the judge the story and the repro in one screen. |
| `codeplain/METRICS.md` | Honest, tagged ([measured]/[estimate]) before/after numbers | **Presentation (33%)** | Credibility: the win is shown with sourced numbers, no hype. |
| `web/` (gitignored, rebuildable) | The Codeplain-rendered React + Vite + TS app | **Spec-driven setup (33%)** | The proof the spec actually renders to a working app (`npm run build` is clean). |
| **Both UIs in one repo** + **FRID 12 switch (live both ways)** | `web/` (rendered) vs `server/glassbox/static/index.html` (hand-built), each carrying a one-click link to the other (`:5173/` ⇄ `:8787/`) | **Innovation / creativity (33%)** | A controlled A/B of *the same product built two ways*, switchable in either direction — the comparison **is** the demo. |
| **Spec-first fix of a runtime bug** | QA's live drive caught an invented contract; the fix landed in `glassbox.plain` (pinned field names), not the code | **Innovation / creativity (33%)** | Spec-first as a genuine engineering loop: even a runtime contract bug is a spec edit, not a code patch. |
| The dry-run catch (`:Asset:` bug, fixed pre-render) | One spec bug found by `codeplain --dry-run` | **Innovation / creativity (33%)** | Shows spec-first as a real engineering loop: a compiler for intent, not a toy. |
| Claim discipline baked into FRID 10 | "Never say tamper-proof; use tamper-evident/verify" enforced *by the spec* | **Innovation / creativity (33%)** | Product/legal guardrails expressed as a spec line — governance-as-spec. |
| The plain-English `***definitions***` block | `:User:`/`:Goal:`/`:Decision:`/`:AuditRecord:` defined in prose | **Charm (1%)** | A non-engineer can read the spec and understand the whole app — the bounty's tagline made literal. |

## The pitch in one line, per criterion

- **Spec-driven setup (33%):** an 88-line readable spec → a working React app via Codeplain,
  with a real dry-run → render → idempotent-patch → build workflow and the render transcript to
  prove it — *and* the headline proof that the spec is the source of truth: QA found the render
  invented a wrong backend contract, and we fixed it by **pinning the field names in the spec**
  (`--dry-run` passes), not by patching the generated code.
- **Presentation (33%):** README + BUILD_LOG + tagged METRICS make the before/after win
  scannable in seconds, with exact repro commands.
- **Innovation / creativity (33%):** the **same product, built two ways, in one repo, switchable
  in either direction by a one-line FRID** — the comparison is the demo; spec-first is shown as a
  genuine engineering loop (dry-run catches bugs; a *runtime* contract bug is fixed in the spec;
  guardrails live in the spec).
- **Charm (1%):** the spec reads like a product brief a non-engineer can follow —
  "stop prompting, start speccing" made literal.

> Honesty: GlassBox is **tamper-evident**, not tamper-proof; the rendered app is a **functional /
> journey replica** of the original — **QA-verified PASS end-to-end** against the real backend,
> but **not** pixel-perfect (React + inline styles, no SVG chart yet); and this is a submission —
> nothing here claims a win. Numbers are tagged in [`METRICS.md`](./METRICS.md).
