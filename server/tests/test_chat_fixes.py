"""Regression tests for two issues found during live (real-provider) testing of
the explainer chatbot — both hidden by the mocked unit tests:

  1. A provider TRANSPORT error (e.g. local Ollama crashing) bubbled up as an
     unhandled 500 instead of degrading gracefully, because only LLMError was
     caught — a raw requests.ConnectionError is not an LLMError.
  2. self_check nuked a CORRECT "tamper-evident vs tamper-proof" comparison to the
     SAFE_FALLBACK because the contrast exemption only matched one narrow phrasing.
"""
import requests
import pytest

from glassbox import llm, chat as chat_mod, chat_prompt


# --- Fix 1: transport errors become LLMError and degrade gracefully -----------
def test_transport_error_is_wrapped_as_llmerror(monkeypatch):
    def boom(*a, **k):
        raise requests.exceptions.ConnectionError(
            "('Connection aborted.', RemoteDisconnected('Remote end closed connection'))")
    monkeypatch.setattr(llm.config, "LLM_PROVIDER", "ollama")  # no key needed
    monkeypatch.setattr(llm.requests, "post", boom)
    with pytest.raises(llm.LLMError):
        llm.chat_text("system", "user", role="fast")


def test_answer_chat_degrades_on_transport_error(monkeypatch):
    def boom(*a, **k):
        raise requests.exceptions.ConnectionError("conn aborted")
    monkeypatch.setattr(llm.config, "LLM_PROVIDER", "ollama")
    monkeypatch.setattr(llm.requests, "post", boom)
    out = chat_mod.answer_chat("What is Signal Strength?")  # legit -> reaches the model path
    assert isinstance(out, dict)
    assert out["refused"] is False
    assert out["answer"]                      # a friendly fallback, not an exception/500


# --- Fix 2: self_check allows the contrast, still catches bare overclaims ------
@pytest.mark.parametrize("good", [
    "GlassBox is tamper-evident, which is different from tamper-proof.",
    "It's tamper-evident, as opposed to tamper-proof, so changes are detectable.",
    "This makes alterations detectable rather than tamper-proof.",
    "tamper-evident, not tamper-proof",                       # the original exempted form
])
def test_self_check_allows_tamper_proof_contrast(good):
    assert chat_prompt.self_check(good).ok, good


@pytest.mark.parametrize("bad", [
    "Your record is completely tamper-proof.",
    "GlassBox makes the data tamper-proof forever.",
    "Unlike a mutable log, this record is tamper-proof.",     # affirmative overclaim -> caught
])
def test_self_check_still_catches_bare_tamper_proof(bad):
    assert not chat_prompt.self_check(bad).ok, bad
