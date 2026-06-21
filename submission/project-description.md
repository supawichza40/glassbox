# GlassBox — Project Description

**Tagline:** Tamper-evident accountability for AI financial decisions — verify any AI decision *yourself*, on a network we don't control.

## What it does
GlassBox turns an AI's financial decision into a **signed, independently-verifiable record**. You ask a plain-English question about SUI/USDC at a chosen risk level. The server freezes five real market features (closed candles, no lookahead); a **Bull** and a **Bear** LLM agent debate them (one rebuttal round); a **Risk Arbiter** resolves a verdict — **BUY / HOLD / AVOID** — with a **mechanical Signal Strength** (a transparent formula, *not* a profit forecast), a vol-targeted position size, a counterfactual ("this would flip if…"), and named blind spots.

Then the accountability layer: the decision becomes a PII-free record, **ed25519-signed**, hashed, written to **Walrus** (which registers a real **on-chain Sui object**). A **"verify-it-yourself" page** lets anyone re-fetch the blob from Walrus and recompute the hash + check the signature **in their own browser** against a published key — **no GlassBox server in the trust path.** Edit one character → **TAMPER DETECTED**, with a plain-English diff of exactly which field changed. Scan a QR and do it on your own phone.

## How we built it
- **Brain (hand-written):** Python + **FastAPI**. Provider-agnostic LLM layer (currently `gemini-2.5-flash`) with JSON validation + repair-retry and safe-HOLD fallbacks. Deterministic `decision.py` (Signal Strength + size). Live feeds: **CoinGecko** (price/trend/RSI/realized-vol/drawdown) + **DeepBook v3** indexer (depth/spread), both frozen per analysis, both with deterministic fallbacks.
- **Trust layer:** ed25519 (`cryptography`), SHA-256 over deterministic canonical JSON, **Walrus** blob + **on-chain Sui object** anchor, plus a standalone offline `verify_cli` and an in-browser verifier (Web Crypto SHA-256 + vendored `@noble/ed25519`, offline QR).
- **Frontend (spec-first):** generated from **`glassbox.plain`** via **Codeplain** (the `.plain` spec is the source of truth, not the rendered code).
- **How we used AI:** built AI-first with Claude Code and a multi-agent design + red-team loop (a panel of expert lenses chose and pressure-tested features; a QA agent drove a real browser; a security agent caught overclaims). See `prompts-and-tech-stack.md`.

## Challenges / what we learned
- **Honesty is a feature.** Our red-team caught real overclaims and we fixed them: "tamper-evident," never "tamper-proof"; the on-chain link is a Walrus blob registration object + **storage epoch**, not a wall-clock timestamp; Signal Strength is mechanical, not a probability of profit; it's an *evidence* layer, not a compliance guarantee. The honest framing is what makes the demo bullet-proof under hostile questions.
- **Web Crypto needs a secure context.** The in-browser verify only runs over HTTPS/localhost — so "scan it on your phone" required a real HTTPS deploy, not a LAN IP.
- **Stateless hosts break in-memory state.** On an ephemeral dyno the signing key must come from an env var (or the published key drifts and every verification breaks); we pinned it.

## What's next
Dedicated Sui anchor transaction (own digest), DeepBook manual-confirm execution as another *audited* event, persistent record store (DB), GDPR crypto-erase wiring, and a customer co-signing (two-key) attestation.

## Built with
Sui · Walrus · DeepBook · ed25519 · SHA-256 · Python · FastAPI · Gemini · Codeplain · Web Crypto · @noble/ed25519 · pytest · Heroku · Vercel

## Team
**The Start of a Joke** — Supavich Aussawaauschariyakul · Orestis Kap · Encode Vibe Coding Hackathon (London).
