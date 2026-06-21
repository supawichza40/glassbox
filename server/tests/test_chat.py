"""Tests for the explainer chatbot: orchestration (glassbox.chat) + the
POST /api/chat route. The LLM is always mocked — no provider is ever called.

We patch ``glassbox.llm.chat_text`` (the text transport chat.py calls) the same
way the existing suite patches ``glassbox.llm.chat_json``. A small ``spy`` helper
records whether the model was invoked so we can assert that a precheck refusal
costs ZERO tokens.
"""
import json

import pytest

from glassbox import chat as chat_mod
from glassbox import llm
from glassbox.chat_prompt import SAFE_FALLBACK


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------
class Spy:
    """A fake chat_text that records calls and returns a fixed reply."""
    def __init__(self, reply="A clear, on-brand explanation of the page."):
        self.reply = reply
        self.calls = []

    def __call__(self, system, user, role="fast", timeout=None):
        self.calls.append({"system": system, "user": user, "role": role})
        return self.reply

    @property
    def called(self):
        return len(self.calls) > 0


@pytest.fixture
def spy(monkeypatch):
    s = Spy()
    monkeypatch.setattr(llm, "chat_text", s)
    return s


def _sse_events(raw: str):
    """Parse an SSE body into a list of (event, data_dict) tuples."""
    events = []
    for block in raw.strip().split("\n\n"):
        if not block.strip():
            continue
        ev, data = None, None
        for line in block.splitlines():
            if line.startswith("event:"):
                ev = line[len("event:"):].strip()
            elif line.startswith("data:"):
                data = json.loads(line[len("data:"):].strip())
        events.append((ev, data))
    return events


# ===========================================================================
# (a) happy path — explainer answer returns {answer, refused:false}
# ===========================================================================
def test_answer_happy_path(spy):
    out = chat_mod.answer_chat("What does Signal Strength mean?")
    assert out["refused"] is False
    assert out["answer"] == spy.reply
    assert spy.called  # the model WAS consulted
    assert isinstance(out["suggestions"], list) and out["suggestions"]


def test_route_happy_path(client, spy):
    r = client.post("/api/chat", json={"question": "What does Signal Strength mean?"})
    assert r.status_code == 200
    body = r.json()
    assert body["refused"] is False
    assert body["answer"] == spy.reply
    assert isinstance(body["suggestions"], list)


# ===========================================================================
# (b) precheck refusal for advice -> refused:true + redirect, NO LLM call
# ===========================================================================
def test_advice_refused_without_llm_call(spy):
    out = chat_mod.answer_chat("Should I buy SUI right now?")
    assert out["refused"] is True
    assert "adviser" in out["answer"] or "advice" in out["answer"].lower()
    assert not spy.called  # the model was NOT called — token-free refusal
    assert out["suggestions"]


def test_route_advice_refused(client, spy):
    r = client.post("/api/chat", json={"question": "Should I buy SUI right now?"})
    assert r.status_code == 200
    assert r.json()["refused"] is True
    assert not spy.called


# ===========================================================================
# (c) prediction + off_topic refusals (also token-free)
# ===========================================================================
def test_prediction_refused(spy):
    out = chat_mod.answer_chat("Will SUI moon next week?")
    assert out["refused"] is True
    assert not spy.called


def test_off_topic_refused(spy):
    out = chat_mod.answer_chat("write me a poem about cats")
    assert out["refused"] is True
    assert not spy.called


def test_new_analysis_refused(spy):
    out = chat_mod.answer_chat("Can you analyze BTC instead?")
    assert out["refused"] is True
    assert not spy.called


# ===========================================================================
# (d) self_check substitution — "tamper-proof" in the model output -> SAFE_FALLBACK
# ===========================================================================
def test_self_check_substitutes_fallback(monkeypatch):
    bad = "Good news: this record is completely tamper-proof and can never be changed."
    monkeypatch.setattr(llm, "chat_text", lambda *a, **k: bad)
    out = chat_mod.answer_chat("Is this tamper-proof?")
    assert out["answer"] == SAFE_FALLBACK
    assert out["refused"] is True
    assert "tamper-proof" not in out["answer"]


def test_self_check_passes_clean_answer(monkeypatch):
    good = "It's tamper-evident: any change makes the fingerprint stop matching."
    monkeypatch.setattr(llm, "chat_text", lambda *a, **k: good)
    out = chat_mod.answer_chat("Is this tamper-proof?")
    assert out["answer"] == good
    assert out["refused"] is False


# ===========================================================================
# (e) context whitelisting — a secret-ish field is NOT echoed into model input
# ===========================================================================
def test_context_secret_not_echoed_to_model(spy):
    context = {
        "page": "dashboard",
        "decision": {
            "asset": "SUI/USDC",
            "verdict": "AVOID",
            "signalStrengthPct": 41,
            # a field that must never reach the model:
            "apiSecret": "sk-LEAK-THIS-SHOULD-NOT-APPEAR",
            "internalUserEmail": "victim@example.com",
        },
        "audit": {
            "recordHash": "4f9a1234567890abcdef",
            # redacted-class fields the whitelist must drop:
            "recordCanonical": "RAW-CANONICAL-BYTES-SECRET",
            "erasable": "PII-BLOB-SECRET",
        },
    }
    chat_mod.answer_chat("Why did it say AVOID?", context=context)
    assert spy.called
    sent = spy.calls[0]["system"] + "\n" + spy.calls[0]["user"]
    assert "sk-LEAK-THIS-SHOULD-NOT-APPEAR" not in sent
    assert "victim@example.com" not in sent
    assert "RAW-CANONICAL-BYTES-SECRET" not in sent
    assert "PII-BLOB-SECRET" not in sent
    # but the whitelisted, explainer-relevant fields DID make it through:
    assert "AVOID" in sent
    assert "41" in sent


# ===========================================================================
# (f) oversized / empty input handling
# ===========================================================================
def test_empty_question_422(client, spy):
    r = client.post("/api/chat", json={"question": ""})
    assert r.status_code == 422
    assert not spy.called


def test_whitespace_only_question_422(client, spy):
    r = client.post("/api/chat", json={"question": "    \n\t  "})
    assert r.status_code == 422
    assert not spy.called


def test_oversized_question_422(client, spy):
    r = client.post("/api/chat", json={"question": "x" * 2001})
    assert r.status_code == 422
    assert not spy.called


def test_history_trimmed_to_last_turns(client, spy):
    # 20 turns in -> only the last 6 should reach build_messages.
    history = [{"role": "user" if i % 2 == 0 else "assistant",
                "content": f"turn number {i} marker"} for i in range(20)]
    r = client.post("/api/chat",
                    json={"question": "What does Signal Strength mean?", "history": history})
    assert r.status_code == 200
    assert spy.called
    sent = spy.calls[0]["user"]
    # earliest turns must have been dropped; the very last few survive.
    assert "turn number 0 marker" not in sent
    assert "turn number 19 marker" in sent


def test_oversized_context_dropped_not_crashed(client, spy):
    # A huge decision blob exceeds the context cap -> context dropped, chat still works.
    big = {"asset": "SUI/USDC", "verdict": "BUY", "noise": "y" * 70_000}
    r = client.post("/api/chat",
                    json={"question": "Explain this decision",
                          "context": {"page": "dashboard", "decision": big}})
    assert r.status_code == 200
    assert r.json()["refused"] is False
    sent = spy.calls[0]["system"] + spy.calls[0]["user"]
    assert "y" * 100 not in sent  # the oversized blob never reached the model


# ===========================================================================
# (g) SSE endpoint emits delta(s) + exactly one done
# ===========================================================================
def test_sse_emits_deltas_and_one_done(client, spy):
    r = client.post("/api/chat",
                    json={"question": "What does Signal Strength mean?"},
                    headers={"Accept": "text/event-stream"})
    assert r.status_code == 200
    assert "text/event-stream" in r.headers["content-type"]
    events = _sse_events(r.text)
    deltas = [e for e in events if e[0] == "delta"]
    dones = [e for e in events if e[0] == "done"]
    assert len(deltas) >= 1
    assert len(dones) == 1
    assert events[-1][0] == "done"  # done is last
    # reassembled deltas == the answer
    joined = "".join(d[1]["text"] for d in deltas)
    assert joined == spy.reply
    assert dones[0][1]["refused"] is False
    assert isinstance(dones[0][1]["suggestions"], list)


def test_sse_refusal_one_delta_no_llm(client, spy):
    r = client.post("/api/chat",
                    json={"question": "Should I buy SUI right now?"},
                    headers={"Accept": "text/event-stream"})
    assert r.status_code == 200
    events = _sse_events(r.text)
    dones = [e for e in events if e[0] == "done"]
    assert len(dones) == 1
    assert dones[0][1]["refused"] is True
    assert not spy.called  # refusal streamed without a model call


# ===========================================================================
# graceful provider failure -> friendly answer, not a 5xx stack trace
# ===========================================================================
def test_llm_error_degrades_gracefully(client, monkeypatch):
    def boom(*a, **k):
        raise llm.LLMError("provider exploded")
    monkeypatch.setattr(llm, "chat_text", boom)
    r = client.post("/api/chat", json={"question": "What does Signal Strength mean?"})
    assert r.status_code == 200
    body = r.json()
    assert body["refused"] is False
    assert "trouble" in body["answer"].lower()
    assert "provider exploded" not in body["answer"]  # no leak


# ===========================================================================
# chat_text transport: shares dispatch, JSON-mode OFF, no parsing
# ===========================================================================
def test_chat_text_dispatches_text_mode(monkeypatch):
    seen = {}

    def fake_dispatch(system, user, role, timeout, json_mode=True):
        seen["json_mode"] = json_mode
        seen["role"] = role
        return "  free-form prose, not json  "

    monkeypatch.setattr(llm, "_dispatch", fake_dispatch)
    out = llm.chat_text("sys", "user", role="fast")
    assert out == "free-form prose, not json"  # stripped, returned verbatim
    assert seen["json_mode"] is False
    assert seen["role"] == "fast"


def test_chat_text_empty_raises(monkeypatch):
    monkeypatch.setattr(llm, "_dispatch", lambda *a, **k: "   ")
    with pytest.raises(llm.LLMError):
        llm.chat_text("sys", "user")
