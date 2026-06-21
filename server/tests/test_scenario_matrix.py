"""End-to-end scenario matrix: analyze() across realistic market regimes.

The agent debate is mocked PER REGIME (so the test controls "what the agents concluded")
and the market inputs are mocked PER REGIME — then we assert the *decision* the code
builds is sensible AND internally consistent. This is the "does the bull/bear → number →
verdict pipeline make sense across most scenarios" check. Pure + offline.
"""
import copy

import pytest

from conftest import make_debate
from glassbox import analyze as analyze_mod
from glassbox import agents, market

# A benign baseline (baselineVerdict would be BUY: trend>0, rsi<70, deep liquidity, no manip).
_BASE = {
    "priceUsd": 3.42, "trendPctVs20MA": 4.1, "rsi14": 38.0, "realizedVolPercentile": 0.2,
    "deepbookTopDepthUsd": 85000.0, "spreadBps": 12.0, "drawdownFromHighPct": -18.0,
    "asOfIso": "2026-01-01T00:00:00+00:00", "riskBand": "moderate", "horizonDays": 14,
    "goalCategory": "growth",
}
_CAPS = {"low": 5, "moderate": 15, "high": 30}


def _inputs(**over):
    d = copy.deepcopy(_BASE)
    d.update(over)
    return d


@pytest.fixture
def run_regime(monkeypatch):
    """Run analyze() with regime inputs + a regime debate injected (no network/LLM)."""
    def _run(inputs, debate, risk="moderate"):
        monkeypatch.setattr(market, "get_inputs",
                            lambda asset="SUI/USDC", risk_band="moderate", horizon_days=14,
                            goal_category="growth", freeze_ts=None: copy.deepcopy(inputs))
        monkeypatch.setattr(agents, "run_debate",
                            lambda asset, inp, goal, rb: copy.deepcopy(debate))
        return analyze_mod.analyze("a realistic goal", "SUI/USDC", risk)
    return _run


# --------------------------------------------------------------------------------------
# Global invariants — must hold in EVERY regime (parametrized over the whole matrix)
# --------------------------------------------------------------------------------------
_REGIMES = {
    "strong_buy":     (_inputs(trendPctVs20MA=8.0, rsi14=35.0, realizedVolPercentile=0.15),
                       make_debate(bull_conv=5, bear_conv=1, verdict="BUY")),
    "overbought_avoid": (_inputs(rsi14=78.0, trendPctVs20MA=2.0, realizedVolPercentile=0.4),
                         make_debate(bull_conv=1, bear_conv=5, verdict="AVOID")),
    "manipulated":    (_inputs(deepbookTopDepthUsd=10000.0, spreadBps=70.0),
                       make_debate(bull_conv=5, bear_conv=0, verdict="HOLD")),
    "choppy_standoff": (_inputs(realizedVolPercentile=0.5),
                        make_debate(bull_conv=3, bear_conv=3, verdict="HOLD")),
    "high_vol":       (_inputs(realizedVolPercentile=0.9),
                       make_debate(bull_conv=5, bear_conv=0, verdict="BUY")),
    "deep_drawdown":  (_inputs(drawdownFromHighPct=-35.0),
                       make_debate(bull_conv=4, bear_conv=1, verdict="HOLD")),
}


@pytest.mark.parametrize("name", list(_REGIMES))
def test_decision_invariants_hold_in_every_regime(run_regime, name):
    inputs, debate = _REGIMES[name]
    d = run_regime(inputs, debate, risk="moderate")
    # domain
    assert isinstance(d["signalStrengthPct"], int) and 0 <= d["signalStrengthPct"] <= 100
    assert isinstance(d["suggestedSizePct"], int) and 0 <= d["suggestedSizePct"] <= _CAPS["moderate"]
    assert d["verdict"] in ("BUY", "HOLD", "AVOID")
    assert d["signalBand"] in ("Low", "Medium", "High")
    # band agrees with the number
    s = d["signalStrengthPct"]
    assert d["signalBand"] == ("Low" if s < 33 else "Medium" if s < 66 else "High")
    # the mandatory blind spot is always disclosed
    assert "Does not include news, social sentiment, or events" in d["blindSpots"]


# --------------------------------------------------------------------------------------
# Per-regime sensibility — the specific thing each scenario should produce
# --------------------------------------------------------------------------------------
def test_strong_buy_is_decisive_and_buy(run_regime):
    inputs, debate = _REGIMES["strong_buy"]
    d = run_regime(inputs, debate)
    assert d["verdict"] == "BUY"
    assert d["flags"]["baselineVerdict"] == "BUY"          # trend>0, rsi<70, no manip
    assert d["flags"]["llmOverrodeSignals"] is False        # arbiter agrees with baseline
    assert d["signalStrengthPct"] >= 66 and d["signalBand"] == "High"  # big gap, low vol
    assert d["suggestedSizePct"] > 0


def test_overbought_forces_baseline_avoid(run_regime):
    inputs, debate = _REGIMES["overbought_avoid"]
    d = run_regime(inputs, debate)
    assert d["verdict"] == "AVOID"
    assert d["flags"]["baselineVerdict"] == "AVOID"         # rsi 78 > 70


def test_manipulation_zeroes_signal_and_forces_baseline_avoid(run_regime):
    inputs, debate = _REGIMES["manipulated"]
    d = run_regime(inputs, debate)
    # cross-field: manipulation forces BOTH the signal floor and the rule-based AVOID
    assert d["signalStrengthPct"] == 0 and d["signalBand"] == "Low"
    assert d["flags"]["baselineVerdict"] == "AVOID"


def test_standoff_gives_low_signal(run_regime):
    inputs, debate = _REGIMES["choppy_standoff"]
    d = run_regime(inputs, debate)
    # equal convictions (3 vs 3) -> the debate was not decisive -> low signal, by design
    assert d["signalStrengthPct"] == 0 and d["signalBand"] == "Low"


def test_high_vol_damps_signal_and_size_vs_calm(run_regime):
    """Same decisive debate (5 vs 0) is far less actionable in a high-vol market."""
    debate = make_debate(bull_conv=5, bear_conv=0, verdict="BUY")
    calm = run_regime(_inputs(realizedVolPercentile=0.1), debate)
    storm = run_regime(_inputs(realizedVolPercentile=0.9), debate)
    assert storm["signalStrengthPct"] < calm["signalStrengthPct"]
    assert storm["suggestedSizePct"] < calm["suggestedSizePct"]
    assert storm["suggestedSizePct"] <= 2   # cap·(1-0.9) ≈ 1-2


def test_deep_drawdown_forces_baseline_avoid(run_regime):
    inputs, debate = _REGIMES["deep_drawdown"]
    d = run_regime(inputs, debate)
    assert d["flags"]["baselineVerdict"] == "AVOID"         # drawdown -35 < -30


def test_arbiter_can_override_a_benign_baseline(run_regime):
    """Benign inputs (baseline BUY) but the arbiter resolves AVOID -> flagged as an override."""
    d = run_regime(_inputs(), make_debate(bull_conv=2, bear_conv=4, verdict="AVOID"))
    assert d["flags"]["baselineVerdict"] == "BUY" and d["verdict"] == "AVOID"
    assert d["flags"]["llmOverrodeSignals"] is True


def test_high_confidence_avoid_is_internally_consistent(run_regime):
    """A decisive BEAR (high signal) + AVOID is NOT a contradiction — pin that it coexists."""
    d = run_regime(_inputs(realizedVolPercentile=0.1),
                   make_debate(bull_conv=0, bear_conv=5, verdict="AVOID"))
    assert d["verdict"] == "AVOID"
    assert d["signalStrengthPct"] >= 66   # decisive that you should avoid
    # decisiveness is symmetric: a 0-vs-5 bear gap is as decisive as a 5-vs-0 bull gap
    bull = run_regime(_inputs(realizedVolPercentile=0.1),
                      make_debate(bull_conv=5, bear_conv=0, verdict="BUY"))
    assert d["signalStrengthPct"] == bull["signalStrengthPct"]


def test_risk_band_scales_size_same_regime(run_regime):
    """At one regime/vol, size strictly increases with the risk band."""
    inputs, debate = _REGIMES["strong_buy"]
    sizes = [run_regime(inputs, debate, risk=r)["suggestedSizePct"] for r in ("low", "moderate", "high")]
    assert sizes[0] < sizes[1] < sizes[2]
