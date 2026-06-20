"""Orchestrates one analysis: market inputs -> rebuttal debate -> Decision."""
from . import market, agents, decision


def analyze(goal_text: str, asset: str = "SUI/USDC", risk_band: str = "moderate",
            horizon_days: int = 14, goal_category: str = "growth") -> dict:
    inputs = market.get_inputs(asset, risk_band, horizon_days, goal_category)
    debate = agents.run_debate(asset, inputs, goal_text, risk_band)
    return decision.assemble_decision(asset, inputs, debate, risk_band)
