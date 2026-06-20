"""Independent-timestamp anchor (Tier 2 — OFF by default).

Origin (ed25519 signature) and storage (Walrus) work *without* this. The anchor adds an
*independent timestamp* — evidence the record existed by time T on a clock GlassBox does
not control. Selected by ANCHOR in .env:

  none  (default)  -> no anchor; signature + Walrus only. This is the fully-tested path.
  sui              -> publish the record hash on Sui for an on-chain timestamp.
                      REQUIRES a funded Sui testnet wallet (SUI_PRIVATE_KEY) and
                      `pip install pysui`. This is a SCAFFOLD: implement `_anchor_sui`
                      and verify it against a funded wallet before relying on it on stage.

Any error degrades to None, so an anchor problem can never break the audit/demo path.
"""
from . import config


def anchor_hash(record_hash: str):
    """Return {anchorTxDigest, anchorTimestamp, anchorNetwork} or None if not anchored."""
    mode = config.ANCHOR or "none"
    if mode == "none":
        return None
    try:
        if mode == "sui":
            return _anchor_sui(record_hash)
    except Exception:
        # An anchor failure must never break signing/storage — degrade to "no anchor".
        return None
    return None


def _anchor_sui(record_hash: str):
    """Publish `record_hash` on Sui for an independent timestamp.

    SCAFFOLD — not yet verified. Intended approach (no Move deploy needed): build a
    programmable transaction that commits `record_hash` as a pure input (or emits an
    event from a small published anchor module), execute it with the funded wallet, and
    return {"anchorTxDigest": digest, "anchorTimestamp": <checkpoint ts>,
    "anchorNetwork": "sui:testnet"}. Verify the digest resolves on a Sui explorer before
    trusting it. Until implemented + tested against a funded wallet, this returns None.
    """
    if not config.SUI_PRIVATE_KEY:
        return None
    # pysui is an optional dependency — import lazily so the default path needs nothing.
    from pysui import (  # noqa: F401  (scaffold; wired, not yet used)
        SuiConfig,
        SyncClient,
    )

    raise NotImplementedError(
        "Sui anchor scaffold — needs a funded testnet wallet to implement + verify"
    )
