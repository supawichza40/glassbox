"""GlassBox FastAPI server — wraps the proven brain as HTTP + serves the demo UI.

Run from server/:
    python3 -m pip install -r requirements.txt
    uvicorn glassbox.main:app --reload --port 8787
    # then open http://localhost:8787/
"""
import json
import os
from typing import Literal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from . import analyze as analyze_mod
from . import audit as audit_mod
from . import config, crypto, demo, guard
from . import verify as verify_mod

app = FastAPI(title="GlassBox", version="0.1.0")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)

# In-memory audit store for the demo (keyed by short record id).
_AUDITS: dict = {}
# Records are also persisted here so the standalone /verify page can open ANY record
# (demo or freshly "Proved"), surviving restarts. Future: replace this file store with a DB.
_RECEIPTS_DIR = os.path.join(os.path.dirname(__file__), "static", "receipts")


def _persist_receipt(rid: str, a: dict, decision: dict) -> None:
    """Best-effort: write a PII-free receipt JSON the verify page can load. Never breaks audit."""
    try:
        os.makedirs(_RECEIPTS_DIR, exist_ok=True)
        receipt = {
            "recordId": rid, "blobId": a.get("blobId"), "recordHash": a["recordHash"],
            "signature": a["signature"], "pubkey": a["pubkey"],
            "suiObjectId": a.get("suiObjectId"), "anchorEpoch": a.get("anchorEpoch"),
            "anchorNetwork": a.get("anchorNetwork"), "sink": a.get("sink"),
            "walrusAggregator": config.WALRUS_AGGREGATOR, "suiExplorer": config.SUI_EXPLORER,
            "recordCanonical": a["_canonical"], "decision": decision,
        }
        with open(os.path.join(_RECEIPTS_DIR, f"{rid}.json"), "w") as f:
            json.dump(receipt, f)
    except Exception:
        pass


class AnalyzeReq(BaseModel):
    goalText: str = Field(min_length=5)
    asset: str = "SUI/USDC"
    risk: Literal["low", "moderate", "high"] = "moderate"


class AuditReq(BaseModel):
    decision: dict
    goalText: str = ""


@app.get("/api/health")
def health():
    fast, smart = config.models()
    return {"ok": True, "provider": config.LLM_PROVIDER, "fastModel": fast,
            "smartModel": smart, "auditSink": config.AUDIT_SINK,
            "anchor": config.ANCHOR, "execution": config.EXECUTION}


@app.get("/api/pubkey")
def pubkey():
    """Published verifying key — anyone can check a record's signature with this + verify_cli."""
    return {"pubkey": crypto.PUBKEY_HEX}


@app.post("/api/analyze")
def analyze(req: AnalyzeReq):
    cached = demo.lookup(req.goalText)   # instant + deterministic in DEMO_MODE
    if cached is not None:
        return cached
    redirect = guard.relevance_gate(req.goalText)   # "Hello" -> friendly redirect, not a verdict
    if redirect:
        return JSONResponse(status_code=422, content={"outOfScope": True, "message": redirect})
    return analyze_mod.analyze(req.goalText, req.asset, req.risk)


@app.post("/api/audit")
def audit(req: AuditReq):
    a = audit_mod.write_audit(req.decision, goal_text=req.goalText)
    rid = a["recordHash"][:16]
    _AUDITS[rid] = a
    _persist_receipt(rid, a, req.decision)   # make it openable in the standalone /verify page
    return {"recordId": rid, "recordHash": a["recordHash"], "signature": a["signature"],
            "pubkey": a["pubkey"], "sink": a["sink"], "blobId": a["blobId"],
            "anchorTxDigest": a["anchorTxDigest"],
            "suiObjectId": a.get("suiObjectId"), "anchorEpoch": a.get("anchorEpoch"),
            "anchorNetwork": a.get("anchorNetwork"),
            "recordCanonical": a["_canonical"]}   # exact bytes that were hashed (PII-free)


@app.get("/api/verify/{record_id}")
def verify_ep(record_id: str):
    a = _AUDITS.get(record_id)
    if not a:
        return {"error": "unknown recordId"}
    return verify_mod.verify(a)


@app.post("/api/rehash")
def rehash(req: AuditReq):
    """Hash a (possibly altered) decision — lets the UI prove a tamper changes the hash."""
    return {"recordHash": crypto.sha256_hex(crypto.canonical(req.decision))}


_STATIC = os.path.join(os.path.dirname(__file__), "static")


@app.get("/verify")
@app.get("/r/{record_id}")
def verify_page(record_id: str = ""):
    """Standalone 'verify-it-yourself' receipt page (independent of the API/UI).

    The page reads ?r=<id>; /r/<id> is a clean alias. It re-fetches the blob from Walrus
    and re-checks hash + signature IN THE BROWSER — no GlassBox server in the trust path.
    """
    return FileResponse(os.path.join(_STATIC, "verify.html"))


# Serve the demo UI from /  (mounted last so /api/* + explicit routes take precedence)
if os.path.isdir(_STATIC):
    app.mount("/", StaticFiles(directory=_STATIC, html=True), name="ui")
