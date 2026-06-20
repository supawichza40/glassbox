"""Unit tests for glassbox.llm._parse_json and model_for — pure, no network."""

import pytest
from glassbox import llm


# --------------------------------------------------------------------------
# _parse_json: fences, prose extraction, hard failure
# --------------------------------------------------------------------------
def test_parse_strips_json_fences():
    text = "```json\n{\"verdict\": \"BUY\", \"n\": 1}\n```"
    assert llm._parse_json(text) == {"verdict": "BUY", "n": 1}


def test_parse_strips_bare_fences():
    text = "```\n{\"a\": 1}\n```"
    assert llm._parse_json(text) == {"a": 1}


def test_parse_extracts_object_from_surrounding_prose():
    text = 'Sure! Here is the JSON you asked for: {"a": 1, "b": [2, 3]} — hope that helps.'
    assert llm._parse_json(text) == {"a": 1, "b": [2, 3]}


def test_parse_plain_object():
    assert llm._parse_json('{"ok": true}') == {"ok": True}


def test_parse_nested_object_from_prose():
    text = 'prefix {"outer": {"inner": 5}} suffix'
    assert llm._parse_json(text) == {"outer": {"inner": 5}}


def test_parse_raises_on_non_json():
    with pytest.raises(Exception):
        llm._parse_json("there is absolutely no json object here")


def test_parse_raises_on_empty():
    with pytest.raises(Exception):
        llm._parse_json("")


# --------------------------------------------------------------------------
# model_for: smart vs fast routing (env-independent via monkeypatched models)
# --------------------------------------------------------------------------
def test_model_for_routes_smart_and_fast(monkeypatch):
    from glassbox import config
    monkeypatch.setattr(config, "models", lambda: ("FAST-X", "SMART-Y"))
    assert llm.model_for("fast") == "FAST-X"
    assert llm.model_for("smart") == "SMART-Y"
    # any non-'smart' role -> fast
    assert llm.model_for("anything-else") == "FAST-X"


# --------------------------------------------------------------------------
# chat_json: ONE repair retry on bad JSON, then LLMError
# (we mock _dispatch so no network is touched)
# --------------------------------------------------------------------------
def test_chat_json_repairs_after_one_bad_reply(monkeypatch):
    calls = {"n": 0}

    def fake_dispatch(system, user, role, timeout):
        calls["n"] += 1
        if calls["n"] == 1:
            return "this is not json"          # first try fails to parse
        return '{"verdict": "HOLD"}'           # repair retry succeeds

    monkeypatch.setattr(llm, "_dispatch", fake_dispatch)
    out = llm.chat_json("sys", "user", role="fast")
    assert out == {"verdict": "HOLD"}
    assert calls["n"] == 2  # exactly one repair retry


def test_chat_json_raises_after_two_bad_replies(monkeypatch):
    def fake_dispatch(system, user, role, timeout):
        return "still not json"

    monkeypatch.setattr(llm, "_dispatch", fake_dispatch)
    with pytest.raises(llm.LLMError):
        llm.chat_json("sys", "user", role="fast")
