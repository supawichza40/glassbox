# GlassBox — one-pager

**Tamper-evident accountability for AI financial decisions.**
*Watch two AI agents argue an investing call — then prove the decision they signed can't be altered after the fact.*

**Team:** The Start of a Joke — Supavich Aussawaauschariyakul · Orestis Kap · Encode Vibe Coding Hackathon, London.

---

### The problem
AI is starting to make financial calls. When a model says **BUY** and it goes wrong, no one can prove *what the AI actually said*, *whether the record was changed afterward*, or *why* it decided that. Logs live in a database the operator can quietly edit. Regulators already demand trustworthy, time-ordered records (**SEC Rule 17a-4** audit-trail, **MiFID II RTS 6** algo-trading records) — an AI black box with an editable log doesn't meet that bar.

### The solution
GlassBox is an **evidence layer**, not a better trader. You enter a plain-English goal for **SUI/USDC** + a risk band. A **Bull** and a **Bear** agent debate over **5 computed market features** (trend, RSI, realized-vol percentile, DeepBook liquidity/spread, drawdown) with **one rebuttal round**; a **Risk Arbiter** resolves a **verdict** (BUY/HOLD/AVOID), a mechanical **Signal Strength**, a suggested size, a **counterfactual**, and explicit **blind-spots**. The decision is then **hashed → ed25519-signed (origin) → written to Walrus on Sui → anchored on-chain (independent timestamp + non-alteration).** The agents *reason*; deterministic Python *scores* every gameable number.

### The demo (60-second wow)
1. Type a goal → the Bull and Bear **argue on screen**, each citing the same frozen numbers; the Arbiter picks a side and names what it can't see.
2. Click **Verify** → re-fetch the record independently from Walrus → green **MATCH**.
3. Click **Try to alter it** → flip one field → red **MISMATCH**, the two diverging fingerprints shown side by side. *The record fought back — you cannot quietly rewrite history.*

### Why it wins
- **A real, undeniable wow** that maps to a real compliance need: legible AI reasoning **plus** a record that proves it wasn't altered.
- **Transparency, not PnL** — Signal Strength is a mechanical measure of how decisive the evidence was, **never a profit prediction**.
- **Honest by construction** — tamper-*evident* (not tamper-proof), PII-free anchored object, AES-GCM crypto-erasable goal text, provider-agnostic.
- **Spec-first** — the product is the spec (`glassbox.plain`), so it's reproducible and fast to evolve.

### Tech stack
- **Brain:** Python **FastAPI**; multi-agent debate (Bull/Bear/Risk Arbiter); deterministic scoring in `decision.py`.
- **LLM:** provider-agnostic switch — **gemini | openrouter | ollama** (currently **Gemini 2.5-flash**).
- **Crypto/chain:** SHA-256 + **ed25519** + AES-GCM (`cryptography`); **Walrus testnet** blob storage; **Sui** on-chain anchor (Tier 2).
- **Frontend:** a served **demo UI** (verdict-hero, staged reveal, the MISMATCH climax with a fingerprint diff, full accessibility) — the working reference + demo fallback; **codeplain** spec-first (`glassbox.plain` → React, spec is source of truth) is the generated path, with `resources/ui_reference.md` as the design brief.

### What's real vs roadmap
**Real & proven live (end-to-end):** `analyze → ed25519 sign → Walrus write (real blob) → verify (MATCH) → tamper (MISMATCH)`, reproducible via `python3 -m glassbox.audit_smoke`. On top of it: a **FastAPI server + redesigned demo UI**, a **standalone independent verifier** (`verify_cli` — verifies a record straight from Walrus with *no GlassBox server in the loop*, validated live), an instant **demo-mode cache** for the pitch, and **67 tests + CI** (all mocked).
**Roadmap:** real DeepBook depth/spread (the price-derived features are already a **live CoinGecko closed-candle feed** in `market.py`, with a deterministic fallback), the Sui on-chain anchor wired from Tier-2 to default-on, mainnet, and the generated codeplain UI over the proven brain.

### Honest caveats
Tamper-**evident**, not tamper-proof. Signature = **origin**; anchor = **non-alteration + timestamp** — it does **not** prove the inputs were true or the call correct. **Testnet, not mainnet. Not financial advice.** Designed to *map to* SEC 17a-4 / MiFID II RTS 6 record-keeping — an evidence layer, not a compliance guarantee.

### Bounties
**Sui** (DeepBook + Walrus) · **BGA** (AI Trading & Strategy — transparency) · **codeplain** (spec-first) · **main finale** · narrative: **Solvimon** (business), **FLock** (sovereign AI).
