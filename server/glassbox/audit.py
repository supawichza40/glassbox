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
    blob_id = sui_object = anchor_epoch = walrus_tx = None
    if sink == "walrus":
        try:
            r = requests.put(f"{config.WALRUS_PUBLISHER}/v1/blobs?epochs={epochs}",
                             data=body, timeout=120)
            r.raise_for_status()
            j = r.json()
            nc = j.get("newlyCreated", {}).get("blobObject", {})
            ac = j.get("alreadyCertified", {})
            blob_id = nc.get("blobId") or ac.get("blobId")
            sui_object = nc.get("id")                                  # on-chain Sui object (anchor)
            anchor_epoch = nc.get("certifiedEpoch") or nc.get("registeredEpoch") or ac.get("endEpoch")
            walrus_tx = (ac.get("event") or {}).get("txDigest")        # cert tx when already-certified
            if not blob_id:
                sink = "local"
        except Exception:
            sink = "local"  # graceful degrade — UI still shows the hash

    anchor = anchor_mod.anchor_hash(record_hash) or {}   # Tier 2 dedicated tx; {} when ANCHOR=none

    return {
        "recordHash": record_hash,
        "signature": signature,
        "pubkey": crypto.PUBKEY_HEX,
        "sink": sink,
        "blobId": blob_id,
        "suiObjectId": sui_object,                                     # Walrus-registered Sui object
        "anchorEpoch": anchor_epoch,
        "anchorTxDigest": anchor.get("anchorTxDigest") or walrus_tx,
        "anchorTimestamp": anchor.get("anchorTimestamp"),
        "anchorNetwork": anchor.get("anchorNetwork") or ("sui:testnet" if sui_object else None),
        "erasable": crypto.encrypt(goal_text) if goal_text else None,
        "_canonical": body.decode("utf-8"),           # kept for local verify/demo only
    }
