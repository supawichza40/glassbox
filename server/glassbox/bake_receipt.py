"""Bake a REAL signed + Walrus-anchored receipt for the public "verify-it-yourself" page.

No LLM needed: reuses the canonical demo Decision, signs it (ed25519), writes the blob to
Walrus (registering an on-chain Sui object), and writes the resulting receipt metadata to
static/receipts/<id>.json + latest.json. The static verify page loads that, then
INDEPENDENTLY re-fetches the blob from Walrus and re-checks hash + signature in the browser.

Run from server/ with the venv:
    AUDIT_SINK=walrus ./.venv/bin/python -m glassbox.bake_receipt
Re-run on good Wi-Fi the night before the demo so the blob is freshly stored.
"""
import json
from pathlib import Path

from . import audit as audit_mod
from . import config

_HERE = Path(__file__).resolve().parent
_DEMO_CACHE = _HERE / "demo_cache.json"
_OUT = _HERE / "static" / "receipts"


def _demo_decision() -> dict:
    """Reuse the canonical pre-baked demo Decision (authentic shape) if present."""
    if _DEMO_CACHE.exists():
        cache = json.loads(_DEMO_CACHE.read_text())
        if isinstance(cache, dict) and cache:
            return next(iter(cache.values()))
    # Minimal fallback decision (PII-free) so a bake always succeeds.
    return {
        "asset": "SUI/USDC", "verdict": "BUY", "winningSide": "bull",
        "whyResolved": "Bull case outweighs bear on trend + liquidity.",
        "signalBand": "Medium", "signalStrengthPct": 54, "suggestedSizePct": 9,
        "riskNote": "High realized vol; size kept small.",
        "counterfactual": "Would flip to AVOID if depth thinned or vol spiked.",
        "blindSpots": ["No live news", "Single venue depth"],
        "bull": {"points": ["Price above 20MA", "Healthy DeepBook depth"],
                 "rebuttal": "Momentum persists.", "convictionRevised": 3},
        "bear": {"points": ["RSI elevated", "Drawdown risk"],
                 "rebuttal": "Pullback likely.", "convictionRevised": 2},
    }


def main() -> None:
    decision = _demo_decision()
    a = audit_mod.write_audit(decision, goal_text="")  # sign + Walrus write (registers Sui object)
    rid = a["recordHash"][:16]
    receipt = {
        "recordId": rid,
        "blobId": a["blobId"],
        "recordHash": a["recordHash"],
        "signature": a["signature"],
        "pubkey": a["pubkey"],
        "suiObjectId": a.get("suiObjectId"),
        "anchorEpoch": a.get("anchorEpoch"),
        "anchorNetwork": a.get("anchorNetwork"),
        "sink": a["sink"],
        "walrusAggregator": config.WALRUS_AGGREGATOR,
        "suiExplorer": config.SUI_EXPLORER,
        "recordCanonical": a["_canonical"],   # exact bytes hashed/signed (PII-free) — fallback + diff base
        "decision": decision,
    }
    _OUT.mkdir(parents=True, exist_ok=True)
    (_OUT / f"{rid}.json").write_text(json.dumps(receipt, indent=2))
    (_OUT / "latest.json").write_text(json.dumps(receipt, indent=2))
    print(f"BAKED receipt {rid}")
    print(f"  sink         {a['sink']}")
    print(f"  blobId       {a['blobId']}")
    print(f"  suiObjectId  {a.get('suiObjectId')}")
    print(f"  anchorEpoch  {a.get('anchorEpoch')}")
    print(f"  -> static/receipts/{rid}.json (+ latest.json)")
    if a["sink"] != "walrus":
        print("  WARNING: sink fell back to local — Walrus write failed; explorer link will be hidden.")


if __name__ == "__main__":
    main()
