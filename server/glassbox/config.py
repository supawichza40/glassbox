"""Loads GlassBox config from the project-root .env (gitignored)."""
import os
from pathlib import Path

from dotenv import load_dotenv

# server/glassbox/config.py -> parents[2] == project root
load_dotenv(Path(__file__).resolve().parents[2] / ".env")


def _g(key: str, default: str = "") -> str:
    return (os.getenv(key, default) or "").strip()


LLM_PROVIDER = _g("LLM_PROVIDER", "openrouter").lower()

# per-provider (fast, smart) model pairs — only the active provider's pair is used
_MODELS = {
    "openrouter": (_g("OPENROUTER_MODEL_FAST", "google/gemini-2.0-flash-001"),
                   _g("OPENROUTER_MODEL_SMART", "anthropic/claude-3.5-sonnet")),
    "gemini":     (_g("GEMINI_MODEL_FAST", "gemini-2.5-flash"),
                   _g("GEMINI_MODEL_SMART", "gemini-2.5-pro")),
    "ollama":     (_g("OLLAMA_MODEL_FAST", "llama3.2:latest"),
                   _g("OLLAMA_MODEL_SMART", "llama3.2:latest")),
}


def models():
    """(fast_model, smart_model) for the active LLM_PROVIDER."""
    return _MODELS.get(LLM_PROVIDER, _MODELS["openrouter"])


# keys
OPENROUTER_API_KEY = _g("OPENROUTER_API_KEY")
GEMINI_API_KEY     = _g("GEMINI_API_KEY")
ANTHROPIC_API_KEY  = _g("ANTHROPIC_API_KEY")
FLOCK_API_KEY      = _g("FLOCK_API_KEY")

# pipeline switches
AUDIT_SINK         = _g("AUDIT_SINK", "walrus").lower()
ANCHOR             = _g("ANCHOR", "none").lower()
EXECUTION          = _g("EXECUTION", "simulated").lower()
DEMO_MODE          = _g("DEMO_MODE", "").lower() in ("1", "true", "yes")
SUI_PRIVATE_KEY    = _g("SUI_PRIVATE_KEY")

# Walrus testnet (verified working)
WALRUS_PUBLISHER   = _g("WALRUS_PUBLISHER", "https://publisher.walrus-testnet.walrus.space")
WALRUS_AGGREGATOR  = _g("WALRUS_AGGREGATOR", "https://aggregator.walrus-testnet.walrus.space")
