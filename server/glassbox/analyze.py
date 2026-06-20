"""Orchestrates one analysis: market inputs -> rebuttal debate -> Decision."""
from . import agents, decision, market


def analyze(goal_text: str, asset: str = "SUI/USDC", risk_band: str = "moderate",
            horizon_days: int = 14, goal_category: str = "growth") -> dict:
    inputs = market.get_inputs(asset, risk_band, horizon_days, goal_category)
    series = inputs.pop("chartCloses", None)        # presentation-only; kept OUT of inputs + the hash
    debate = agents.run_debate(asset, inputs, goal_text, risk_band)
    d = decision.assemble_decision(asset, inputs, debate, risk_band)
    if series:
        d["chartSeries"] = series                   # top-level; stripped before signing (audit._anchored_object)
    return d
