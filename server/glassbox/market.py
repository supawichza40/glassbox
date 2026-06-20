"""The 5+ frozen market features for an asset.

LIVE feed: CoinGecko daily closes (free, no key) for the price-derived features, using
only CLOSED candles (drops today's partial) — no lookahead. DeepBook depth/spread are
modeled for now (TODO: real Sui RPC). Falls back to a deterministic snapshot on ANY error
(no network, rate limit, thin history) so the demo never breaks. A short cache keeps a
demo run consistent and avoids rate limits. The dict returned is what the agents see and
what gets hashed into the audit record, so it is frozen per analysis.
"""
import statistics
import time
from datetime import datetime, timezone

import requests

# Deterministic fallback snapshot (also the offline/demo value).
_STUB = {
    "priceUsd": 3.42, "trendPctVs20MA": 4.1, "rsi14": 38.0,
    "realizedVolPercentile": 0.62, "deepbookTopDepthUsd": 85000.0,
    "spreadBps": 12.0, "drawdownFromHighPct": -18.0,
}
_CG_ID = {"SUI/USDC": "sui"}
_cache = {"ts": 0.0, "snap": None}
_TTL = 60.0                 # seconds; consistent within a demo + rate-limit friendly
LAST_SOURCE = "stub"        # becomes "coingecko" after a successful live fetch


def _rsi(closes, period: int = 14) -> float:
    if len(closes) <= period:
        return 50.0
    gains = losses = 0.0
    for a, b in zip(closes[-(period + 1):-1], closes[-period:]):
        ch = b - a
        gains += max(ch, 0.0)
        losses += max(-ch, 0.0)
    if losses == 0:
        return 100.0
    rs = (gains / period) / (losses / period)
    return round(100 - 100 / (1 + rs), 1)


def _live_snapshot(asset: str) -> dict:
    cg = _CG_ID.get(asset, "sui")
    r = requests.get(
        f"https://api.coingecko.com/api/v3/coins/{cg}/market_chart",
        params={"vs_currency": "usd", "days": 200}, timeout=8,
    )
    r.raise_for_status()
    closes = [p[1] for p in r.json()["prices"]][:-1]   # drop today's partial candle
    if len(closes) < 21:
        raise ValueError("insufficient history")
    price = closes[-1]
    ma20 = sum(closes[-20:]) / 20
    rets = [(closes[i] - closes[i - 1]) / closes[i - 1] for i in range(1, len(closes))]
    win = 14
    vol_now = statistics.pstdev(rets[-win:])
    hist = [statistics.pstdev(rets[i - win:i]) for i in range(win, len(rets) + 1)]
    pct = sum(1 for v in hist if v <= vol_now) / len(hist) if hist else 0.5
    high = max(closes)
    return {
        "priceUsd": round(price, 4),
        "trendPctVs20MA": round((price - ma20) / ma20 * 100, 1),
        "rsi14": _rsi(closes, 14),
        "realizedVolPercentile": round(pct, 2),
        "deepbookTopDepthUsd": 85000.0,   # TODO: real DeepBook depth (Sui RPC)
        "spreadBps": 12.0,                # TODO: real DeepBook spread (Sui RPC)
        "drawdownFromHighPct": round((price - high) / high * 100, 1),
    }


def _snapshot(asset: str) -> dict:
    global LAST_SOURCE
    now = time.time()
    if _cache["snap"] and now - _cache["ts"] < _TTL:
        return dict(_cache["snap"])
    try:
        snap = _live_snapshot(asset)
        LAST_SOURCE = "coingecko"
        _cache.update(ts=now, snap=snap)
        return dict(snap)
    except Exception:
        LAST_SOURCE = "stub"          # graceful degrade — demo never breaks
        return dict(_STUB)


def get_inputs(asset="SUI/USDC", risk_band="moderate", horizon_days=14,
               goal_category="growth", freeze_ts=None) -> dict:
    snap = _snapshot(asset)
    snap["asOfIso"] = freeze_ts or datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    snap["riskBand"] = risk_band
    snap["horizonDays"] = horizon_days
    snap["goalCategory"] = goal_category
    return snap
