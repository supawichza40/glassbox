"""Failure-mode tests: the pipeline must DEGRADE, never crash.

  * LLM down -> analyze still returns a safe HOLD Decision (no exception).
  * Walrus down -> audit degrades to sink='local', blobId=None; verify still MATCHES.
  * /api/verify/unknownid -> {'error': ...}.
"""
import pytest

from glassbox import analyze as analyze_mod, agents, audit as audit_mod, verify as verify_mod
from glassbox import config, llm


# --------------------------------------------------------------------------
# LLM completely down -> safe HOLD, no exception
# --------------------------------------------------------------------------
def test_analyze_degrades_to_hold_when_llm_raises(monkeypatch):
    def boom(*args, **kwargs):
        raise RuntimeError("LLM provider is down")

    monkeypatch.setattr(llm, "chat_json", boom)
    # must NOT raise
    decision = analyze_mod.analyze("save for a house deposit", "SUI/USDC", "moderate")
    assert decision["verdict"] == "HOLD"          # arbiter fallback verdict
    # bull/bear degraded to fallback points, conviction 0 -> signal 0
    assert decision["signalStrengthPct"] == 0
    assert decision["signalBand"] == "Low"
    # fallback blindSpot is still present
    assert any("news" in b.lower() for b in decision["blindSpots"])


def test_run_debate_returns_fallback_on_garbage_llm(monkeypatch):
    """A garbage (non-dict) LLM reply is wrapped by _safe into a fallback dict."""
    monkeypatch.setattr(llm, "chat_json", lambda *a, **k: "garbage-not-a-dict")
    inputs = {"realizedVolPercentile": 0.5, "deepbookTopDepthUsd": 85000.0,
              "spreadBps": 12.0, "rsi14": 38.0, "trendPctVs20MA": 4.1,
              "drawdownFromHighPct": -18.0, "asOfIso": "t"}
    debate = agents.run_debate("SUI/USDC", inputs, "a goal", "moderate")
    assert isinstance(debate["bull"]["opening"], dict)
    assert isinstance(debate["arbiter"], dict)
    assert debate["arbiter"]["verdict"] == "HOLD"  # arbiter fallback


def test_analyze_via_api_degrades_to_hold(client, monkeypatch):
    def boom(*args, **kwargs):
        raise RuntimeError("LLM provider is down")

    monkeypatch.setattr(llm, "chat_json", boom)
    r = client.post("/api/analyze",
                    json={"goalText": "save for a house deposit", "risk": "moderate"})
    assert r.status_code == 200          # no 500 — degrades gracefully
    assert r.json()["verdict"] == "HOLD"


# --------------------------------------------------------------------------
# Walrus down -> sink='local', blobId=None, no crash; verify still MATCHES
# --------------------------------------------------------------------------
def test_audit_degrades_to_local_when_walrus_put_raises(monkeypatch):
    # force the walrus branch, then make the PUT explode
    monkeypatch.setattr(config, "AUDIT_SINK", "walrus")

    def boom_put(*args, **kwargs):
        raise RuntimeError("walrus publisher unreachable")

    monkeypatch.setattr(audit_mod.requests, "put", boom_put)

    decision = {"asset": "SUI/USDC", "verdict": "HOLD", "n": 1}
    audit = audit_mod.write_audit(decision, goal_text="")
    assert audit["sink"] == "local"        # degraded
    assert audit["blobId"] is None

    # verify still matches against the local canonical bytes
    result = verify_mod.verify(audit)
    assert result["hashMatch"] is True
    assert result["signatureValid"] is True
    assert result["source"] == "local"


def test_audit_degrades_when_walrus_returns_no_blobid(monkeypatch):
    """A 2xx response with no blobId in the body also degrades to local."""
    monkeypatch.setattr(config, "AUDIT_SINK", "walrus")

    class FakeResp:
        def raise_for_status(self):
            return None

        def json(self):
            return {}  # no newlyCreated / alreadyCertified -> blob_id is None

    monkeypatch.setattr(audit_mod.requests, "put", lambda *a, **k: FakeResp())

    audit = audit_mod.write_audit({"x": 1}, goal_text="")
    assert audit["sink"] == "local"
    assert audit["blobId"] is None


# --------------------------------------------------------------------------
# /api/verify/unknownid -> error
# --------------------------------------------------------------------------
def test_verify_unknown_id(client):
    r = client.get("/api/verify/unknownid")
    assert r.status_code == 200
    assert "error" in r.json()
