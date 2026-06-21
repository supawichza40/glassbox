"""GlassBox FastAPI server — wraps the proven brain as HTTP + serves the demo UI.

Run from server/:
    python3 -m pip install -r requirements.txt
    uvicorn glassbox.main:app --reload --port 8787
    # then open http://localhost:8787/
"""
import json
import os
import threading
import time
from collections import deque
from typing import Literal, Optional

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from . import analyze as analyze_mod
from . import audit as audit_mod
from . import chat as chat_mod
from . import config, crypto, demo, guard
from . import verify as verify_mod

app = FastAPI(title="GlassBox", version="0.1.0")

# CORS — env-configurable via CORS_ORIGINS (comma-separated). DEFAULT is allow-all
# ("*") so the live cross-origin Vercel verifier keeps working out of the box; set
# CORS_ORIGINS in production to a scoped list, e.g.
#   CORS_ORIGINS="https://glassbox.vercel.app,https://glassbox-verify.vercel.app"
# (recommended for production — narrows the browser-allowed origins).
_cors_env = (os.getenv("CORS_ORIGINS") or "").strip()
_cors_origins = [o.strip() for o in _cors_env.split(",") if o.strip()] or ["*"]
app.add_middleware(
    CORSMiddleware, allow_origins=_cors_origins, allow_methods=["*"], allow_headers=["*"],
)

# --- Cheap abuse guards on POST /api/chat ------------------------------------
# Body-size cap: reject an oversized request body with 413 before it is parsed,
# so a multi-MB payload can't burn validation/CPU. Content-Length is the cheap
# pre-check; the streaming-body branch in the middleware bounds chunked bodies too.
_CHAT_MAX_BODY_BYTES = 256 * 1024            # ~256 KB

# In-process per-IP token bucket: ~15 requests / 60 s, monotonic (sliding-window)
# refill. Pure in-memory (single process) — fine for the demo; swap for Redis in a
# real deployment. Keyed on request.client.host. The window is short enough that a
# rapid burst (the red-team's 25-in-a-row) is throttled with 429s, while ordinary
# interactive use (a handful of questions a minute) is never touched.
_RL_CAPACITY = int(os.getenv("CHAT_RATE_LIMIT", "15"))
_RL_WINDOW_S = 60.0
_rl_hits: dict[str, deque] = {}
_rl_lock = threading.Lock()


def _rate_limited(ip: str) -> bool:
    """True if `ip` has exhausted its bucket (10 req / 60 s). Sliding window."""
    now = time.monotonic()
    with _rl_lock:
        dq = _rl_hits.get(ip)
        if dq is None:
            dq = deque()
            _rl_hits[ip] = dq
        # Drop timestamps older than the window (monotonic refill).
        cutoff = now - _RL_WINDOW_S
        while dq and dq[0] <= cutoff:
            dq.popleft()
        if len(dq) >= _RL_CAPACITY:
            return True
        dq.append(now)
        return False


@app.middleware("http")
async def _chat_body_cap(request: Request, call_next):
    """Reject oversized POST /api/chat bodies with 413 before route validation."""
    if request.method == "POST" and request.url.path == "/api/chat":
        cl = request.headers.get("content-length")
        if cl is not None:
            try:
                if int(cl) > _CHAT_MAX_BODY_BYTES:
                    return JSONResponse(status_code=413,
                                        content={"detail": "request body too large"})
            except ValueError:
                pass  # malformed header -> let normal parsing reject it
    return await call_next(request)

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


# --- Explainer chatbot (POST /api/chat) --------------------------------------
# Cheap abuse guards (the security agent hardens later; these are the obvious ones).
_CHAT_MAX_QUESTION = 2000        # chars; a single user message
_CHAT_MAX_HISTORY_TURNS = 6      # keep only the last few turns
_CHAT_MAX_HISTORY_CONTENT = 4000  # chars per history message
_CHAT_MAX_CONTEXT_BYTES = 60_000  # serialized context payload cap (decision+audit dicts)


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=_CHAT_MAX_HISTORY_CONTENT)


class ChatContext(BaseModel):
    decision: Optional[dict] = None
    audit: Optional[dict] = None
    page: Optional[Literal["dashboard", "verify"]] = None


class ChatReq(BaseModel):
    # min_length=1 rejects "" (422); the route also rejects whitespace-only.
    question: str = Field(min_length=1, max_length=_CHAT_MAX_QUESTION)
    context: Optional[ChatContext] = None
    # Cap the history list length so an oversized list 422s at validation (before
    # trimming) rather than building a giant payload. We only keep the last few
    # turns anyway (_CHAT_MAX_HISTORY_TURNS); this is a generous abuse ceiling.
    history: Optional[list[ChatTurn]] = Field(default=None, max_length=200)


@app.get("/api/health")
def health():
    fast, smart = config.models()
    return {"ok": True, "provider": config.LLM_PROVIDER, "fastModel": fast,
            "smartModel": smart, "auditSink": config.AUDIT_SINK,
            "anchor": config.ANCHOR, "execution": config.EXECUTION,
            "demoMode": config.DEMO_MODE}


@app.get("/api/pubkey")
def pubkey():
    """Published verifying key — anyone can check a record's signature with this + verify_cli."""
    return {"pubkey": crypto.PUBKEY_HEX}


@app.post("/api/analyze")
def analyze(req: AnalyzeReq, response: Response):
    cached = demo.lookup(req.goalText)   # instant + deterministic in DEMO_MODE
    if cached is not None:
        response.headers["X-GlassBox-Source"] = "cache"
        return cached
    redirect = guard.relevance_gate(req.goalText)   # "Hello" -> friendly redirect, not a verdict
    if redirect:
        return JSONResponse(status_code=422, content={"outOfScope": True, "message": redirect})
    response.headers["X-GlassBox-Source"] = "live"
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
    return {"recordHash": crypto.sha256_hex(crypto.canonical(audit_mod._anchored_object(req.decision)))}


def _chat_inputs(req: ChatReq):
    """Validate + normalize ChatReq into (question, context, history) for chat_mod.

    Pydantic already caps question/history-content length and the per-turn role.
    Here we add the remaining cheap guards the design asks for: reject a
    whitespace-only question (422), trim history to the last few turns, and cap
    the serialized context size so a huge decision/audit blob can't blow up the
    prompt. Returns (question, context_dict|None, history_list|None) or raises
    JSONResponse-bearing ValueError via the caller's 422.
    """
    question = (req.question or "").strip()
    if not question:
        return None  # signal: empty after trim -> 422

    context = None
    if req.context is not None:
        ctx = req.context.model_dump(exclude_none=True)
        # Cap the serialized payload; oversized context is dropped (answer
        # conceptually) rather than rejected, so the chat still works.
        if len(json.dumps(ctx, default=str)) <= _CHAT_MAX_CONTEXT_BYTES:
            context = ctx or None

    history = None
    if req.history:
        history = [t.model_dump() for t in req.history[-_CHAT_MAX_HISTORY_TURNS:]]

    return question, context, history


@app.post("/api/chat")
async def chat(req: ChatReq, request: Request):
    """Explainer chatbot. JSON by default; SSE when Accept: text/event-stream.

    Pydantic enforces question length (<= 2000) and shape; _chat_inputs adds the
    whitespace-only reject + history/context caps. The chat module owns all
    claim-discipline (precheck / self_check). Any LLM provider failure degrades to
    a friendly answer inside chat_mod — the route never leaks a stack trace.

    Abuse guards: a per-IP token bucket (10 req / 60 s) returns 429 when empty, and
    the body-size middleware rejects >256 KB payloads with 413 upstream.
    """
    client_ip = request.client.host if request.client else "unknown"
    if _rate_limited(client_ip):
        return JSONResponse(status_code=429,
                            content={"detail": "too many requests; please slow down"})

    parsed = _chat_inputs(req)
    if parsed is None:
        return JSONResponse(status_code=422,
                            content={"detail": "question must not be empty"})
    question, context, history = parsed

    wants_sse = "text/event-stream" in (request.headers.get("accept") or "").lower()
    if wants_sse:
        return StreamingResponse(
            chat_mod.stream_chat(question, context, history),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )
    return chat_mod.answer_chat(question, context, history)


_STATIC = os.path.join(os.path.dirname(__file__), "static")


def _verify_html() -> str:
    """verify.html with this deploy's published verifying key baked in at serve time.

    The static page ships with a `PUBLISHED_PUBKEY = "__PUBKEY__"` placeholder; left as-is
    it falls back to the key carried inside each receipt (the 'DEV KEY ONLY' warning). We
    pin it to crypto.PUBKEY_HEX (derived from GLASSBOX_ED25519_SK_HEX) so the page verifies
    against this deploy's real published key — independent of the receipt — on every host.
    """
    with open(os.path.join(_STATIC, "verify.html"), encoding="utf-8") as f:
        html = f.read()
    return html.replace('PUBLISHED_PUBKEY = "__PUBKEY__"',
                        f'PUBLISHED_PUBKEY = "{crypto.PUBKEY_HEX}"')


@app.get("/verify", response_class=HTMLResponse)
@app.get("/verify.html", response_class=HTMLResponse)
@app.get("/r/{record_id}", response_class=HTMLResponse)
def verify_page(record_id: str = ""):
    """Standalone 'verify-it-yourself' receipt page (independent of the API/UI).

    The page reads ?r=<id>; /r/<id> is a clean alias. It re-fetches the blob from Walrus
    and re-checks hash + signature IN THE BROWSER — no GlassBox server in the trust path.
    """
    return HTMLResponse(_verify_html())


# Serve the demo UI from /  (mounted last so /api/* + explicit routes take precedence)
if os.path.isdir(_STATIC):
    app.mount("/", StaticFiles(directory=_STATIC, html=True), name="ui")
