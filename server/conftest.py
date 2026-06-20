"""Shared fixtures for the GlassBox test suite.

All tests are OFFLINE and DETERMINISTIC: no real Gemini / OpenRouter / Walrus
calls are ever made. LLM and network access are mocked at the boundary
(``glassbox.llm.chat_json`` / ``requests.put`` / ``requests.get``).

These fixtures only build canned data and monkeypatch in-process state; they do
not modify anything under ``glassbox/``.
"""
import copy

import pytest


# ---------------------------------------------------------------------------
# Canned market inputs — a frozen snapshot shaped like market.get_inputs(),
# benign enough that the baseline verdict is BUY (trend>0, rsi<70, no manip).
# ---------------------------------------------------------------------------
_BASE_INPUTS = {
    "priceUsd": 3.42,
    "trendPctVs20MA": 4.1,
    "rsi14": 38.0,
    "realizedVolPercentile": 0.2,
    "deepbookTopDepthUsd": 85000.0,
    "spreadBps": 12.0,
    "drawdownFromHighPct": -18.0,
    "asOfIso": "2026-01-01T00:00:00+00:00",
    "riskBand": "moderate",
    "horizonDays": 14,
    "goalCategory": "growth",
}


@pytest.fixture
def base_inputs():
    """A fresh, deep copy of the frozen inputs snapshot (safe to mutate)."""
    return copy.deepcopy(_BASE_INPUTS)


@pytest.fixture(autouse=True)
def _offline_market(monkeypatch):
    """Keep the suite offline + deterministic: market never hits CoinGecko.

    Forces the deterministic stub snapshot so analyze() runs the same everywhere
    (test_market patches the live path explicitly to exercise the real feed code).
    """
    from glassbox import market
    monkeypatch.setattr(market, "_snapshot", lambda asset="SUI/USDC": dict(market._STUB))


def make_debate(bull_conv=5, bear_conv=0, verdict="BUY",
                bull_points=None, bear_points=None,
                bull_revised=None, bear_revised=None, risk_note="A risk."):
    """Build a fully-formed debate dict the way agents.run_debate would.

    ``*_revised`` lets a test exercise the 'revised conviction beats opening'
    path; when None the opening conviction is reused.
    """
    bull_points = bull_points if bull_points is not None else ["Bull point one.", "Bull point two."]
    bear_points = bear_points if bear_points is not None else ["Bear point one.", "Bear point two."]
    bull_revised = bull_conv if bull_revised is None else bull_revised
    bear_revised = bear_conv if bear_revised is None else bear_revised
    return {
        "bull": {
            "opening": {"points": bull_points, "convictionScore": bull_conv},
            "rebuttal": {"rebuttal": "Bull rebuttal.", "revisedConviction": bull_revised},
        },
        "bear": {
            "opening": {"points": bear_points, "convictionScore": bear_conv},
            "rebuttal": {"rebuttal": "Bear rebuttal.", "revisedConviction": bear_revised},
        },
        "arbiter": {
            "winningSide": "bull",
            "whyResolved": "Inputs lean bullish.",
            "verdict": verdict,
            "riskNote": risk_note,
            "counterfactual": "I would change my call if trend turns negative.",
            "blindSpots": ["Does not include news, social sentiment, or events"],
        },
    }


@pytest.fixture
def debate():
    """A canned BUY debate (bull 5 vs bear 0)."""
    return make_debate()


@pytest.fixture
def canned_chat_json(monkeypatch):
    """Monkeypatch glassbox.llm.chat_json with a role-aware canned responder.

    Returns valid dicts for openings, rebuttals and the arbiter so that a full
    analyze() runs end-to-end without any network. The fast role (openings +
    rebuttals) and the smart role (arbiter) are distinguished by the user
    prompt text the agents send.
    """
    from glassbox import llm

    def fake(system, user, role="fast", timeout=60):
        if role == "smart":  # arbiter
            return {
                "winningSide": "bull",
                "whyResolved": "RSI 38.0 is oversold per INPUTS.",
                "verdict": "BUY",
                "riskNote": "Volatility percentile 0.2 is the main risk.",
                "counterfactual": "I would change my call if trend turns negative.",
                "blindSpots": ["Does not include news, social sentiment, or events"],
            }
        # fast role: opening vs rebuttal distinguished by the prompt
        if "rebuttal" in user.lower() or "revisedConviction" in user:
            side_is_bull = "BULL_CASE" in user  # bull rebuts seeing the Bear case
            # NOTE: rebuttal prompt embeds the *other* side's case label.
            if "BEAR_CASE" in user:  # this is the BULL analyst rebutting
                return {"rebuttal": "Bull rebuttal citing RSI 38.0.", "revisedConviction": 4}
            return {"rebuttal": "Bear rebuttal citing vol 0.2.", "revisedConviction": 1}
        # opening
        if "BUY" in user and "AVOID/SELL" not in user:
            return {"points": ["RSI 38.0 is oversold.", "Trend 4.1 is positive."],
                    "convictionScore": 5}
        return {"points": ["Volatility 0.2 still elevated.", "Drawdown -18.0 lingers."],
                "convictionScore": 1}

    monkeypatch.setattr(llm, "chat_json", fake)
    return fake


@pytest.fixture
def local_sink(monkeypatch):
    """Force the audit sink to 'local' so no Walrus call is ever attempted."""
    from glassbox import config
    monkeypatch.setattr(config, "AUDIT_SINK", "local")
    return "local"


@pytest.fixture
def client():
    """A FastAPI TestClient bound to the GlassBox app."""
    from fastapi.testclient import TestClient
    from glassbox.main import app
    return TestClient(app)
