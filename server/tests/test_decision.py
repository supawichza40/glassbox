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
    lo = copy.deepcopy(base_inputs)
    lo["realizedVolPercentile"] = 0.1
    hi = copy.deepcopy(base_inputs)
    hi["realizedVolPercentile"] = 0.9
    sig_lo = _assemble(lo, deb)["signalStrengthPct"]
    sig_hi = _assemble(hi, deb)["signalStrengthPct"]
    assert sig_hi <= sig_lo


def test_signal_strength_monotone_across_vol_sweep(base_inputs):
    """Sweep v upward; signal must never increase step-to-step."""
    deb = make_debate(bull_conv=5, bear_conv=0)
    prev = None
    for v in [0.0, 0.2, 0.4, 0.6, 0.8, 1.0]:
        inp = copy.deepcopy(base_inputs)
        inp["realizedVolPercentile"] = v
        sig = _assemble(inp, deb)["signalStrengthPct"]
        if prev is not None:
            assert sig <= prev, f"signal rose at v={v}"
        prev = sig


def test_signal_strength_formula(base_inputs):
    """signal = round(100*a*(1-v)*(1-m)); a=|5-0|/5=1, v=0.2, m=0 -> 80."""
    deb = make_debate(bull_conv=5, bear_conv=0)
    inp = copy.deepcopy(base_inputs)
    inp["realizedVolPercentile"] = 0.2
    assert _assemble(inp, deb)["signalStrengthPct"] == 80


# --------------------------------------------------------------------------
# suggestedSizePct strictly falls as v rises
# --------------------------------------------------------------------------
def test_suggested_size_strictly_falls_as_vol_rises(base_inputs):
    deb = make_debate()
    sizes = []
    for v in [0.0, 0.3, 0.6, 0.9]:
        inp = copy.deepcopy(base_inputs)
        inp["realizedVolPercentile"] = v
        sizes.append(_assemble(inp, deb, risk="high")["suggestedSizePct"])
    # cap(high)=30: 30, 21, 12, 3 — strictly decreasing
    assert sizes == sorted(sizes, reverse=True)
    assert all(b < a for a, b in zip(sizes, sizes[1:]))


def test_suggested_size_respects_cap_and_floor(base_inputs):
    deb = make_debate()
    inp = copy.deepcopy(base_inputs)
    inp["realizedVolPercentile"] = 0.0
    # cap(low)=5 -> 5 ; cap(moderate)=15 -> 15 ; cap(high)=30 -> 30
    assert _assemble(inp, deb, risk="low")["suggestedSizePct"] == 5
    assert _assemble(inp, deb, risk="moderate")["suggestedSizePct"] == 15
    assert _assemble(inp, deb, risk="high")["suggestedSizePct"] == 30
    inp_max = copy.deepcopy(base_inputs)
    inp_max["realizedVolPercentile"] = 1.0
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
    inp = copy.deepcopy(base_inputs)
    inp["realizedVolPercentile"] = 0.2
    res = _assemble(inp, deb)
    assert res["signalStrengthPct"] < 33
    assert res["signalBand"] == "Low"


def test_band_medium(base_inputs):
    # bull 3 vs bear 0 -> a=0.6; v=0.2 -> round(100*0.6*0.8)=48 -> Medium
    deb = make_debate(bull_conv=3, bear_conv=0)
    inp = copy.deepcopy(base_inputs)
    inp["realizedVolPercentile"] = 0.2
    res = _assemble(inp, deb)
    assert 33 <= res["signalStrengthPct"] < 66
    assert res["signalBand"] == "Medium"


def test_band_high(base_inputs):
    # bull 5 vs bear 0 -> a=1; v=0.2 -> 80 -> High
    deb = make_debate(bull_conv=5, bear_conv=0)
    inp = copy.deepcopy(base_inputs)
    inp["realizedVolPercentile"] = 0.2
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


# ==========================================================================
# QUANT INVARIANTS — confidence == conviction-gap (the "decisiveness=gap"
# design choice), exact band boundaries, domain safety, conviction flow,
# verdict coercion, and cross-field consistency. Appended per quant review.
# ==========================================================================


# --------------------------------------------------------------------------
# Confidence is the conviction GAP, not its level.
# signal = clamp(round(100 * a * (1-v) * (1-m)), 0, 100), a = |bc-rc| / 5
# --------------------------------------------------------------------------
def test_equal_high_convictions_give_zero_signal(base_inputs):
    """Standoff: bull 5 == bear 5 -> gap 0 -> signal 0 (decisiveness IS the gap)."""
    deb = make_debate(bull_conv=5, bear_conv=5)
    inp = copy.deepcopy(base_inputs)
    inp["realizedVolPercentile"] = 0.2
    assert _assemble(inp, deb)["signalStrengthPct"] == 0


def test_equal_zero_convictions_give_zero_signal(base_inputs):
    """Apathetic debate: bull 0 == bear 0 -> gap 0 -> signal 0.

    Pins the design choice that a high-conviction standoff and an apathetic
    debate are BOTH 0 — confidence measures disagreement, not enthusiasm.
    """
    deb = make_debate(bull_conv=0, bear_conv=0)
    inp = copy.deepcopy(base_inputs)
    inp["realizedVolPercentile"] = 0.2
    assert _assemble(inp, deb)["signalStrengthPct"] == 0


def test_signal_symmetric_under_side_swap(base_inputs):
    """|bull-bear| is symmetric: (5,0) and (0,5) must give the same signal."""
    inp = copy.deepcopy(base_inputs)
    inp["realizedVolPercentile"] = 0.2
    bull_wins = _assemble(inp, make_debate(bull_conv=5, bear_conv=0))["signalStrengthPct"]
    bear_wins = _assemble(inp, make_debate(bull_conv=0, bear_conv=5))["signalStrengthPct"]
    assert bull_wins == bear_wins == 80


def test_signal_monotone_non_decreasing_in_conviction_gap(base_inputs):
    """At fixed v, m: widening the conviction gap must not LOWER the signal.

    gap a = 0.2, 0.6, 1.0 (bull 1/3/5 vs bear 0) -> signal non-decreasing.
    The vol axis is tested above
    this pins the formula's positive direction.
    """
    inp = copy.deepcopy(base_inputs)
    inp["realizedVolPercentile"] = 0.2
    prev = None
    for bc in [1, 3, 5]:
        sig = _assemble(inp, make_debate(bull_conv=bc, bear_conv=0))["signalStrengthPct"]
        if prev is not None:
            assert sig >= prev, f"signal fell as gap widened (bull={bc})"
        prev = sig


def test_maximal_gap_zero_vol_gives_full_signal(base_inputs):
    """(5,0) at v=0, m=0 -> a=1 -> signal exactly 100 (the ceiling is reachable)."""
    deb = make_debate(bull_conv=5, bear_conv=0)
    inp = copy.deepcopy(base_inputs)
    inp["realizedVolPercentile"] = 0.0
    assert _assemble(inp, deb)["signalStrengthPct"] == 100


# --------------------------------------------------------------------------
# Band boundaries — EXACT edges (existing band tests only check ranges).
# Band: Low < 33 <= Medium < 66 <= High.
# --------------------------------------------------------------------------
def test_band_edge_raw_32_is_low(base_inputs):
    """bull 2 vs bear 0 (a=0.4) at v=0.2 -> raw 32 -> 32 < 33 -> Low."""
    deb = make_debate(bull_conv=2, bear_conv=0)
    inp = copy.deepcopy(base_inputs)
    inp["realizedVolPercentile"] = 0.2
    res = _assemble(inp, deb)
    assert res["signalStrengthPct"] == 32
    assert res["signalBand"] == "Low"


def test_band_edge_raw_33_is_medium(base_inputs):
    """bull 3 vs bear 0 (a=0.6) at v=0.45 -> raw 33 -> 33 == lower Medium edge."""
    deb = make_debate(bull_conv=3, bear_conv=0)
    inp = copy.deepcopy(base_inputs)
    inp["realizedVolPercentile"] = 0.45
    res = _assemble(inp, deb)
    assert res["signalStrengthPct"] == 33
    assert res["signalBand"] == "Medium"


def test_band_edge_raw_65_is_medium(base_inputs):
    """bull 5 vs bear 0 (a=1) at v=0.35 -> raw 65 -> 65 < 66 -> still Medium."""
    deb = make_debate(bull_conv=5, bear_conv=0)
    inp = copy.deepcopy(base_inputs)
    inp["realizedVolPercentile"] = 0.35
    res = _assemble(inp, deb)
    assert res["signalStrengthPct"] == 65
    assert res["signalBand"] == "Medium"


def test_band_edge_raw_66_is_high(base_inputs):
    """bull 5 vs bear 0 (a=1) at v=0.34 -> raw 66 -> 66 == lower High edge."""
    deb = make_debate(bull_conv=5, bear_conv=0)
    inp = copy.deepcopy(base_inputs)
    inp["realizedVolPercentile"] = 0.34
    res = _assemble(inp, deb)
    assert res["signalStrengthPct"] == 66
    assert res["signalBand"] == "High"


def test_bankers_rounding_half_down_keeps_raw_32p5_in_low(base_inputs):
    """Banker's rounding: raw exactly 32.5 -> round() -> 32 (NOT 33) -> Low.

    revised 3.25 vs 0 (a=0.65) at v=0.5 -> raw = 100*0.65*0.5 = 32.5.
    _revised returns a float and v is a float, so 32.5 is genuinely reachable.
    Locks current round-half-to-even behavior so a round-half-up refactor
    can't silently push this case up into Medium.
    """
    deb = make_debate(bull_conv=5, bear_conv=0, bull_revised=3.25, bear_revised=0)
    inp = copy.deepcopy(base_inputs)
    inp["realizedVolPercentile"] = 0.5
    res = _assemble(inp, deb)
    assert res["signalStrengthPct"] == 32   # 32.5 rounds to even -> 32, not 33
    assert res["signalBand"] == "Low"


def test_bankers_rounding_half_up_pushes_raw_65p5_to_high(base_inputs):
    """Banker's rounding: raw exactly 65.5 -> round() -> 66 (to even) -> High.

    revised 5 vs 0 (a=1) at v=0.345 -> raw = 100*1*0.655 = 65.5 -> rounds to 66.
    Companion to the 32.5 case: here round-half-to-even goes UP. Locks the
    actual boundary behavior on both sides of the tie.
    """
    deb = make_debate(bull_conv=5, bear_conv=0)
    inp = copy.deepcopy(base_inputs)
    inp["realizedVolPercentile"] = 0.345
    res = _assemble(inp, deb)
    assert res["signalStrengthPct"] == 66   # 65.5 rounds to even -> 66
    assert res["signalBand"] == "High"


# --------------------------------------------------------------------------
# Domain safety — outer clamps / floors are load-bearing for junk inputs.
# --------------------------------------------------------------------------
def test_signal_clamped_in_unit_range_for_out_of_range_vol(base_inputs):
    """v=-0.5 (raw 150) and v=1.5 (raw -50) must both clamp into [0,100]."""
    deb = make_debate(bull_conv=5, bear_conv=0)
    lo = copy.deepcopy(base_inputs)
    lo["realizedVolPercentile"] = -0.5
    hi = copy.deepcopy(base_inputs)
    hi["realizedVolPercentile"] = 1.5
    assert _assemble(lo, deb)["signalStrengthPct"] == 100   # 150 clamped down
    assert _assemble(hi, deb)["signalStrengthPct"] == 0     # -50 clamped up


def test_signal_in_unit_range_for_out_of_range_conviction(base_inputs):
    """Garbage conviction 99 is clamped by _revised; signal stays in [0,100]."""
    deb = make_debate(bull_conv=99, bear_conv=0)
    deb["bull"]["rebuttal"].pop("revisedConviction")  # force opening 99 through
    res = _assemble(base_inputs, deb)
    assert res["bull"]["convictionRevised"] == 5.0
    assert 0 <= res["signalStrengthPct"] <= 100


def test_size_non_negative_for_out_of_range_vol(base_inputs):
    """The size FLOOR (max(0, ...)) is load-bearing: v=1.5 -> size 0, not negative.

    NOTE: there is NO upper clamp on size — see
    test_size_has_no_upper_clamp_at_negative_vol_CURRENT_BEHAVIOR, which
    documents that v<0 can push size ABOVE cap. Here we only pin the floor.
    """
    deb = make_debate()
    hi = copy.deepcopy(base_inputs)
    hi["realizedVolPercentile"] = 1.5
    assert _assemble(hi, deb, risk="high")["suggestedSizePct"] == 0


def test_size_strictly_ordered_by_band_at_intermediate_vol(base_inputs):
    """At v=0.5: size(low) < size(moderate) < size(high), each an int >= 0."""
    deb = make_debate()
    inp = copy.deepcopy(base_inputs)
    inp["realizedVolPercentile"] = 0.5
    s_low = _assemble(inp, deb, risk="low")["suggestedSizePct"]
    s_mod = _assemble(inp, deb, risk="moderate")["suggestedSizePct"]
    s_high = _assemble(inp, deb, risk="high")["suggestedSizePct"]
    assert s_low < s_mod < s_high
    for s in (s_low, s_mod, s_high):
        assert isinstance(s, int) and s >= 0


def test_unknown_risk_band_defaults_cap_to_moderate(base_inputs):
    """An unknown risk_band ('aggressive') falls back to the moderate cap 15."""
    deb = make_debate()
    inp = copy.deepcopy(base_inputs)
    inp["realizedVolPercentile"] = 0.0
    assert _assemble(inp, deb, risk="aggressive")["suggestedSizePct"] == 15


# --------------------------------------------------------------------------
# Conviction flow — _revised robustness against malformed debate dicts.
# --------------------------------------------------------------------------
def test_revised_missing_opening_and_rebuttal_is_zero():
    """A side with neither opening nor rebuttal -> 0.0, no KeyError/crash."""
    assert decision._revised({}) == 0.0


def test_revised_non_numeric_falls_back_to_opening():
    """A string/None revisedConviction is ignored; opening convictionScore wins."""
    assert decision._revised(
        {"opening": {"convictionScore": 4}, "rebuttal": {"revisedConviction": "high"}}) == 4.0
    assert decision._revised(
        {"opening": {"convictionScore": 3}, "rebuttal": {"revisedConviction": None}}) == 3.0


def test_revised_negative_conviction_clamped_to_zero():
    """A negative revisedConviction is clamped up to the 0.0 floor."""
    assert decision._revised(
        {"opening": {"convictionScore": 5}, "rebuttal": {"revisedConviction": -2}}) == 0.0


# --------------------------------------------------------------------------
# Verdict coercion — `.upper()` then `not in _LEVELS` -> "HOLD".
# --------------------------------------------------------------------------
def test_unknown_verdicts_coerced_to_hold(base_inputs):
    """'MAYBE', '' and None are not valid levels -> coerced to HOLD."""
    for bad in ["MAYBE", "", None]:
        deb = make_debate(verdict=bad)
        assert _assemble(base_inputs, deb)["verdict"] == "HOLD"


def test_lowercase_verdict_normalized_not_holded(base_inputs):
    """lowercase 'buy' is upper-cased to a VALID level BEFORE the membership
    check, so it normalizes to 'BUY' — it does NOT fall through to HOLD.
    Pins the actual order of operations (.upper() precedes 'not in _LEVELS').
    """
    deb = make_debate(verdict="buy")
    assert _assemble(base_inputs, deb)["verdict"] == "BUY"


# --------------------------------------------------------------------------
# Baseline rule equality edges — strict comparisons create dead-zones.
# --------------------------------------------------------------------------
def test_baseline_rsi_exactly_70_is_not_avoid_and_holds():
    """rsi 70 is NOT > 70 (no AVOID) but BUY needs rsi < 70 -> genuine HOLD
    dead-zone even with a positive trend."""
    assert decision._baseline_verdict(
        {"rsi14": 70, "trendPctVs20MA": 5, "drawdownFromHighPct": -10}, 0) == "HOLD"


def test_baseline_drawdown_exactly_minus_30_is_not_avoid():
    """drawdown -30 is NOT < -30 (strict) -> not AVOID; benign inputs -> BUY."""
    assert decision._baseline_verdict(
        {"rsi14": 40, "trendPctVs20MA": 5, "drawdownFromHighPct": -30}, 0) == "BUY"


# --------------------------------------------------------------------------
# Cross-field consistency C2 — manipulation forces signal 0 AND baseline AVOID
# at the same time; assert the two agree, not just each in isolation.
# --------------------------------------------------------------------------
def test_manipulation_forces_zero_signal_and_avoid_together(base_inputs):
    """m=1 (thin depth) must zero the signal AND set baselineVerdict=AVOID —
    the two manipulation effects must never disagree."""
    deb = make_debate(bull_conv=5, bear_conv=0)
    inp = copy.deepcopy(base_inputs)
    inp["deepbookTopDepthUsd"] = 10000.0  # < 20000 -> m=1
    res = _assemble(inp, deb)
    assert res["signalStrengthPct"] == 0
    assert res["flags"]["baselineVerdict"] == "AVOID"


# --------------------------------------------------------------------------
# Verdict / vol interactions with position size (fixes applied).
# --------------------------------------------------------------------------
def test_avoid_verdict_forces_size_to_zero(base_inputs):
    """An AVOID verdict never suggests a position size (size gated to 0), regardless
    of how favorable the vol/risk band would otherwise be."""
    deb = make_debate(bull_conv=5, bear_conv=0, verdict="AVOID")
    inp = copy.deepcopy(base_inputs)
    inp["realizedVolPercentile"] = 0.0
    assert _assemble(inp, deb, risk="moderate")["suggestedSizePct"] == 0
    # ...while the SAME inputs with a BUY verdict size normally (cap·(1-0)=15).
    buy = make_debate(bull_conv=5, bear_conv=0, verdict="BUY")
    assert _assemble(inp, buy, risk="moderate")["suggestedSizePct"] == 15


def test_size_is_clamped_to_cap_even_at_negative_vol(base_inputs):
    """suggestedSizePct is clamped to [0, cap] — an out-of-range NEGATIVE
    realizedVolPercentile (a hypothetical feed bug) can never push size above the
    risk-band cap. (round(30*1.5)=45 would exceed cap 30; the min(cap,…) guard holds it.)"""
    deb = make_debate()
    inp = copy.deepcopy(base_inputs)
    inp["realizedVolPercentile"] = -0.5
    assert _assemble(inp, deb, risk="high")["suggestedSizePct"] == 30   # == cap, not 45
