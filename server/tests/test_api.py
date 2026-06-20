"""Integration tests for the FastAPI app via TestClient.

All LLM + Walrus access is mocked: ``canned_chat_json`` patches
``glassbox.llm.chat_json`` so /api/analyze runs fully offline, and
``local_sink`` forces the audit sink to 'local' so /api/audit never calls
Walrus.
"""
from glassbox.main import _AUDITS


# --------------------------------------------------------------------------
# /api/health
# --------------------------------------------------------------------------
def test_health_ok(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert "provider" in body
    assert "fastModel" in body and "smartModel" in body
    assert "auditSink" in body


# --------------------------------------------------------------------------
# /api/analyze returns a full Decision (mocked LLM)
# --------------------------------------------------------------------------
def test_analyze_returns_full_decision(client, canned_chat_json):
    r = client.post("/api/analyze",
                    json={"goalText": "save for a house deposit", "risk": "moderate"})
    assert r.status_code == 200
    d = r.json()
    # full Decision shape
    for key in ("asset", "inputs", "bull", "bear", "verdict", "suggestedSizePct",
                "signalStrengthPct", "signalBand", "flags", "provenance",
                "blindSpots", "counterfactual", "riskNote"):
        assert key in d, f"missing {key}"
    assert d["verdict"] in ("BUY", "HOLD", "AVOID")
    assert d["signalBand"] in ("Low", "Medium", "High")
    assert isinstance(d["flags"]["groundingWarnings"], list)
    assert 0 <= d["signalStrengthPct"] <= 100


# --------------------------------------------------------------------------
# /api/audit then /api/verify/{recordId}: hashMatch + signatureValid
# --------------------------------------------------------------------------
def test_audit_then_verify_matches(client, canned_chat_json, local_sink):
    decision = client.post(
        "/api/analyze",
        json={"goalText": "grow my savings steadily", "risk": "moderate"}).json()

    au = client.post("/api/audit", json={"decision": decision, "goalText": "my goal"})
    assert au.status_code == 200
    ab = au.json()
    assert ab["sink"] == "local"      # forced offline
    rid = ab["recordId"]
    assert rid in _AUDITS

    vr = client.get(f"/api/verify/{rid}")
    assert vr.status_code == 200
    vb = vr.json()
    assert vb["hashMatch"] is True
    assert vb["signatureValid"] is True
    assert vb["source"] == "local"


def test_audit_exposes_canonical_matching_hash(client, canned_chat_json, local_sink):
    """recordCanonical is the exact bytes hashed: sha256(it) == recordHash.

    Guarantees the browser-side tamper demo (which hashes recordCanonical with Web Crypto)
    shows MATCH when unedited and MISMATCH on any single-character change.
    """
    import hashlib
    decision = client.post(
        "/api/analyze",
        json={"goalText": "grow my savings steadily", "risk": "moderate"}).json()
    ab = client.post("/api/audit", json={"decision": decision, "goalText": ""}).json()
    assert "recordCanonical" in ab
    assert hashlib.sha256(ab["recordCanonical"].encode("utf-8")).hexdigest() == ab["recordHash"]


def test_audit_surfaces_sui_object_from_walrus(client, canned_chat_json, monkeypatch):
    """When Walrus returns a blob object, the audit carries the Sui object id + epoch."""
    from glassbox import audit
    from glassbox import config as cfg
    monkeypatch.setattr(cfg, "AUDIT_SINK", "walrus")

    class _R:
        def raise_for_status(self): pass
        def json(self):
            return {"newlyCreated": {"blobObject": {
                "blobId": "BLOB123", "id": "0xabc", "registeredEpoch": 434, "certifiedEpoch": None}}}
    monkeypatch.setattr(audit.requests, "put", lambda *a, **k: _R())

    d = client.post("/api/analyze",
                    json={"goalText": "grow my savings steadily", "risk": "moderate"}).json()
    a = client.post("/api/audit", json={"decision": d, "goalText": ""}).json()
    assert a["sink"] == "walrus" and a["blobId"] == "BLOB123"
    assert a["suiObjectId"] == "0xabc" and a["anchorEpoch"] == 434
    assert a["anchorNetwork"] == "sui:testnet"


def test_chart_series_present_but_excluded_from_hash(client, canned_chat_json, local_sink):
    """chartSeries is in the Decision (for the chart) but NOT in the signed/hashed record."""
    import hashlib
    d = client.post("/api/analyze",
                    json={"goalText": "grow my savings steadily", "risk": "moderate"}).json()
    assert isinstance(d.get("chartSeries"), list) and len(d["chartSeries"]) >= 21
    a = client.post("/api/audit", json={"decision": d, "goalText": ""}).json()
    assert "chartSeries" not in a["recordCanonical"]                       # not in the signed bytes
    assert hashlib.sha256(a["recordCanonical"].encode()).hexdigest() == a["recordHash"]


# --------------------------------------------------------------------------
# /api/rehash on an ALTERED decision yields a different hash (tamper)
# --------------------------------------------------------------------------
def test_rehash_detects_tamper(client, canned_chat_json):
    decision = client.post(
        "/api/analyze",
        json={"goalText": "save for retirement", "risk": "low"}).json()

    h1 = client.post("/api/rehash", json={"decision": decision}).json()["recordHash"]

    tampered = dict(decision)
    tampered["verdict"] = "BUY" if decision["verdict"] != "BUY" else "AVOID"
    h2 = client.post("/api/rehash", json={"decision": tampered}).json()["recordHash"]

    assert h1 != h2


def test_rehash_stable_for_identical_decision(client, canned_chat_json):
    decision = client.post(
        "/api/analyze",
        json={"goalText": "save for retirement", "risk": "low"}).json()
    h1 = client.post("/api/rehash", json={"decision": decision}).json()["recordHash"]
    h2 = client.post("/api/rehash", json={"decision": decision}).json()["recordHash"]
    assert h1 == h2  # deterministic canonicalisation


# --------------------------------------------------------------------------
# input validation
# --------------------------------------------------------------------------
def test_analyze_short_goaltext_422(client):
    r = client.post("/api/analyze", json={"goalText": "hi", "risk": "moderate"})
    assert r.status_code == 422


def test_analyze_bad_risk_422(client):
    r = client.post("/api/analyze", json={"goalText": "save for a house", "risk": "spicy"})
    assert r.status_code == 422


def test_verify_unknown_id_returns_error(client):
    r = client.get("/api/verify/this-id-does-not-exist")
    assert r.status_code == 200
    assert "error" in r.json()
