"""Live market feed: RSI math, CoinGecko parsing/derivation, and input shape."""
import time

import pytest

from glassbox import market

# Captured at IMPORT time, BEFORE the autouse `_offline_market` fixture replaces
# market._snapshot with the stub. Lets the dispatcher tests below exercise the
# REAL _snapshot (cache/live/fallback) instead of the offline stub.
_REAL_SNAPSHOT = market._snapshot


class _Resp:
    """Minimal stand-in for a requests Response carrying a fixed JSON body."""

    def __init__(self, body):
        self._body = body

    def raise_for_status(self):
        pass

    def json(self):
        return self._body


def _cg_prices(closes):
    """Wrap a closes list in CoinGecko market_chart shape: [[ms, price], ...]."""
    return [[i * 86_400_000, float(c)] for i, c in enumerate(closes)]


def test_rsi_rising_series_is_high():
    rising = [float(i) for i in range(1, 40)]
    assert market._rsi(rising, 14) > 70


def test_rsi_falling_series_is_low():
    falling = [float(i) for i in range(40, 1, -1)]
    assert market._rsi(falling, 14) < 30


def test_live_snapshot_parses_and_computes(monkeypatch):
    # 60 fake daily closes trending up from 3.00 (CoinGecko market_chart shape)
    prices = [[i * 86_400_000, 3.00 + 0.01 * i] for i in range(60)]

    class _Resp:
        def raise_for_status(self):
            pass

        def json(self):
            return {"prices": prices}

    monkeypatch.setattr(market.requests, "get", lambda *a, **k: _Resp())
    snap = market._live_snapshot("SUI/USDC")
    assert set(snap) >= {"priceUsd", "trendPctVs20MA", "rsi14",
                         "realizedVolPercentile", "drawdownFromHighPct"}
    assert 0 <= snap["rsi14"] <= 100
    assert 0.0 <= snap["realizedVolPercentile"] <= 1.0
    assert snap["drawdownFromHighPct"] <= 0          # price can't exceed its own high
    assert snap["priceUsd"] > 0


def test_get_inputs_has_required_shape():
    inp = market.get_inputs(risk_band="high", horizon_days=30)
    for k in ("priceUsd", "rsi14", "realizedVolPercentile", "riskBand",
              "horizonDays", "asOfIso"):
        assert k in inp
    assert inp["riskBand"] == "high"


def test_deepbook_computes_spread_and_depth(monkeypatch):
    ob = {"bids": [["0.707", "100"], ["0.706", "200"]],
          "asks": [["0.708", "150"], ["0.709", "250"]]}

    class _R:
        def raise_for_status(self): pass
        def json(self): return ob
    monkeypatch.setattr(market.requests, "get", lambda *a, **k: _R())
    depth, spread = market._deepbook_safe("SUI/USDC")
    assert spread > 0 and depth > 0


def test_deepbook_falls_back_on_error(monkeypatch):
    def boom(*a, **k):
        raise RuntimeError("indexer down")
    monkeypatch.setattr(market.requests, "get", boom)
    assert market._deepbook_safe("SUI/USDC") == (85000.0, 12.0)


# ---------------------------------------------------------------------------
# 1. _rsi: KNOWN ANSWERS (not just ranges)
# ---------------------------------------------------------------------------
def test_rsi_short_series_returns_exactly_50():
    # len(closes) <= period -> the early-out neutral value.
    assert market._rsi([1, 2, 3], 14) == 50.0


def test_rsi_strictly_rising_returns_exactly_100():
    # No down days => losses == 0 => the saturated branch returns exactly 100.0.
    rising = [float(i) for i in range(1, 17)]   # 16 points, period 14, all up
    assert market._rsi(rising, 14) == 100.0


def test_rsi_mixed_series_hand_computed():
    # period=2 over [10, 11, 9]:
    #   window pairs: (10->11) gain=+1 ; (11->9) loss=2
    #   rs = (1/2) / (2/2) = 0.5 ; RSI = 100 - 100/(1+0.5) = 33.333... -> 33.3
    assert market._rsi([10, 11, 9], 2) == 33.3


# ---------------------------------------------------------------------------
# 2. realizedVolPercentile: CORRECTNESS (highest -> ~1.0, lowest -> floor)
# ---------------------------------------------------------------------------
def test_realized_vol_percentile_is_one_when_recent_vol_is_highest(monkeypatch):
    # Long CALM history, then a VOLATILE recent stretch: the trailing 14-day
    # return-vol is the largest window in the whole series -> percentile == 1.0.
    closes = [100.0]
    for i in range(120):                     # calm: tiny alternating returns
        closes.append(closes[-1] * (1.0 + 0.0005 * ((-1) ** i)))
    for i in range(20):                      # volatile tail: large swings
        closes.append(closes[-1] * (1.0 + 0.08 * ((-1) ** i)))
    prices = _cg_prices(closes) + [[9_999_999_999, closes[-1]]]   # +1 partial (dropped)
    monkeypatch.setattr(market.requests, "get", lambda *a, **k: _Resp({"prices": prices}))
    assert market._live_snapshot("SUI/USDC")["realizedVolPercentile"] == 1.0


def test_realized_vol_percentile_hits_floor_when_recent_vol_is_lowest(monkeypatch):
    # Strictly-SHRINKING swing amplitude => every new window has lower vol than
    # all prior windows, so vol_now is the unique minimum. The percentile then
    # equals its theoretical floor 1/len(hist) (only vol_now satisfies v<=vol_now).
    closes, amp = [100.0], 0.20
    for i in range(160):
        amp *= 0.97
        closes.append(closes[-1] * (1.0 + amp * ((-1) ** i)))
    prices = _cg_prices(closes) + [[9_999_999_999, closes[-1]]]
    monkeypatch.setattr(market.requests, "get", lambda *a, **k: _Resp({"prices": prices}))

    used = [p[1] for p in prices][:-1]
    rets = len(used) - 1
    nwin = rets - 14 + 1                      # number of trailing-14 windows in hist
    expected_floor = round(1.0 / nwin, 2)     # only vol_now (the min) counts
    pct = market._live_snapshot("SUI/USDC")["realizedVolPercentile"]
    assert pct == expected_floor
    assert pct < 0.10                         # sanity: it really is "near its floor"


# ---------------------------------------------------------------------------
# 3. trendPctVs20MA + drawdownFromHighPct: EXACT (sign + value)
# ---------------------------------------------------------------------------
def _known_trend_drawdown_closes():
    # Constructed so (after dropping the partial 999.0):
    #   last close = 110.0 ; mean(last 20) = 100.0 ; max = 200.0
    #   => trendPctVs20MA = (110-100)/100*100 = +10.0
    #   => drawdownFromHighPct = (110-200)/200*100 = -45.0
    return (
        [50.0] * 5 + [200.0] + [90.0] * 4
        + [100.0] * 18 + [110.0]      # <- 110.0 is the last CLOSED candle
        + [999.0]                     # <- partial candle, dropped by [:-1]
    )


def test_trend_and_drawdown_exact(monkeypatch):
    closes = _known_trend_drawdown_closes()
    prices = _cg_prices(closes)
    monkeypatch.setattr(market.requests, "get", lambda *a, **k: _Resp({"prices": prices}))
    snap = market._live_snapshot("SUI/USDC")
    assert snap["priceUsd"] == 110.0
    assert snap["trendPctVs20MA"] == 10.0       # positive sign + exact value
    assert snap["drawdownFromHighPct"] == -45.0  # exact value
    # deepbook get() also returns the same _Resp (no bids/asks) -> modeled fallback
    assert (snap["deepbookTopDepthUsd"], snap["spreadBps"]) == (85000.0, 12.0)


# ---------------------------------------------------------------------------
# 4. Closed-candle discipline: today's partial candle is dropped
# ---------------------------------------------------------------------------
def test_live_snapshot_drops_partial_candle(monkeypatch):
    closes = _known_trend_drawdown_closes()
    prices = _cg_prices(closes)
    monkeypatch.setattr(market.requests, "get", lambda *a, **k: _Resp({"prices": prices}))
    snap = market._live_snapshot("SUI/USDC")
    # The last close USED is the second-to-last point of the mocked prices,
    # never the final (partial) one.
    assert snap["priceUsd"] == round(prices[-2][1], 4)
    assert snap["priceUsd"] != prices[-1][1]


# ---------------------------------------------------------------------------
# 5. Insufficient history: < 21 closes -> ValueError
# ---------------------------------------------------------------------------
def test_live_snapshot_raises_on_thin_history(monkeypatch):
    # 21 raw points -> 20 closes after dropping the partial -> < 21 -> raises.
    prices = _cg_prices([3.0 + 0.01 * i for i in range(21)])
    monkeypatch.setattr(market.requests, "get", lambda *a, **k: _Resp({"prices": prices}))
    with pytest.raises(ValueError):
        market._live_snapshot("SUI/USDC")


# ---------------------------------------------------------------------------
# 6. _snapshot dispatcher: cache-hit / live-success / fallback
#    (restore the REAL _snapshot captured before the autouse stub patch)
# ---------------------------------------------------------------------------
def test_snapshot_cache_hit_skips_live(monkeypatch):
    monkeypatch.setattr(market, "_snapshot", _REAL_SNAPSHOT)
    monkeypatch.setattr(market, "_cache", {"ts": time.time(), "snap": {"priceUsd": 7.77}})

    def explode(*a, **k):
        raise AssertionError("_live_snapshot must NOT be called on a cache hit")

    monkeypatch.setattr(market, "_live_snapshot", explode)
    out = market._snapshot("SUI/USDC")
    assert out == {"priceUsd": 7.77}
    assert out is not market._cache["snap"]          # returns a copy, not the cached obj


def test_snapshot_live_success_sets_source_and_caches(monkeypatch):
    monkeypatch.setattr(market, "_snapshot", _REAL_SNAPSHOT)
    monkeypatch.setattr(market, "_cache", {"ts": 0.0, "snap": None})   # cold cache
    monkeypatch.setattr(market, "LAST_SOURCE", "stub")
    fresh = {"priceUsd": 1.23}
    monkeypatch.setattr(market, "_live_snapshot", lambda asset: dict(fresh))

    out = market._snapshot("SUI/USDC")
    assert out == fresh
    assert market.LAST_SOURCE == "coingecko"
    assert market._cache["snap"] == fresh            # cache populated on success


def test_snapshot_falls_back_to_stub_on_error(monkeypatch):
    monkeypatch.setattr(market, "_snapshot", _REAL_SNAPSHOT)
    monkeypatch.setattr(market, "_cache", {"ts": 0.0, "snap": None})
    monkeypatch.setattr(market, "LAST_SOURCE", "coingecko")

    def boom(asset):
        raise RuntimeError("coingecko down")

    monkeypatch.setattr(market, "_live_snapshot", boom)
    out = market._snapshot("SUI/USDC")
    assert out == market._STUB
    assert out is not market._STUB                   # returns a copy, not the module obj
    assert market.LAST_SOURCE == "stub"


# ---------------------------------------------------------------------------
# 7. _deepbook_safe empty-book branch
# ---------------------------------------------------------------------------
def test_deepbook_empty_book_falls_back(monkeypatch):
    body = {"bids": [], "asks": [["0.708", "150"], ["0.709", "250"]]}
    monkeypatch.setattr(market.requests, "get", lambda *a, **k: _Resp(body))
    assert market._deepbook_safe("SUI/USDC") == (85000.0, 12.0)
