"""Live market feed: RSI math, CoinGecko parsing/derivation, and input shape."""
from glassbox import market


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
