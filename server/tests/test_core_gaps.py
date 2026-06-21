"""Gap-closers for the 4 mutations that survived the mutation-test red-team, plus a few
missing semantic scenarios. Each test here was designed to KILL a specific surviving
mutation (named in the test). Pure + offline.
"""
import copy

from conftest import make_debate
from glassbox import decision, market

_BASE = {
    "priceUsd": 3.42, "trendPctVs20MA": 4.1, "rsi14": 38.0, "realizedVolPercentile": 0.2,
    "deepbookTopDepthUsd": 85000.0, "spreadBps": 12.0, "drawdownFromHighPct": -18.0,
    "asOfIso": "2026-01-01T00:00:00+00:00", "riskBand": "moderate", "horizonDays": 14,
    "goalCategory": "growth",
}


def _inp(**over):
    d = copy.deepcopy(_BASE)
    d.update(over)
    return d


def _assemble(inputs, debate, risk="moderate"):
    return decision.assemble_decision("SUI/USDC", inputs, debate, risk)


# --- D10: kills `_baseline_verdict` `trend > 0` -> `trend >= 0` -------------------------
def test_baseline_zero_trend_is_hold_not_buy():
    # trend EXACTLY 0 with benign rsi/dd: not AVOID, and NOT BUY (needs trend>0) -> HOLD.
    # A `trend >= 0` mutant would wrongly return BUY.
    assert decision._baseline_verdict(
        {"rsi14": 40, "trendPctVs20MA": 0.0, "drawdownFromHighPct": -10}, 0) == "HOLD"


# --- D12: kills size `round(...)` -> `int(...)` (size had no rounding test) --------------
def test_suggested_size_rounds_not_truncates():
    # moderate cap 15, v=0.55 -> 15*0.45 = 6.75 -> round=7 (truncation would give 6).
    assert _assemble(_inp(realizedVolPercentile=0.55), make_debate())["suggestedSizePct"] == 7


# --- M2: kills `_rsi` `len <= period` -> `len < period` ---------------------------------
def test_rsi_at_exactly_period_length_is_neutral_50():
    # Exactly `period` closes is still insufficient (need period+1 for `period` deltas) ->
    # neutral 50.0. A `< period` mutant computes a bogus 100.0 on this rising series.
    assert market._rsi([float(i) for i in range(14)], 14) == 50.0


# --- M3: kills the vol-window off-by-one `rets[-win:]` -> `rets[-win-1:-1]` --------------
class _Resp:
    def __init__(self, payload):
        self._p = payload

    def raise_for_status(self):
        pass

    def json(self):
        return self._p


def test_vol_percentile_uses_the_most_recent_window(monkeypatch):
    # Flat closes then a single final jump: ONLY the most-recent return is volatile, so the
    # last 14-window is uniquely the highest -> percentile 1.0. A window shifted back by one
    # (the mutation) would exclude the jump -> vol_now 0 -> percentile < 1.0.
    closes = [100.0] * 30 + [110.0]                 # 31 closes; one 10% jump at the very end
    prices = [[i, c] for i, c in enumerate(closes)] + [[99, 999.0]]  # +1 partial (dropped)
    monkeypatch.setattr(market.requests, "get", lambda *a, **k: _Resp({"prices": prices}))
    snap = market._live_snapshot("SUI/USDC")
    assert snap["realizedVolPercentile"] == 1.0


# --- missing semantic scenarios (from the red-team's list) ------------------------------
def test_manipulated_standoff_stays_zero_and_avoid():
    # m=1 AND a conviction standoff (5 vs 5): both forces independently drive signal to 0,
    # and manipulation forces the rule-based AVOID. Previously m=1 was only tested with a
    # decisive gap.
    d = _assemble(_inp(deepbookTopDepthUsd=10000.0), make_debate(bull_conv=5, bear_conv=5, verdict="HOLD"))
    assert d["signalStrengthPct"] == 0 and d["flags"]["baselineVerdict"] == "AVOID"


def test_grounding_flags_a_fabricated_number_in_the_arbiter_risknote():
    # _grounding_warnings scans the arbiter riskNote too — a bogus figure the ARBITER
    # invents (not just the bull/bear points) must be flagged.
    d = _assemble(_BASE, make_debate(risk_note="Price could plausibly reach 888 soon."))
    assert "888" in d["flags"]["groundingWarnings"]


def test_decisive_debate_resolved_to_hold_is_consistent():
    # A decisive debate (big gap, low vol -> high signal) that the arbiter resolves to HOLD
    # is a legitimate "decisive, but stay put" state — high signal + HOLD must coexist.
    d = _assemble(_inp(realizedVolPercentile=0.1), make_debate(bull_conv=5, bear_conv=0, verdict="HOLD"))
    assert d["verdict"] == "HOLD"
    assert d["signalStrengthPct"] >= 66 and d["signalBand"] == "High"


# --- defaulted-inputs flag (fix 4): silently-defaulted gameable inputs are surfaced ------
def test_missing_gameable_inputs_are_flagged_as_defaulted():
    inp = _inp()
    del inp["realizedVolPercentile"]    # silently defaults to 0.5 inside assemble_decision
    del inp["deepbookTopDepthUsd"]      # silently defaults to 1e12 ("no manipulation")
    flagged = _assemble(inp, make_debate())["flags"]["defaultedInputs"]
    assert "realizedVolPercentile" in flagged and "deepbookTopDepthUsd" in flagged
    assert "spreadBps" not in flagged   # this one WAS supplied


def test_no_defaulted_flag_when_all_inputs_present():
    assert _assemble(_inp(), make_debate())["flags"]["defaultedInputs"] == []
