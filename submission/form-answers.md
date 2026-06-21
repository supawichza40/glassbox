# Submission form — copy-paste answers

Paste each block into the matching field. Replace the two ⏳ placeholders (video, deck link) before final submit.

---

## Challenge Explanation  *(Visible if any challenge · Required)*
**Selected challenges: Sui (DeepBook + Walrus) · BGA (AI Trading & Strategy) · *codeplain**

GlassBox is an **evidence layer for AI financial decisions** — and each challenge maps to a real, working part of the build:

- **Sui — DeepBook + Walrus.** Every decision is written as a PII-free record to **Walrus**, which registers a real **on-chain Sui object** (returned as `suiObjectId` + storage epoch, explorer-verifiable). Market features come partly from the **public DeepBook v3 indexer** (SUI/USDC order-book depth + spread). The trust is rooted in Sui/Walrus, not in our server: anyone can re-fetch the blob from Walrus and re-check it themselves.

- **BGA — AI Trading & Strategy (judged on transparency, not PnL).** A **Bull and a Bear LLM agent debate** (one rebuttal round) over *frozen, real* market inputs; a **Risk Arbiter** resolves a verdict (BUY/HOLD/AVOID) with a **mechanical Signal Strength** (an explicit formula, not a profit forecast), vol-targeted size, a counterfactual, and named blind spots. We make the *reasoning and the record* transparent and tamper-evident — we never claim it's profitable.

- ***codeplain — spec-first.** The React dashboard is generated from a **`.plain` spec** (`glassbox.plain` + `glassbox.config.yaml`) — the spec is the source of truth, not the generated code. The hand-written Python "brain" is documented to the same standard.

The signature line: **edit one character of a signed decision and it instantly fails verification — on the judge's own phone, with our laptop nowhere in the trust path.** That's "tamper-evident accountability," demonstrated, not asserted.

---

## Submission Details  *(Required)*
**GlassBox — tamper-evident accountability for AI financial decisions.**

**What it does.** You ask a plain-English investing question about SUI/USDC at a chosen risk level. GlassBox freezes five real market features (closed candles, no lookahead), then a **Bull** and **Bear** agent argue using *only* those numbers; a **Risk Arbiter** resolves a verdict + a mechanical Signal Strength + vol-targeted size + a counterfactual + blind spots. The decision is hashed (PII-free), **ed25519-signed**, written to **Walrus** (registering an **on-chain Sui object**), and exposed through a **"verify-it-yourself" page**: anyone can recompute the SHA-256 and check the signature **in their own browser** against the published key — no GlassBox server in the trust path. Edit a single character → **TAMPER DETECTED**, with a plain-English diff of exactly what changed.

**The process.** Built AI-first (Claude Code + a multi-agent design/red-team loop; frontend generated from a `.plain` spec via Codeplain). We deliberately optimised for **honesty under scrutiny**: a 10-expert red-team pass + a security review caught and fixed real overclaims (e.g. we say *deterministic canonical JSON*, not "RFC-8785 JCS"; we never say "tamper-proof"; the on-chain link is the Walrus blob's registration object + storage epoch, not a wall-clock timestamp). The whole flow is covered by a large `pytest` suite.

**Context / what's real.** The analyze → sign → Walrus + on-chain Sui object → verify → interactive-tamper loop is **live end-to-end** (Walrus testnet). Live feeds: CoinGecko (price/trend/RSI/vol/drawdown) + DeepBook v3 (depth/spread), each with deterministic fallbacks. Extras shipped: relevance gate (off-topic → friendly redirect, never a fake verdict), plain-language "Explain" layer + glossary, LIVE/DEMO badge, charts + evidence panel + decision-strength meter, and a standalone offline `verify_cli`. **Honest scope:** it is an *evidence* layer — it proves *what* the AI decided and that it wasn't altered, **not** that the decision is correct, profitable, or "compliant."

---

## Submission Files  *(Required — upload these)*
- `submission/one-pager.md` (or its PDF) — the leave-behind
- `deck/glassbox-deck.html` → **export to PDF** and upload (the 10-slide deck)
- `submission/prompts-and-tech-stack.md` — prompts + stack (the "built with AI" requirement)
- 2–3 screenshots: the verdict + debate, the **TAMPER DETECTED** moment, and the QR / verify-on-phone page
- (Repo already contains `SPEC.md`, `README.md`, `glassbox.plain`, `glassbox.config.yaml`)

---

## Link to Code  *(Required)*
```
https://github.com/supawichza40/glassbox
```
⚠️ **Make it PUBLIC first** (currently private → judges see 404). Contains `glassbox.plain` + `glassbox.config.yaml` for the *codeplain bounty.

## Link to Presentation  *(Required)*
⏳ Upload `deck/glassbox-deck.html` exported as **PDF**, or host it (e.g. the same Vercel project) and paste the link. Working source: `deck/glassbox.md` (Marp).

## Link to Demo Video  *(Required)*
⏳ **Record ~2–3 min** (run-sheet in `DEMO.md`) and paste the YouTube/Loom link. Must play logged-out. Suggested arc: ask a question → watch Bull/Bear debate → verdict + Signal Strength → "Prove it" → **scan the QR / open the verify page → VERIFIED → edit one char → TAMPER DETECTED**.

## Live Demo Link  *(Required)*
```
https://glassbox-1mvl.onrender.com
```
Verify-it-yourself: `https://glassbox-1mvl.onrender.com/verify` · static mirror (Vercel): `https://static-flame-tau.vercel.app/verify` · backup full app (Heroku): `https://glassbox-evidence-834d99a1d3b7.herokuapp.com`
*(Render's free plan cold-starts ~30–60s when idle — **open it once to warm it right before judging.**)*

---

## Built with *(tags)*
`Sui` · `Walrus` · `DeepBook` · `ed25519` · `Python` · `FastAPI` · `Gemini` · `Codeplain` · `Web Crypto` · `pytest` · `Render` · `Vercel`

## Team
**The Start of a Joke** — Supavich Aussawaauschariyakul · Orestis Kap
