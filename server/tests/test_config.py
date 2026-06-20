"""Unit tests for glassbox.config.models() — provider selection.

config._MODELS is frozen from .env at import time, so to make these tests
deterministic and environment-independent we monkeypatch both _MODELS (the
per-provider pairs) and LLM_PROVIDER (the active selector).
"""
from glassbox import config

_FIXED_MODELS = {
    "openrouter": ("or-fast", "or-smart"),
    "gemini": ("gem-fast", "gem-smart"),
    "ollama": ("oll-fast", "oll-smart"),
}


def test_models_selects_gemini_pair(monkeypatch):
    monkeypatch.setattr(config, "_MODELS", _FIXED_MODELS)
    monkeypatch.setattr(config, "LLM_PROVIDER", "gemini")
    assert config.models() == ("gem-fast", "gem-smart")


def test_models_selects_openrouter_pair(monkeypatch):
    monkeypatch.setattr(config, "_MODELS", _FIXED_MODELS)
    monkeypatch.setattr(config, "LLM_PROVIDER", "openrouter")
    assert config.models() == ("or-fast", "or-smart")


def test_models_selects_ollama_pair(monkeypatch):
    monkeypatch.setattr(config, "_MODELS", _FIXED_MODELS)
    monkeypatch.setattr(config, "LLM_PROVIDER", "ollama")
    assert config.models() == ("oll-fast", "oll-smart")


def test_models_falls_back_to_openrouter_on_unknown_provider(monkeypatch):
    """An unknown LLM_PROVIDER degrades to the openrouter pair (per .get default)."""
    monkeypatch.setattr(config, "_MODELS", _FIXED_MODELS)
    monkeypatch.setattr(config, "LLM_PROVIDER", "totally-unknown")
    assert config.models() == ("or-fast", "or-smart")


def test_models_returns_two_tuple_with_real_config():
    """Against the real (env-derived) config, models() is always a (fast, smart) pair."""
    pair = config.models()
    assert isinstance(pair, tuple) and len(pair) == 2
    assert all(isinstance(m, str) for m in pair)
