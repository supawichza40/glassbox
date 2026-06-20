"""Standalone INDEPENDENT verifier — proves a GlassBox record WITHOUT the GlassBox server.

Given a Walrus blobId + the signature + the published public key, anyone can fetch the
record from Walrus, recompute its fingerprint, and check the signature. This is what makes
"verifiable by anyone" true: the trust comes from the public chain + the published key,
not from GlassBox showing you a green checkmark.

Usage:
    python3 -m glassbox.verify_cli <blobId> <signature_hex> [pubkey_hex]
(pubkey defaults to this install's published key; in the real world you publish it once.)
"""
import sys

import requests

from . import config, crypto


def verify_blob(blob_id: str, signature_hex: str, pubkey_hex: str = None) -> dict:
    pubkey_hex = pubkey_hex or crypto.PUBKEY_HEX
    data = requests.get(f"{config.WALRUS_AGGREGATOR}/v1/blobs/{blob_id}", timeout=60).content
    return {
        "blobId": blob_id,
        "bytes": len(data),
        "recordHash": crypto.sha256_hex(data),
        "signatureValid": crypto.verify_sig(data, signature_hex, pubkey_hex),
        "pubkey": pubkey_hex,
    }


def main():
    if len(sys.argv) < 3:
        print("usage: python3 -m glassbox.verify_cli <blobId> <signature_hex> [pubkey_hex]")
        sys.exit(1)
    r = verify_blob(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)
    print(f"blobId         {r['blobId']}")
    print(f"bytes          {r['bytes']}")
    print(f"recordHash     {r['recordHash']}")
    print(f"pubkey         {r['pubkey'][:32]}…")
    print(f"signatureValid {r['signatureValid']}")
    print("RESULT:", "AUTHENTIC — GlassBox signed exactly this record"
          if r["signatureValid"] else "signature does NOT verify (forged or altered)")
    sys.exit(0 if r["signatureValid"] else 2)


if __name__ == "__main__":
    main()
