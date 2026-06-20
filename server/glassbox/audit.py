"""Audit: canonical hash -> ed25519 sign -> Walrus blob -> AuditRecord.

The anchored object is PII-free (the Decision uses enum inputs, no goal text).
The user's goal text goes into a separate encrypted, crypto-erasable record.
Signature proves ORIGIN; the Sui anchor (Tier 2) proves non-alteration + timestamp.
"""
import requests

from . import anchor as anchor_mod
from . import config, crypto


def _anchored_object(decision: dict) -> dict:
    # Decision already excludes raw goal text (inputs are enums). Anchor as-is.
    return decision


def write_audit(decision: dict, goal_text: str = "", epochs: int = 5) -> dict:
    anchored = _anchored_object(decision)
    body = crypto.canonical(anchored)
    record_hash = crypto.sha256_hex(body)
    signature = crypto.sign_hex(body)

    sink = config.AUDIT_SINK
    blob_id = None
    if sink == "walrus":
        try:
            r = requests.put(f"{config.WALRUS_PUBLISHER}/v1/blobs?epochs={epochs}",
                             data=body, timeout=120)
            r.raise_for_status()
            j = r.json()
            blob_id = (j.get("newlyCreated", {}).get("blobObject", {}).get("blobId")
                       or j.get("alreadyCertified", {}).get("blobId"))
            if not blob_id:
                sink = "local"
        except Exception:
            sink = "local"  # graceful degrade — UI still shows the hash

    anchor = anchor_mod.anchor_hash(record_hash) or {}   # Tier 2; None/{} when ANCHOR=none

    return {
        "recordHash": record_hash,
        "signature": signature,
        "pubkey": crypto.PUBKEY_HEX,
        "sink": sink,
        "blobId": blob_id,
        "anchorTxDigest": anchor.get("anchorTxDigest"),
        "anchorTimestamp": anchor.get("anchorTimestamp"),
        "anchorNetwork": anchor.get("anchorNetwork"),
        "erasable": crypto.encrypt(goal_text) if goal_text else None,
        "_canonical": body.decode("utf-8"),           # kept for local verify/demo only
    }
