"""Demo cache — stage safety.

With DEMO_MODE on, the canonical pitch question returns a pre-baked, flawless Decision
INSTANTLY and deterministically (no 6-10s wait, no LLM variance, no rate-limit risk on
stage). Any other question falls through to the live pipeline. Generate the cache with
`python3 -m glassbox.seed_demo` (ideally with GEMINI_MODEL_SMART=gemini-2.5-pro for the
crispest reasoning), then present with DEMO_MODE=1.
"""
import json
from pathlib import Path

from . import config

_CACHE_FILE = Path(__file__).resolve().parent / "demo_cache.json"


def _norm(s: str) -> str:
    return " ".join((s or "").lower().split())


def load_cache() -> dict:
    if _CACHE_FILE.exists():
        try:
            return json.loads(_CACHE_FILE.read_text())
        except Exception:
            return {}
    return {}


def lookup(goal: str):
    """A cached Decision if DEMO_MODE is on and this goal was pre-baked, else None."""
    if not config.DEMO_MODE:
        return None
    return load_cache().get(_norm(goal))


def save(goal: str, decision: dict) -> None:
    cache = load_cache()
    cache[_norm(goal)] = decision
    _CACHE_FILE.write_text(json.dumps(cache, indent=2))
