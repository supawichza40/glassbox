"""Canonicalisation, ed25519 signing (ORIGIN), and AES-GCM crypto-erasure.

The signing key lives in server/.keys/ (gitignored). PUBKEY_HEX is public and
gets published so anyone can independently verify a record's signature.
"""
import base64
import hashlib
import json
import os
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

_KEYS = Path(__file__).resolve().parents[1] / ".keys"
_SK_PATH = _KEYS / "ed25519_sk.bin"


def _load_or_create_sk() -> Ed25519PrivateKey:
    # 1) Env var wins — REQUIRED on ephemeral hosts (Heroku/Render/Fly) whose disk is
    #    wiped on every restart. Keeps the published pubkey stable so verification keeps working.
    sk_hex = os.getenv("GLASSBOX_ED25519_SK_HEX", "").strip()
    if sk_hex:
        return Ed25519PrivateKey.from_private_bytes(bytes.fromhex(sk_hex))
    # 2) Local persistent file (dev).
    _KEYS.mkdir(exist_ok=True)
    if _SK_PATH.exists():
        return Ed25519PrivateKey.from_private_bytes(_SK_PATH.read_bytes())
    sk = Ed25519PrivateKey.generate()
    _SK_PATH.write_bytes(sk.private_bytes(
        serialization.Encoding.Raw, serialization.PrivateFormat.Raw,
        serialization.NoEncryption()))
    return sk


_SK = _load_or_create_sk()
PUBKEY_HEX = _SK.public_key().public_bytes(
    serialization.Encoding.Raw, serialization.PublicFormat.Raw).hex()


def canonical(obj) -> bytes:
    """Deterministic JSON: sorted keys, no whitespace. The exact bytes we hash/sign."""
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sign_hex(data: bytes) -> str:
    return _SK.sign(data).hex()


def verify_sig(data: bytes, sig_hex: str, pubkey_hex: str) -> bool:
    try:
        Ed25519PublicKey.from_public_bytes(bytes.fromhex(pubkey_hex)).verify(
            bytes.fromhex(sig_hex), data)
        return True
    except Exception:
        return False


def encrypt(plaintext: str) -> dict:
    """AES-GCM. Destroying keyB64 (crypto-erasure) makes the ciphertext unrecoverable."""
    key = AESGCM.generate_key(bit_length=256)
    nonce = os.urandom(12)
    ct = AESGCM(key).encrypt(nonce, plaintext.encode("utf-8"), None)
    return {"keyB64": base64.b64encode(key).decode(),
            "nonceB64": base64.b64encode(nonce).decode(),
            "ctB64": base64.b64encode(ct).decode()}
