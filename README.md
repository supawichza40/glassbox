# GlassBox

**Tamper-evident accountability for AI financial decisions.**

Watch two AI agents argue an investing call — then prove the decision they signed can't be altered after the fact.

**▶ Try it live:** **[full app](https://glassbox-evidence-834d99a1d3b7.herokuapp.com)** · **[verify-it-yourself](https://static-flame-tau.vercel.app/verify)** — open on your phone: it recomputes the hash + checks the ed25519 signature in *your* browser, against a network we don't control. Submission package → [`submission/`](submission/).

**Bounties:** Sui (DeepBook + Walrus) · BGA (AI trading — transparency, not PnL) · *codeplain (`glassbox.plain`).

---

## The problem

AI is starting to make financial calls. When a model says **BUY** and the trade goes wrong, three questions have no good answer today:

1. **Did the AI actually say that?** Logs live in a database the operator controls — and can quietly edit.
2. **Was the decision changed after the fact?** A screenshot proves nothing. A mutable log proves nothing.
3. **Why** did it decide that — and what did it *miss*?

Regulators already require firms to keep trustworthy, time-ordered records of advice and orders (SEC Rule 17a-4 audit-trail; MiFID II RTS 6 algorithmic-trading records). An AI black box that emits a number and an editable log doesn't meet that bar. The reasoning is opaque, and the record is only as honest as whoever owns the server.

**GlassBox is the evidence layer that closes that gap** — not a better trader, an *accountable* one.

---

## What GlassBox does

You type a plain-English goal for **SUI/USDC** ("Should I hold SUI for 2 weeks? Moderate risk."). GlassBox:

1. **Computes 5 market features** from a frozen, closed-candle snapshot — trend vs 20-day MA, RSI(14), realized-volatility percentile, order-book liquidity/spread (DeepBook), and drawdown from high. These exact bytes are what the agents see and what later gets hashed.
2. **Runs a structured debate.** A **Bull** and a **Bear** agent each open with two evidence-cited points, then get **one rebuttal round** where each addresses the other's strongest argument and revises its conviction. Agents may use *only* the numbers in the inputs — every claim must cite a field.
3. **Resolves with a Risk Arbiter** into a **verdict** (BUY / HOLD / AVOID), a mechanical **Signal Strength** (Low / Medium / High), a suggested position size capped by risk band, a **counterfactual** ("I'd change my call if ___"), and explicit **blind-spots** (e.g. "does not include news, sentiment, or events").
4. **Seals the decision.** The decision object is canonicalized → **SHA-256 hashed** → **ed25519-signed** (proves *origin*) → written to **Walrus** on Sui, which **registers it as a real on-chain Sui object** — an independent, explorer-verifiable anchor.
5. **Lets anyone verify — and try to break it.** The signed record is shown in an **editable** field next to its anchored fingerprint, with its hash recomputed live in the browser: identical → **VERIFIED**; change a single character → **TAMPER DETECTED**, instantly. "Re-verify on Walrus" re-fetches the bytes independently and re-checks the signature.

> **Signal Strength is not a probability of profit.** It's a mechanical measure of *how decisive the evidence and the debate were* — wide conviction gap, low volatility, healthy liquidity → High; a coin-flip in a thin, choppy market → Low. It is monotone non-increasing in risk and in volatility by construction.

---

## The live "wow"

**Watch the AI argue — then watch its decision become un-editable.**

- The Bull and Bear genuinely disagree on screen, each citing the same frozen numbers.
- The Arbiter picks a side, states *why*, and names what it can't see.
- Hit **Verify** → green **MATCH** (re-fetched independently from Walrus).
- **Edit the signed record yourself** — change even one character → red **TAMPER DETECTED** as its fingerprint breaks live (the differing hash characters highlighted); Reset → green **VERIFIED**.

That last beat is the pitch: *the record fought back.* You cannot quietly rewrite history.

---

## Verified working (end-to-end, live)

The Python "brain" is **built and proven live**, end to end, against real infrastructure:

```
analyze  →  ed25519 sign  →  Walrus write (real blob)  →  verify (MATCH)  →  tamper (MISMATCH)
```

- **analyze** — full Bull/Bear/Arbiter debate over the 5 computed features, returning a structured Decision.
- **sign** — canonical JSON (sorted keys, no whitespace) → SHA-256 → ed25519 signature over the exact bytes.
- **Walrus write** — real blob written to Walrus **testnet** (publisher endpoint), `blobId` returned.
- **verify** — re-fetches the blob *from the Walrus aggregator* (independent of the client), recomputes the hash, checks the signature → **MATCH**.
- **tamper** — alter one field of the record and re-verify → **MISMATCH** detected.

Run `python3 -m glassbox.audit_smoke` to reproduce all five steps yourself (see "Run it").

On top of the brain: a **FastAPI server + a redesigned demo UI** (verdict-hero, staged reveal, the **interactive tamper** demo, full accessibility); **live DeepBook** order-book depth/spread; an **on-chain Sui object** anchor for every record (via Walrus, explorer-verifiable); a **relevance gate** (off-topic input is redirected, never given a fabricated verdict); a standalone independent verifier (`verify_cli` — checks a record straight from Walrus with *no GlassBox server in the loop*); an instant **demo-mode cache**; and **100 tests + CI** (all LLM/network mocked).

---

## Architecture

```
                 plain-English goal + risk band
                              │
         ┌────────────────────▼─────────────────────┐
         │   codeplain spec-first frontend (React)   │   glassbox.plain  →  generated React
         │   spec is source of truth, code is build  │
         └────────────────────┬─────────────────────┘
                              │  HTTP (FastAPI)
         ┌────────────────────▼─────────────────────┐
         │        The Brain — Python FastAPI         │
         │                                           │
         │  market.py   live CoinGecko + DeepBook    │
         │  guard.py    off-topic relevance gate     │   provider switch:
         │  agents.py   Bull · Bear · Risk Arbiter   │   gemini | openrouter | ollama
         │  decision.py Signal Strength + size (code)│   (currently Gemini 2.5-flash)
         │  crypto.py   canonical · SHA-256 · ed25519│
         │  audit.py    sign + Walrus + Sui object   │
         │  verify.py / verify_cli  re-fetch + check │
         └──────┬──────────────────────────┬─────────┘
                │                          │
        ed25519 signature        Walrus blob + on-chain Sui object
        (proves ORIGIN)          (storage + an independent, explorer-verifiable anchor)
```

**Separation of concerns that matters here:** the LLM agents *reason only*. Every number that could be gamed — Signal Strength, position size, the rule-based baseline-verdict cross-check, numeric-grounding warnings — is computed in deterministic Python (`decision.py`), never by the model. The agents argue; the code scores.

**Provider switch:** one env var (`LLM_PROVIDER`) routes the whole pipeline across Gemini, OpenRouter, or local Ollama — no code changes. The active provider/models are recorded inside every Decision's `provenance` block.

**PII discipline:** the anchored object uses enum/numeric inputs only and never embeds the user's raw goal text. The goal text is stored separately, AES-GCM encrypted and **crypto-erasable** (destroy the key → ciphertext is gone), so accountability never costs privacy.

---

## Run it

The brain runs locally with only a pasted LLM key. From the repo root:

```bash
cd server
python3 -m pip install -r requirements.txt   # fastapi, requests, cryptography, ...
# paste a key into the repo-root .env (gitignored):
#   OPENROUTER_API_KEY=...   with LLM_PROVIDER=openrouter   (or GEMINI_API_KEY + LLM_PROVIDER=gemini)
```

**1. Provider smoke test** — confirms your LLM provider + key work and how fast:

```bash
cd server && python3 -m glassbox.smoke
```

**2. Analyze** — full Bull/Bear/Arbiter debate, prints the structured Decision:

```bash
python3 -m glassbox.analyze_smoke
```

**3. Audit + verify + tamper** — the headline end-to-end proof:

```bash
python3 -m glassbox.audit_smoke
#  1) analyze ...        verdict / signal / size
#  2) audit  ...         sink=walrus  blobId=...  recordHash / sig / pubkey
#  3) verify ...         MATCH
#  4) tamper ...         MISMATCH detected
```

**Run the server + demo UI** (the whole flow in a browser):

```bash
cd server && uvicorn glassbox.main:app --reload --port 8787
#  open http://localhost:8787/            full demo UI  (add ?present for projector type)
#  GET  /api/health                       provider + pipeline switches
#  GET  /api/pubkey                       published ed25519 verifying key
#  POST /api/analyze       goalText, asset, risk  → Decision  (422 {outOfScope} for off-topic input)
#  POST /api/audit         decision    → recordHash, signature, blobId, suiObjectId, recordCanonical
#  GET  /api/verify/{recordId}         → hashMatch, signatureValid
#  POST /api/rehash        decision    → recordHash
```

> Tip: to avoid Python-version/path issues, use a venv — `python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt` (dev/test extras: `requirements-dev.txt`).

**Demo mode** — instant, deterministic canonical run for the live pitch (no ~8s wait):

```bash
python3 -m glassbox.seed_demo                 # bake the canonical Decision
DEMO_MODE=1 uvicorn glassbox.main:app --port 8787
```

**Verify a record independently** — no GlassBox server needed:

```bash
python3 -m glassbox.verify_cli <blobId> <signature_hex> [pubkey_hex]   # → AUTHENTIC / not
```

**Run the tests** (100, all mocked; same suite as CI), and **watch real use-cases** against a running server:

```bash
cd server && python3 -m pytest -q          # 100 unit + integration tests
python3 -m glassbox.usecases               # live gallery: many real queries -> real outputs
```

> Market data is **live**: price-derived features from a **CoinGecko closed-candle feed**, and order-book **depth/spread from the public DeepBook v3 mainnet indexer** — each frozen per analysis (so the audit bytes stay reproducible) and each with a deterministic fallback if a feed is unreachable. The demo never breaks.

---

## Spec-first with codeplain

The frontend is built **spec-first** with [codeplain](https://codeplain.ai): **`glassbox.plain` is the source of truth, and the generated React is a build artifact.** You change the product by editing the spec and regenerating — not by hand-patching generated components. The Python brain stays a stable service the generated frontend calls over HTTP, so the spec describes *behavior and screens* while the proven backend handles cryptography and chain I/O.

`SPEC.md`, `AGENTS.md`, and `DESIGN.md` at the repo root capture the locked product, the debate-agent contract, and the design system. `resources/ui_reference.md` is the design brief the renderer reads (distilled from a 4-lens design review), and the served `static/index.html` is the working reference implementation + demo fallback. `DEMO.md` is the stage run-sheet.

---

## Bounty mapping

| Bounty | How GlassBox targets it |
|---|---|
| **Sui (DeepBook + Walrus)** | Every decision is stored on **Walrus**, which registers an **on-chain Sui object** (explorer-verifiable — an independent anchor); **live DeepBook** order-book depth/spread drives the liquidity feature + manipulation flag. |
| **BGA — AI Trading & Strategy** | Optimizes for **transparency, not PnL**: an explainable, auditable, signed reasoning trail with a mechanical Signal Strength — explicitly *not* a profit predictor. |
| **codeplain (spec-first)** | Frontend generated from `glassbox.plain`; the spec is the source of truth, generated code is an artifact. |
| **Main finale** | A working, demoable end-to-end product with a hard, provable wow moment (MATCH → MISMATCH). |
| **Solvimon (business)** | Framed as a B2B evidence/compliance layer designed to map to SEC 17a-4 and MiFID II RTS 6 record-keeping. |
| **FLock (sovereign AI)** | Provider-agnostic by design — the same pipeline runs on a self-hosted/sovereign model (local Ollama, or a FLock-served model) with no code change. |

---

## Honest caveats

We are deliberately precise about what this does and does **not** prove.

- **Tamper-*evident*, not tamper-*proof*.** GlassBox makes alteration *detectable*, not impossible.
- The signature proves **origin** (GlassBox produced this record). The **Walrus-registered Sui object** is the anchor — an independent, explorer-verifiable on-chain reference (registered at a Sui epoch). Together: *this exact decision existed by then and has not been changed.*
- It does **not** prove the **inputs were true** or that the **decision was correct** — garbage in is still garbage in, just provably so.
- **Signal Strength is not a probability of profit.** GlassBox never pitches returns or PnL.
- Running on **Walrus testnet**; each record registers an on-chain Sui object (the anchor). A *dedicated* anchor transaction (our own wallet) is an optional extra, not required. DeepBook is read from **mainnet** (read-only) for real liquidity.
- Price features (CoinGecko) and DeepBook depth/spread are **live reads**, each with a deterministic fallback if a feed is unreachable.
- **Not financial advice.** GlassBox produces structured, auditable analysis — a human (or an upstream policy) owns the trade.

---

## Team

**The Start of a Joke** — Supavich Aussawaauschariyakul · Orestis Kap.
Built at the **Encode Vibe Coding Hackathon**, London.

*Repo: `github.com/supawichza40/glassbox` (private until submission).*
