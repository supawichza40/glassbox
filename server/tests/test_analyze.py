"""Orchestration wiring: analyze() = market inputs -> debate -> Decision.

These tests pin the seams analyze.py owns and nothing else: the chartCloses
pop (presentation-only, never hashed), the `if series:` branch, and the
asset/risk pass-through. The market feed and the LLM debate are stubbed at the
module boundary so only the wiring is under test.
"""
from conftest import make_debate

from glassbox import analyze


def _inputs(with_chart=True):
    """A frozen, get_inputs()-shaped snapshot; chartCloses optional."""
    inp = {
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
    if with_chart:
        inp["chartCloses"] = [1.0, 2.0, 3.0, 4.0]
    return inp


def _patch(monkeypatch, *, with_chart, debate=None):
    """Stub get_inputs + run_debate at the module boundary analyze() calls."""
    monkeypatch.setattr(analyze.market, "get_inputs",
                        lambda *a, **k: _inputs(with_chart=with_chart))
    monkeypatch.setattr(analyze.agents, "run_debate",
                        lambda *a, **k: (debate if debate is not None else make_debate()))


# ---------------------------------------------------------------------------
# 8. chartCloses is POPPED out of inputs and surfaced as chartSeries
# ---------------------------------------------------------------------------
def test_chart_closes_popped_to_chart_series(monkeypatch):
    series = [1.0, 2.0, 3.0, 4.0]
    _patch(monkeypatch, with_chart=True)
    d = analyze.analyze("Should I add SUI?", asset="SUI/USDC", risk_band="moderate")
    # presentation-only series must NOT remain inside the hashed inputs ...
    assert "chartCloses" not in d["inputs"]
    # ... it is lifted to a top-level chartSeries instead.
    assert d["chartSeries"] == series


# ---------------------------------------------------------------------------
# 9. No chartCloses -> no chartSeries (the false branch of `if series:`)
# ---------------------------------------------------------------------------
def test_no_chart_closes_means_no_chart_series(monkeypatch):
    _patch(monkeypatch, with_chart=False)
    d = analyze.analyze("Should I add SUI?", asset="SUI/USDC", risk_band="moderate")
    assert "chartCloses" not in d["inputs"]
    assert "chartSeries" not in d


# ---------------------------------------------------------------------------
# 10. Wiring: asset/risk pass through and a full Decision comes back
# ---------------------------------------------------------------------------
def test_analyze_passes_asset_and_risk_and_returns_full_decision(monkeypatch):
    seen = {}

    def fake_get_inputs(asset="SUI/USDC", risk_band="moderate", horizon_days=14,
                        goal_category="growth", *a, **k):
        seen["get_inputs"] = (asset, risk_band)
        return _inputs(with_chart=True)

    def fake_run_debate(asset, inputs, goal_text, risk_band, *a, **k):
        seen["run_debate"] = (asset, risk_band)
        return make_debate()

    monkeypatch.setattr(analyze.market, "get_inputs", fake_get_inputs)
    monkeypatch.setattr(analyze.agents, "run_debate", fake_run_debate)

    d = analyze.analyze("Should I size into SUI?", asset="ETH/USDC", risk_band="high")

    # asset + risk threaded through to BOTH the feed and the debate
    assert seen["get_inputs"] == ("ETH/USDC", "high")
    assert seen["run_debate"] == ("ETH/USDC", "high")

    # a full Decision is assembled
    assert d["asset"] == "ETH/USDC"
    for k in ("verdict", "signalStrengthPct", "suggestedSizePct", "signalBand"):
        assert k in d
    assert d["verdict"] in {"BUY", "HOLD", "AVOID"}
    assert 0 <= d["signalStrengthPct"] <= 100


def test_analyze_high_risk_allows_larger_size_than_low(monkeypatch):
    # Same inputs/debate, only risk_band differs: the cap (and thus size) is
    # higher for "high" than "low" -> proves risk_band actually drives sizing.
    def run(risk):
        _patch(monkeypatch, with_chart=False)
        return analyze.analyze("Size?", asset="SUI/USDC", risk_band=risk)["suggestedSizePct"]

    assert run("high") > run("low")
