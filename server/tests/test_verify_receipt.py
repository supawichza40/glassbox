"""Guards the public 'verify-it-yourself' receipt: the exact chain the browser page checks.

Mirrors verify.html in Python so CI catches any drift between the baked receipt, the
canonicalization, the signature, and the published key embedded in the page.
"""
import json
from pathlib import Path

import pytest

from glassbox import crypto

_STATIC = Path(__file__).resolve().parents[1] / "glassbox" / "static"
_LATEST = _STATIC / "receipts" / "latest.json"


def _latest():
    return json.loads(_LATEST.read_text()) if _LATEST.exists() else None


def test_baked_receipt_exists():
    rec = _latest()
    assert rec, "no baked receipt — run: AUDIT_SINK=walrus python -m glassbox.bake_receipt"
    for k in ("recordHash", "signature", "pubkey", "recordCanonical"):
        assert rec.get(k), f"receipt missing {k}"


def test_canonical_bytes_hash_to_recordhash():
    rec = _latest()
    if not rec:
        pytest.skip("no baked receipt")
    body = rec["recordCanonical"].encode("utf-8")
    assert crypto.sha256_hex(body) == rec["recordHash"]


def test_signature_verifies_with_published_key():
    rec = _latest()
    if not rec:
        pytest.skip("no baked receipt")
    body = rec["recordCanonical"].encode("utf-8")
    assert crypto.verify_sig(body, rec["signature"], rec["pubkey"]) is True


def test_tamper_breaks_hash_and_signature():
    rec = _latest()
    if not rec:
        pytest.skip("no baked receipt")
    s = rec["recordCanonical"]
    tampered = (s[:-1] + ("x" if s[-1] != "x" else "y")).encode("utf-8")
    assert crypto.sha256_hex(tampered) != rec["recordHash"]
    assert crypto.verify_sig(tampered, rec["signature"], rec["pubkey"]) is False


def test_verify_page_published_key_matches_install():
    page = (_STATIC / "verify.html").read_text()
    assert crypto.PUBKEY_HEX in page, (
        "verify.html PUBLISHED_PUBKEY does not match this install's signing key — "
        "re-run bake_receipt and patch the constant"
    )
