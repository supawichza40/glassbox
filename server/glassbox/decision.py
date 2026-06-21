"""Deterministic post-processing (code, never the LLM).

Computes Signal Strength + position size from the debate, runs the rule-based
baseline-verdict check, flags numeric grounding issues, and assembles the Decision.
Signal Strength is monotone non-increasing in risk by construction (quant-signed).
"""
import re

from . import config

_LEVELS = {"AVOID": 0, "HOLD": 1, "BUY": 2}
_CAPS = {"low": 5, "moderate": 15, "high": 30}


def _revised(side: dict) -> float:
    reb = side.get("rebuttal") or {}
    rc = reb.get("revisedConviction")
    if not isinstance(rc, (int, float)):
        rc = (side.get("opening") or {}).get("convictionScore", 0) or 0
    return max(0.0, min(5.0, float(rc)))   # clamp to the 0-5 scale the formula assumes


def _points(side: dict) -> list:
    return list((side.get("opening") or {}).get("points") or [])


def _manipulation_flag(inputs: dict) -> int:
    return 1 if (inputs.get("deepbookTopDepthUsd", 1e12) < 20000
                 or inputs.get("spreadBps", 0) > 50) else 0


def _baseline_verdict(inputs: dict, m: int) -> str:
    rsi = inputs.get("rsi14", 50)
    trend = inputs.get("trendPctVs20MA", 0)
    dd = inputs.get("drawdownFromHighPct", 0)
    if m or rsi > 70 or dd < -30:
        return "AVOID"
    if trend > 0 and rsi < 70:
        return "BUY"
    return "HOLD"


def _grounding_warnings(texts, inputs) -> list:
    vals = " ".join(str(v) for v in inputs.values())
    warns = []
    for t in texts:
        for num in re.findall(r"\d+(?:\.\d+)?", str(t)):
            if len(num) >= 2 and num not in vals and num.rstrip("0").rstrip(".") not in vals:
                warns.append(num)
    return sorted(set(warns))


def assemble_decision(asset: str, inputs: dict, debate: dict, risk_band: str) -> dict:
    bull, bear, arb = debate["bull"], debate["bear"], debate["arbiter"]
    bc, rc = _revised(bull), _revised(bear)

    a = abs(bc - rc) / 5.0
    v = float(inputs.get("realizedVolPercentile", 0.5))
    m = _manipulation_flag(inputs)
    signal_pct = max(0, min(100, round(100 * a * (1 - v) * (1 - m))))   # always a real %
    band = "Low" if signal_pct < 33 else ("Medium" if signal_pct < 66 else "High")

    cap = _CAPS.get(risk_band, 15)
    size_pct = max(0, min(cap, round(cap * (1 - v))))  # de-risks as vol rises; clamped to [0, cap]

    verdict = (arb.get("verdict") or "HOLD").upper()
    if verdict not in _LEVELS:
        verdict = "HOLD"
    if verdict == "AVOID":
        size_pct = 0   # never suggest a position size on an AVOID call
    baseline = _baseline_verdict(inputs, m)
    llm_overrode = abs(_LEVELS[verdict] - _LEVELS.get(baseline, 1)) >= 2

    texts = _points(bull) + _points(bear) + [arb.get("riskNote", "")]
    warns = _grounding_warnings(texts, inputs)
    # Surface silently-defaulted gameable inputs so the audited record shows the value was
    # synthetic, not from the feed (missing vol -> 0.5, depth -> 1e12, spread -> 0).
    defaulted = [k for k in ("realizedVolPercentile", "deepbookTopDepthUsd", "spreadBps")
                 if k not in inputs]

    return {
        "asset": asset,
        "timestampIso": inputs.get("asOfIso"),
        "inputs": inputs,
        "bull": {"points": _points(bull), "convictionRevised": bc,
                 "rebuttal": (bull.get("rebuttal") or {}).get("rebuttal", "")},
        "bear": {"points": _points(bear), "convictionRevised": rc,
                 "rebuttal": (bear.get("rebuttal") or {}).get("rebuttal", "")},
        "winningSide": arb.get("winningSide"),
        "whyResolved": arb.get("whyResolved"),
        "verdict": verdict,
        "riskNote": arb.get("riskNote"),
        "suggestedSizePct": size_pct,
        "signalStrengthPct": signal_pct,
        "signalBand": band,
        "counterfactual": arb.get("counterfactual"),
        "blindSpots": arb.get("blindSpots") or [],
        "flags": {"llmOverrodeSignals": llm_overrode, "baselineVerdict": baseline,
                  "groundingWarnings": warns, "defaultedInputs": defaulted},
        "provenance": {"provider": config.LLM_PROVIDER,
                       "fastModel": config.models()[0], "smartModel": config.models()[1]},
    }
