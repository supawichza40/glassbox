"""Unit tests for glassbox.decision — pure deterministic post-processing.

No mocks needed: assemble_decision() is a pure function of (inputs, debate).
"""
import copy

from conftest import make_debate
from glassbox import decision


def _assemble(inputs, debate, risk="moderate"):
    return decision.assemble_decision("SUI/USDC", inputs, debate, risk)


# --------------------------------------------------------------------------
# signalStrengthPct monotonicity in realizedVolPercentile
# --------------------------------------------------------------------------
def test_signal_strength_monotone_non_increasing_in_vol(base_inputs):
    """Two inputs differing ONLY in v: higher v must give <= signal."""
    deb = make_debate(bull_conv=5, bear_conv=0)
    lo = copy.deepcopy(base_inputs); lo["realizedVolPercentile"] = 0.1
    hi = copy.deepcopy(base_inputs); hi["realizedVolPercentile"] = 0.9
    sig_lo = _assemble(lo, deb)["signalStrengthPct"]
    sig_hi = _assemble(hi, deb)["signalStrengthPct"]
    assert sig_hi <= sig_lo


def test_signal_strength_monotone_across_vol_sweep(base_inputs):
    """Sweep v upward; signal must never increase step-to-step."""
    deb = make_debate(bull_conv=5, bear_conv=0)
    prev = None
    for v in [0.0, 0.2, 0.4, 0.6, 0.8, 1.0]:
        inp = copy.deepcopy(base_inputs); inp["realizedVolPercentile"] = v
        sig = _assemble(inp, deb)["signalStrengthPct"]
        if prev is not None:
            assert sig <= prev, f"signal rose at v={v}"
        prev = sig


def test_signal_strength_formula(base_inputs):
    """signal = round(100*a*(1-v)*(1-m)); a=|5-0|/5=1, v=0.2, m=0 -> 80."""
    deb = make_debate(bull_conv=5, bear_conv=0)
    inp = copy.deepcopy(base_inputs); inp["realizedVolPercentile"] = 0.2
    assert _assemble(inp, deb)["signalStrengthPct"] == 80


# --------------------------------------------------------------------------
# suggestedSizePct strictly falls as v rises
# --------------------------------------------------------------------------
def test_suggested_size_strictly_falls_as_vol_rises(base_inputs):
    deb = make_debate()
    sizes = []
    for v in [0.0, 0.3, 0.6, 0.9]:
        inp = copy.deepcopy(base_inputs); inp["realizedVolPercentile"] = v
        sizes.append(_assemble(inp, deb, risk="high")["suggestedSizePct"])
    # cap(high)=30: 30, 21, 12, 3 — strictly decreasing
    assert sizes == sorted(sizes, reverse=True)
    assert all(b < a for a, b in zip(sizes, sizes[1:]))


def test_suggested_size_respects_cap_and_floor(base_inputs):
    deb = make_debate()
    inp = copy.deepcopy(base_inputs); inp["realizedVolPercentile"] = 0.0
    # cap(low)=5 -> 5 ; cap(moderate)=15 -> 15 ; cap(high)=30 -> 30
    assert _assemble(inp, deb, risk="low")["suggestedSizePct"] == 5
    assert _assemble(inp, deb, risk="moderate")["suggestedSizePct"] == 15
    assert _assemble(inp, deb, risk="high")["suggestedSizePct"] == 30
    inp_max = copy.deepcopy(base_inputs); inp_max["realizedVolPercentile"] = 1.0
    assert _assemble(inp_max, deb, risk="high")["suggestedSizePct"] == 0  # floored at 0


# --------------------------------------------------------------------------
# manipulation flag forces signal 0
# --------------------------------------------------------------------------
def test_manipulation_thin_depth_forces_signal_zero(base_inputs):
    deb = make_debate(bull_conv=5, bear_conv=0)
    inp = copy.deepcopy(base_inputs)
    inp["deepbookTopDepthUsd"] = 10000.0  # < 20000
    assert _assemble(inp, deb)["signalStrengthPct"] == 0


def test_manipulation_wide_spread_forces_signal_zero(base_inputs):
    deb = make_debate(bull_conv=5, bear_conv=0)
    inp = copy.deepcopy(base_inputs)
    inp["spreadBps"] = 75.0  # > 50
    assert _assemble(inp, deb)["signalStrengthPct"] == 0


def test_manipulation_boundary_not_triggered(base_inputs):
    """Exactly 20000 depth and 50 bps spread are NOT manipulation (strict <,>)."""
    deb = make_debate(bull_conv=5, bear_conv=0)
    inp = copy.deepcopy(base_inputs)
    inp["deepbookTopDepthUsd"] = 20000.0
    inp["spreadBps"] = 50.0
    inp["realizedVolPercentile"] = 0.2
    assert _assemble(inp, deb)["signalStrengthPct"] == 80  # not zeroed


# --------------------------------------------------------------------------
# band thresholds: Low <33 <= Medium <66 <= High
# --------------------------------------------------------------------------
def test_band_low(base_inputs):
    # a small -> low signal. bull 1 vs bear 0 -> a=0.2; v=0.2 -> round(100*0.2*0.8)=16 -> Low
    deb = make_debate(bull_conv=1, bear_conv=0)
    inp = copy.deepcopy(base_inputs); inp["realizedVolPercentile"] = 0.2
    res = _assemble(inp, deb)
    assert res["signalStrengthPct"] < 33
    assert res["signalBand"] == "Low"


def test_band_medium(base_inputs):
    # bull 3 vs bear 0 -> a=0.6; v=0.2 -> round(100*0.6*0.8)=48 -> Medium
    deb = make_debate(bull_conv=3, bear_conv=0)
    inp = copy.deepcopy(base_inputs); inp["realizedVolPercentile"] = 0.2
    res = _assemble(inp, deb)
    assert 33 <= res["signalStrengthPct"] < 66
    assert res["signalBand"] == "Medium"


def test_band_high(base_inputs):
    # bull 5 vs bear 0 -> a=1; v=0.2 -> 80 -> High
    deb = make_debate(bull_conv=5, bear_conv=0)
    inp = copy.deepcopy(base_inputs); inp["realizedVolPercentile"] = 0.2
    res = _assemble(inp, deb)
    assert res["signalStrengthPct"] >= 66
    assert res["signalBand"] == "High"


# --------------------------------------------------------------------------
# baseline verdict rules
# --------------------------------------------------------------------------
def test_baseline_buy():
    assert decision._baseline_verdict(
        {"rsi14": 38, "trendPctVs20MA": 4, "drawdownFromHighPct": -18}, 0) == "BUY"


def test_baseline_avoid_on_high_rsi():
    assert decision._baseline_verdict(
        {"rsi14": 75, "trendPctVs20MA": 4, "drawdownFromHighPct": -18}, 0) == "AVOID"


def test_baseline_avoid_on_deep_drawdown():
    assert decision._baseline_verdict(
        {"rsi14": 38, "trendPctVs20MA": 4, "drawdownFromHighPct": -35}, 0) == "AVOID"


def test_baseline_avoid_on_manipulation():
    assert decision._baseline_verdict(
        {"rsi14": 38, "trendPctVs20MA": 4, "drawdownFromHighPct": -18}, 1) == "AVOID"


def test_baseline_hold_when_trend_not_positive():
    assert decision._baseline_verdict(
        {"rsi14": 38, "trendPctVs20MA": -4, "drawdownFromHighPct": -18}, 0) == "HOLD"


# --------------------------------------------------------------------------
# llmOverrodeSignals fires ONLY on a 2-level gap (BUY<->AVOID)
# --------------------------------------------------------------------------
def test_llm_override_fires_on_two_level_gap(base_inputs):
    """Baseline BUY (benign inputs) but arbiter says AVOID -> 2-level gap -> True."""
    deb = make_debate(verdict="AVOID")
    res = _assemble(base_inputs, deb)
    assert res["flags"]["baselineVerdict"] == "BUY"
    assert res["flags"]["llmOverrodeSignals"] is True


def test_llm_override_quiet_on_one_level_gap(base_inputs):
    deb = make_debate(verdict="HOLD")  # baseline BUY vs HOLD -> 1-level gap
    res = _assemble(base_inputs, deb)
    assert res["flags"]["llmOverrodeSignals"] is False


def test_llm_override_quiet_on_agreement(base_inputs):
    deb = make_debate(verdict="BUY")  # baseline BUY, arbiter BUY -> 0 gap
    res = _assemble(base_inputs, deb)
    assert res["flags"]["llmOverrodeSignals"] is False


# --------------------------------------------------------------------------
# groundingWarnings: flag a fabricated number, pass a real input number
# --------------------------------------------------------------------------
def test_grounding_flags_fabricated_passes_real(base_inputs):
    """Bull cites real rsi 38.0 (from inputs) and a fabricated 999 (not in inputs)."""
    deb = make_debate(
        bull_points=["RSI 38.0 is oversold.", "Price target of 999 is reachable."],
        bear_points=["No fabricated figures here."],
    )
    warns = _assemble(base_inputs, deb)["flags"]["groundingWarnings"]
    assert "999" in warns        # fabricated number flagged
    assert "38" not in warns     # real input number passes
    assert "38.0" not in warns


def test_grounding_empty_when_all_real(base_inputs):
    deb = make_debate(
        bull_points=["RSI 38.0 oversold.", "Trend 4.1 positive."],
        bear_points=["Drawdown -18.0 lingers."],
        risk_note="Vol percentile 0.2 is the risk.",
    )
    warns = _assemble(base_inputs, deb)["flags"]["groundingWarnings"]
    assert warns == []


# --------------------------------------------------------------------------
# revised conviction (rebuttal) is used over opening
# --------------------------------------------------------------------------
def test_revised_conviction_used_over_opening(base_inputs):
    """Bull opening conviction 5 but rebuttal revises down to 1 -> 1.0 is used."""
    deb = make_debate(bull_conv=5, bear_conv=0, bull_revised=1)
    res = _assemble(base_inputs, deb)
    assert res["bull"]["convictionRevised"] == 1.0


def test_falls_back_to_opening_when_no_revised(base_inputs):
    """When rebuttal lacks revisedConviction, opening convictionScore is used."""
    deb = make_debate(bull_conv=4, bear_conv=0)
    # strip revisedConviction from the bull rebuttal
    deb["bull"]["rebuttal"].pop("revisedConviction")
    res = _assemble(base_inputs, deb)
    assert res["bull"]["convictionRevised"] == 4.0


def test_out_of_range_conviction_is_clamped(base_inputs):
    """The LLM sometimes returns conviction > 5; signal must stay a real 0-100%."""
    deb = make_debate(bull_conv=5, bear_conv=0, bull_revised=7, bear_revised=0)
    res = _assemble(base_inputs, deb)
    assert res["bull"]["convictionRevised"] == 5.0          # clamped from 7
    assert 0 <= res["signalStrengthPct"] <= 100
