# GlassBox server (Python FastAPI brain)

The backend "brain": agents → sign → Walrus + Sui anchor → verify. Provider-agnostic LLM (OpenRouter / Gemini / Ollama).

## Quick start
1. **Paste an API key** into the project-root `.env` (gitignored):
   - Recommended: get an [OpenRouter key](https://openrouter.ai/keys) → `OPENROUTER_API_KEY=...`, keep `LLM_PROVIDER=openrouter`.
   - Or Gemini direct: `GEMINI_API_KEY=...` and set `LLM_PROVIDER=gemini` (+ gemini model ids).
2. **Smoke-test the provider** (needs only `requests` + `python-dotenv`, already installed):
   ```bash
   cd server && python3 -m glassbox.smoke
   ```
   You should see both `fast` and `smart` models return JSON in ~1–3s.
3. **Switch models any time** by editing `LLM_MODEL_FAST` / `LLM_MODEL_SMART` in `.env`.

## Layout
- `glassbox/config.py` — reads `.env`
- `glassbox/llm.py` — `chat_json(system, user, role)` over openrouter | gemini | ollama
- `glassbox/smoke.py` — provider + latency check
- *(next)* `agents.py` (rebuttal round) · `decision.py` · `audit.py` · `verify.py` · `main.py` (FastAPI)
