"""GlassBox FastAPI server — wraps the proven brain as HTTP + serves the demo UI.

Run from server/:
    python3 -m pip install -r requirements.txt
    uvicorn glassbox.main:app --reload --port 8787
    # then open http://localhost:8787/
"""
import os

from typing import Literal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from . import config, crypto, analyze as analyze_mod, audit as audit_mod, verify as verify_mod

app = FastAPI(title="GlassBox", version="0.1.0")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)

# In-memory audit store for the demo (keyed by short record id).
_AUDITS: dict = {}


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


@app.post("/api/analyze")
def analyze(req: AnalyzeReq):
    return analyze_mod.analyze(req.goalText, req.asset, req.risk)


@app.post("/api/audit")
def audit(req: AuditReq):
    a = audit_mod.write_audit(req.decision, goal_text=req.goalText)
    rid = a["recordHash"][:16]
    _AUDITS[rid] = a
    return {"recordId": rid, "recordHash": a["recordHash"], "signature": a["signature"],
            "pubkey": a["pubkey"], "sink": a["sink"], "blobId": a["blobId"],
            "anchorTxDigest": a["anchorTxDigest"]}


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


# Serve the demo UI from /  (mounted last so /api/* takes precedence)
_STATIC = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(_STATIC):
    app.mount("/", StaticFiles(directory=_STATIC, html=True), name="ui")
