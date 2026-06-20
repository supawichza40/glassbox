"""The relevance gate: off-topic input gets a friendly redirect, not a fabricated verdict."""
from glassbox import guard


def test_greetings_are_offtopic():
    for g in ("Hello", "hello", "hey", "test", "ok", "thanks", "hi there"):
        assert guard.relevance_gate(g) is not None, g


def test_no_letters_is_offtopic():
    assert guard.relevance_gate("?!?!?") is not None
    assert guard.relevance_gate("12345") is not None


def test_investing_question_passes(monkeypatch):
    monkeypatch.setattr(guard.llm, "chat_json", lambda *a, **k: {"relevant": True})
    assert guard.relevance_gate("Should I buy SUI given the recent trend?") is None


def test_llm_flags_offtopic(monkeypatch):
    monkeypatch.setattr(guard.llm, "chat_json", lambda *a, **k: {"relevant": False})
    assert guard.relevance_gate("Write me a poem about cats please") is not None


def test_classifier_error_fails_open(monkeypatch):
    def boom(*a, **k):
        raise RuntimeError("provider down")
    monkeypatch.setattr(guard.llm, "chat_json", boom)
    # not obviously off-topic + classifier down -> never block a real question
    assert guard.relevance_gate("Is now a good time to increase my SUI exposure?") is None


def test_endpoint_rejects_greeting(client):
    # heuristic catches the greeting before any LLM call -> 422 outOfScope, no verdict
    r = client.post("/api/analyze", json={"goalText": "Hello"})
    assert r.status_code == 422
    body = r.json()
    assert body["outOfScope"] is True
    assert "verdict" not in body
