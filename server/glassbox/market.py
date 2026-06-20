"""The 5+ frozen market features for an asset.

STUB feed for now (deterministic dev snapshot). Replace _snapshot() with a real
CoinGecko/Binance CLOSED-candle fetch + DeepBook depth later (quant requirement:
closed candles only, no lookahead). The dict returned here is what the agents see
and what gets hashed into the audit record, so it must be frozen per analysis.
"""
from datetime import datetime, timezone


def _snapshot(asset: str) -> dict:
    # TODO: real closed-candle feed. Deterministic SUI/USDC dev snapshot.
    return {
        "priceUsd": 3.42,
        "trendPctVs20MA": 4.1,
        "rsi14": 38.0,
        "realizedVolPercentile": 0.62,
        "deepbookTopDepthUsd": 85000.0,
        "spreadBps": 12.0,
        "drawdownFromHighPct": -18.0,
    }


def get_inputs(asset="SUI/USDC", risk_band="moderate", horizon_days=14,
               goal_category="growth", freeze_ts=None) -> dict:
    snap = _snapshot(asset)
    snap["asOfIso"] = freeze_ts or datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    snap["riskBand"] = risk_band
    snap["horizonDays"] = horizon_days
    snap["goalCategory"] = goal_category
    return snap
