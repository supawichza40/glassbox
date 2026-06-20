"""Unit tests for glassbox.crypto — canonicalisation, ed25519, AES-GCM.

All pure / in-process; no mocks, no network.
"""
from glassbox import crypto


# --------------------------------------------------------------------------
# canonical(): byte-identical regardless of key order, no whitespace
# --------------------------------------------------------------------------
def test_canonical_byte_identical_regardless_of_key_order():
    a = crypto.canonical({"b": 1, "a": 2, "c": {"z": 9, "y": 8}})
    b = crypto.canonical({"c": {"y": 8, "z": 9}, "a": 2, "b": 1})
    assert a == b
    assert isinstance(a, bytes)


def test_canonical_has_no_whitespace():
    body = crypto.canonical({"a": 1, "b": [1, 2, {"k": "v"}]})
    assert b" " not in body
    assert b"\n" not in body
    assert b"\t" not in body


def test_canonical_sorted_keys():
    body = crypto.canonical({"zebra": 1, "alpha": 2, "mango": 3})
    assert body == b'{"alpha":2,"mango":3,"zebra":1}'


# --------------------------------------------------------------------------
# sign / verify roundtrip
# --------------------------------------------------------------------------
def test_sign_verify_roundtrip_true():
    data = crypto.canonical({"verdict": "BUY", "n": 42})
    sig = crypto.sign_hex(data)
    assert crypto.verify_sig(data, sig, crypto.PUBKEY_HEX) is True


def test_verify_false_on_altered_bytes():
    data = crypto.canonical({"verdict": "BUY"})
    sig = crypto.sign_hex(data)
    tampered = crypto.canonical({"verdict": "AVOID"})
    assert crypto.verify_sig(tampered, sig, crypto.PUBKEY_HEX) is False


def test_verify_false_on_wrong_pubkey():
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

    data = crypto.canonical({"verdict": "BUY"})
    sig = crypto.sign_hex(data)
    # a different, valid ed25519 public key
    other_pub = Ed25519PrivateKey.generate().public_key().public_bytes(
        serialization.Encoding.Raw, serialization.PublicFormat.Raw).hex()
    assert other_pub != crypto.PUBKEY_HEX
    assert crypto.verify_sig(data, sig, other_pub) is False


def test_verify_false_on_garbage_signature_no_raise():
    """verify_sig swallows exceptions and returns False (never crashes)."""
    data = crypto.canonical({"x": 1})
    assert crypto.verify_sig(data, "not-hex", crypto.PUBKEY_HEX) is False


# --------------------------------------------------------------------------
# encrypt(): non-deterministic ciphertext + required fields
# --------------------------------------------------------------------------
def test_encrypt_has_required_fields():
    enc = crypto.encrypt("my secret goal")
    assert set(enc.keys()) == {"keyB64", "nonceB64", "ctB64"}
    assert all(isinstance(v, str) and v for v in enc.values())


def test_encrypt_different_ciphertext_for_same_plaintext():
    e1 = crypto.encrypt("identical plaintext")
    e2 = crypto.encrypt("identical plaintext")
    # random key + nonce each call -> ciphertext (and key/nonce) differ
    assert e1["ctB64"] != e2["ctB64"]
    assert e1["keyB64"] != e2["keyB64"]
    assert e1["nonceB64"] != e2["nonceB64"]


def test_encrypt_roundtrip_decrypts():
    """Sanity: the bundle is actually decryptable with its own key/nonce."""
    import base64

    from cryptography.hazmat.primitives.ciphers.aead import AESGCM

    plaintext = "save for a house deposit"
    enc = crypto.encrypt(plaintext)
    key = base64.b64decode(enc["keyB64"])
    nonce = base64.b64decode(enc["nonceB64"])
    ct = base64.b64decode(enc["ctB64"])
    out = AESGCM(key).decrypt(nonce, ct, None).decode("utf-8")
    assert out == plaintext


# --------------------------------------------------------------------------
# sha256_hex sanity
# --------------------------------------------------------------------------
def test_sha256_hex_known_vector():
    assert crypto.sha256_hex(b"") == (
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855")
    assert len(crypto.sha256_hex(b"abc")) == 64


def test_pubkey_hex_is_32_byte_hex():
    assert len(crypto.PUBKEY_HEX) == 64
    bytes.fromhex(crypto.PUBKEY_HEX)  # raises if not hex
