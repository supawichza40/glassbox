"""Standalone INDEPENDENT verifier — proves a GlassBox record WITHOUT the GlassBox server.

Given a Walrus blobId + the signature + the published public key, anyone can fetch the
record from Walrus, recompute its fingerprint, and check the signature. This is what makes
"verifiable by anyone" true: the trust comes from the public chain + the published key,
not from GlassBox showing you a green checkmark.

Usage:
    python3 -m glassbox.verify_cli <blobId> <signature_hex> [pubkey_hex] [expected_recordHash]
(pubkey defaults to this install's published key; in the real world you publish it once.
 Pass the anchored recordHash to also get an explicit hashMatch check.)
"""
import sys

import requests

from . import config, crypto


def verify_blob(blob_id: str, signature_hex: str, pubkey_hex: str = None,
                expected_hash: str = None) -> dict:
    pubkey_hex = pubkey_hex or crypto.PUBKEY_HEX
    data = requests.get(f"{config.WALRUS_AGGREGATOR}/v1/blobs/{blob_id}", timeout=60).content
    record_hash = crypto.sha256_hex(data)
    return {
        "blobId": blob_id,
        "bytes": len(data),
        "recordHash": record_hash,
        # hashMatch = the fetched bytes still hash to the anchored fingerprint (None if not provided)
        "hashMatch": (record_hash == expected_hash) if expected_hash else None,
        "signatureValid": crypto.verify_sig(data, signature_hex, pubkey_hex),
        "pubkey": pubkey_hex,
    }


def main():
    if len(sys.argv) < 3:
        print("usage: python3 -m glassbox.verify_cli <blobId> <signature_hex> "
              "[pubkey_hex] [expected_recordHash]")
        sys.exit(1)
    r = verify_blob(sys.argv[1], sys.argv[2],
                    sys.argv[3] if len(sys.argv) > 3 else None,
                    sys.argv[4] if len(sys.argv) > 4 else None)
    print(f"blobId         {r['blobId']}")
    print(f"bytes          {r['bytes']}")
    print(f"recordHash     {r['recordHash']}")
    if r["hashMatch"] is not None:
        print(f"hashMatch      {r['hashMatch']}")
    print(f"pubkey         {r['pubkey'][:32]}…")
    print(f"signatureValid {r['signatureValid']}")
    ok = r["signatureValid"] and (r["hashMatch"] is not False)
    print("RESULT:", "AUTHENTIC — GlassBox signed exactly this record, unaltered"
          if ok else "does NOT verify (forged, altered, or wrong key)")
    sys.exit(0 if ok else 2)


if __name__ == "__main__":
    main()
