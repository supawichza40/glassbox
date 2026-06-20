# GlassBox server (Python FastAPI brain)

The backend "brain" + the demo UI: **agents → sign → Walrus → verify → tamper**, exposed over HTTP and served with a static demo front-end. Provider-agnostic LLM (Gemini / OpenRouter / Ollama). Built and proven live end-to-end.

## Quick start
1. **Paste an API key** into the project-root `.env` (gitignored):
   - Gemini (default): `GEMINI_API_KEY=...` with `LLM_PROVIDER=gemini` (models default to `gemini-2.5-flash`).
   - Or OpenRouter: `OPENROUTER_API_KEY=...` with `LLM_PROVIDER=openrouter`.
   - Or local Ollama: `LLM_PROVIDER=ollama` (no key).
2. **Install + run the server:**
   ```bash
   cd server
   python3 -m pip install -r requirements.txt
   uvicorn glassbox.main:app --reload --port 8787
   ```
   Open **http://localhost:8787/** — the full demo UI (analyze → debate → verdict → prove → verify → tamper). Add `?present` for projector-sized type.

## Endpoints
| Route | Does |
|---|---|
| `GET  /api/health` | active provider + models + pipeline switches |
| `GET  /api/pubkey` | the published ed25519 verifying key |
| `POST /api/analyze` | `{goalText, asset, risk}` → full Decision (Bull/Bear/Arbiter debate) |
| `POST /api/audit` | `{decision, goalText}` → canonical-hash, ed25519 signature, Walrus `blobId` |
| `GET  /api/verify/{recordId}` | re-fetch from Walrus, recompute hash, check signature → `hashMatch`, `signatureValid` |
| `POST /api/rehash` | hash a (possibly altered) decision — powers the tamper "MISMATCH" |

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

## Tests
67 tests (unit + integration + failure-injection), all LLM/network mocked. CI runs them on every push (`.github/workflows/tests.yml`).
```bash
cd server && python3 -m pytest -q     # or ./run_tests.sh
```

## Layout
```
glassbox/
  config.py      reads root .env; provider/model switch; pipeline flags (AUDIT_SINK, ANCHOR, EXECUTION, DEMO_MODE)
  llm.py         chat_json(system, user, role) over gemini | openrouter | ollama (+ JSON repair-retry)
  market.py      5 frozen, closed-candle market features (deterministic dev snapshot)
  agents.py      Bull · Bear · Risk Arbiter — opening + one rebuttal round, safe-fallbacks
  decision.py    Signal Strength + size + baseline cross-check (deterministic; never the LLM)
  crypto.py      canonical JSON · SHA-256 · ed25519 sign/verify · AES-GCM (crypto-erasure)
  audit.py       canonical → hash → sign → Walrus write (degrades to local sink)
  verify.py      re-fetch from Walrus → recompute hash → check signature
  verify_cli.py  standalone independent verifier (no server needed)
  demo.py        DEMO_MODE cache lookup;  seed_demo.py  bakes it
  main.py        FastAPI app + serves static/ demo UI
  static/        the demo UI (index.html)
  *_smoke.py     terminal reproductions of each stage
tests/           67 pytest tests + conftest + run_tests.sh
```

## Provider / model switch
One env var routes the whole pipeline — no code changes. Per-provider model pairs:
`GEMINI_MODEL_FAST` / `GEMINI_MODEL_SMART`, `OPENROUTER_MODEL_FAST` / `OPENROUTER_MODEL_SMART`, `OLLAMA_MODEL_FAST` / `OLLAMA_MODEL_SMART`. The active provider + models are recorded in every Decision's `provenance`.
