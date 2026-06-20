# GlassBox server (Python FastAPI brain)

The backend "brain" + the demo UI: **agents → sign → Walrus → verify → tamper**, exposed over HTTP and served with a static demo front-end. Provider-agnostic LLM (Gemini / OpenRouter / Ollama). Built and proven live end-to-end.

## Quick start
1. **Paste an API key** into the project-root `.env` (gitignored):
   - Gemini (default): `GEMINI_API_KEY=...` with `LLM_PROVIDER=gemini` (models default to `gemini-2.5-flash`).
   - Or OpenRouter: `OPENROUTER_API_KEY=...` with `LLM_PROVIDER=openrouter`.
   - Or local Ollama: `LLM_PROVIDER=ollama` (no key).
2. **Install + run the server** (a venv avoids Python-version/path issues):
   ```bash
   cd server
   python3 -m venv .venv && source .venv/bin/activate
   pip install -r requirements.txt            # + requirements-dev.txt for pytest/ruff
   uvicorn glassbox.main:app --reload --port 8787
   ```
   Open **http://localhost:8787/** — the full demo UI (analyze → debate → verdict → prove → verify → tamper). Add `?present` for projector-sized type.

## Endpoints
| Route | Does |
|---|---|
| `GET  /api/health` | active provider + models + pipeline switches |
| `GET  /api/pubkey` | the published ed25519 verifying key |
| `POST /api/analyze` | `{goalText, asset, risk}` → full Decision (Bull/Bear/Arbiter debate). Off-topic input → `422 {outOfScope, message}` (relevance gate) |
| `POST /api/audit` | `{decision, goalText}` → recordHash, ed25519 signature, Walrus `blobId`, **`suiObjectId`** + `anchorEpoch` (on-chain anchor), `recordCanonical` (the exact bytes hashed) |
| `GET  /api/verify/{recordId}` | re-fetch from Walrus, recompute hash, check signature → `hashMatch`, `signatureValid` |
| `POST /api/rehash` | hash a decision server-side (the UI tamper demo hashes client-side via Web Crypto) |

## Live market data + on-chain anchor (both with fallbacks)
- **Market feed** — price / trend / RSI / realized-vol / drawdown from a **CoinGecko** closed-candle feed; **depth/spread from the public DeepBook v3 mainnet indexer**. Frozen per analysis; falls back to a deterministic snapshot / modeled depth if a feed is down.
- **Sui anchor** — writing to Walrus **registers the record as an on-chain Sui object**; `/api/audit` returns its `suiObjectId` + `anchorEpoch` (explorer-verifiable, **no wallet needed**). A *dedicated* anchor transaction (`ANCHOR=sui` + a funded `SUI_PRIVATE_KEY`) is an optional Tier-2 path (`anchor.py`, scaffolded).
- **Relevance gate** (`guard.py`) — greetings/off-topic input get a friendly redirect, never a fabricated verdict.

## Demo mode (stage safety)
`DEMO_MODE=1` makes the canonical pitch question return a **pre-baked Decision instantly** (no ~8s wait, no LLM variance), while any other question still runs live.
```bash
python3 -m glassbox.seed_demo                 # bake the canonical Decision into demo_cache.json
DEMO_MODE=1 uvicorn glassbox.main:app --port 8787
```
See `../DEMO.md` for the full run-sheet.

## Independent verifier (no server in the loop)
Anyone can verify a record straight from Walrus + the published key — this is what makes "verifiable by anyone" literal:
```bash
python3 -m glassbox.verify_cli <blobId> <signature_hex> [pubkey_hex]
#  -> recomputes the hash, checks the ed25519 signature, prints AUTHENTIC / not
```

## Smoke scripts (reproduce the proof from a terminal)
```bash
python3 -m glassbox.smoke          # provider + latency check
python3 -m glassbox.analyze_smoke  # full debate → structured Decision
python3 -m glassbox.audit_smoke    # analyze → sign → Walrus write → verify (MATCH) → tamper (MISMATCH)
```

## Tests + live gallery
100 tests (unit + integration + scenario + failure-injection), all LLM/network mocked. CI runs them on every push (`.github/workflows/tests.yml`).
```bash
cd server && python3 -m pytest -q              # 100 tests  (deps: requirements-dev.txt)
python3 -m glassbox.usecases                   # live: many real queries -> real outputs (needs a running server)
```

## Layout
```
glassbox/
  config.py      reads root .env; provider/model switch; pipeline flags (AUDIT_SINK, ANCHOR, EXECUTION, DEMO_MODE)
  llm.py         chat_json(system, user, role) over gemini | openrouter | ollama (+ JSON repair-retry)
  market.py      live feed: CoinGecko closed candles + DeepBook depth/spread (both with fallback)
  guard.py       relevance gate — off-topic input redirected, not given a verdict
  agents.py      Bull · Bear · Risk Arbiter — opening + one rebuttal round, safe-fallbacks
  decision.py    Signal Strength (clamped 0-100) + size + baseline cross-check (deterministic; never the LLM)
  crypto.py      canonical JSON · SHA-256 · ed25519 sign/verify · AES-GCM (crypto-erasure)
  audit.py       canonical → hash → sign → Walrus write + on-chain Sui object (degrades to local sink)
  anchor.py      optional dedicated Sui anchor tx (Tier-2 scaffold; needs a funded wallet)
  verify.py      re-fetch from Walrus → recompute hash → check signature
  verify_cli.py  standalone independent verifier (no server needed)
  demo.py        DEMO_MODE cache lookup;  seed_demo.py  bakes it
  usecases.py    live use-case gallery (many real queries -> real outputs)
  main.py        FastAPI app + serves static/ demo UI
  static/        the demo UI (index.html — interactive tamper demo)
  *_smoke.py     terminal reproductions of each stage
tests/           100 pytest tests + conftest + run_tests.sh
```

## Provider / model switch
One env var routes the whole pipeline — no code changes. Per-provider model pairs:
`GEMINI_MODEL_FAST` / `GEMINI_MODEL_SMART`, `OPENROUTER_MODEL_FAST` / `OPENROUTER_MODEL_SMART`, `OLLAMA_MODEL_FAST` / `OLLAMA_MODEL_SMART`. The active provider + models are recorded in every Decision's `provenance`.
