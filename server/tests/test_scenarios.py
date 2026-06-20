"""Integration scenarios — a gallery of realistic user queries through /api/analyze.

This is an INTEGRATION test (full HTTP request -> relevance gate -> debate -> Decision),
kept OFFLINE + deterministic via the mocked LLM. It asserts the *contract* for each kind
of query a user can ask. To watch the REAL outputs (live LLM + live SUI feed), run the
companion gallery:  .venv/bin/python -m glassbox.usecases
"""
import pytest

# Realistic investing questions across risk bands and framings (buy / hold / avoid / sell).
VALID_QUERIES = [
    ("Should I hold SUI for the next 2 weeks?", "moderate"),
    ("Is now a good time to buy SUI? I can take more risk.", "high"),
    ("I'm risk-averse — should I avoid SUI right now?", "low"),
    ("Should I take some profit on my SUI position?", "moderate"),
    ("What's the outlook for SUI over the next month?", "high"),
]

# Off-topic input that the cheap heuristic catches WITHOUT an LLM call (keeps this offline).
# LLM-gated off-topic ("what's the weather") is exercised in the live gallery instead.
OFFTOPIC_QUERIES = ["Hello", "hello there", "hi there", "thanks", "?????", "12345"]


@pytest.mark.parametrize("goal,risk", VALID_QUERIES)
def test_valid_query_returns_a_grounded_decision(client, canned_chat_json, goal, risk):
    r = client.post("/api/analyze", json={"goalText": goal, "risk": risk})
    assert r.status_code == 200, goal
    d = r.json()
    assert d["verdict"] in ("BUY", "HOLD", "AVOID")
    assert d["signalBand"] in ("Low", "Medium", "High")
    assert 0 <= d["signalStrengthPct"] <= 100
    assert d["suggestedSizePct"] >= 0
    # a real debate came back (both sides argued, with at least one cited point each)
    assert len(d["bull"]["points"]) >= 1
    assert len(d["bear"]["points"]) >= 1
    # size respects the risk-band cap
    cap = {"low": 5, "moderate": 15, "high": 30}[risk]
    assert d["suggestedSizePct"] <= cap


@pytest.mark.parametrize("goal", OFFTOPIC_QUERIES)
def test_offtopic_query_is_redirected_not_answered(client, goal):
    r = client.post("/api/analyze", json={"goalText": goal})
    assert r.status_code == 422, goal
    body = r.json()
    assert body.get("outOfScope") is True
    assert "verdict" not in body          # never a fabricated call


def test_too_short_query_is_a_validation_error(client):
    r = client.post("/api/analyze", json={"goalText": "hi"})
    assert r.status_code == 422           # pydantic min_length, before the gate


def test_risk_band_scales_position_size(client, canned_chat_json):
    """Same question, more risk -> a larger (never smaller) suggested size."""
    size = {}
    for risk in ("low", "moderate", "high"):
        d = client.post("/api/analyze",
                        json={"goalText": "Should I buy SUI now?", "risk": risk}).json()
        size[risk] = d["suggestedSizePct"]
    assert size["low"] <= size["moderate"] <= size["high"]


def test_same_question_is_consistent(client, canned_chat_json):
    """Determinism: the same query twice yields the same verdict (auditable behaviour)."""
    payload = {"goalText": "Should I hold SUI for two weeks?", "risk": "moderate"}
    v1 = client.post("/api/analyze", json=payload).json()["verdict"]
    v2 = client.post("/api/analyze", json=payload).json()["verdict"]
    assert v1 == v2
