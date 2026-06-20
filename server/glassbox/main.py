"""GlassBox FastAPI server — wraps the proven brain as HTTP for the frontend.

Run from server/:
    python3 -m pip install -r requirements.txt
    uvicorn glassbox.main:app --reload --port 8787
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from . import config, analyze as analyze_mod, audit as audit_mod, verify as verify_mod

app = FastAPI(title="GlassBox", version="0.1.0")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)

# In-memory audit store for the demo (keyed by short record id).
_AUDITS: dict = {}


class AnalyzeReq(BaseModel):
    goalText: str
    asset: str = "SUI/USDC"
    risk: str = "moderate"


class AuditReq(BaseModel):
    decision: dict
    goalText: str = ""


@app.get("/api/health")
def health():
    fast, smart = config.models()
    return {
        "ok": True, "provider": config.LLM_PROVIDER,
        "fastModel": fast, "smartModel": smart,
        "auditSink": config.AUDIT_SINK, "anchor": config.ANCHOR,
        "execution": config.EXECUTION,
    }


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
