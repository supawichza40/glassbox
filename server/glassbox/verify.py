"""Verify an AuditRecord: refetch the bytes, recompute the hash, check the signature.

Returns hashMatch (was it altered?) + signatureValid (did GlassBox sign it?).
When a blobId is present it fetches from Walrus (independent of the client);
otherwise it falls back to the local canonical bytes (demo/offline).
"""
import requests

from . import config, crypto


def verify(audit: dict) -> dict:
    blob_id = audit.get("blobId")
    fetched = None
    source = "local"
    if blob_id:
        try:
            r = requests.get(f"{config.WALRUS_AGGREGATOR}/v1/blobs/{blob_id}", timeout=120)
            r.raise_for_status()
            fetched = r.content
            source = "walrus"
        except Exception:
            fetched = None
    if fetched is None:
        fetched = (audit.get("_canonical") or "").encode("utf-8")

    return {
        "hashMatch": crypto.sha256_hex(fetched) == audit.get("recordHash"),
        "signatureValid": crypto.verify_sig(fetched, audit.get("signature", ""), audit.get("pubkey", "")),
        "source": source,
        "blobId": blob_id,
    }
