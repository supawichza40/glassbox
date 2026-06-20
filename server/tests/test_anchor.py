"""The anchor is OFF by default and must always fail safe (never break audit/demo)."""
from glassbox import anchor, config


def test_anchor_disabled_by_default(monkeypatch):
    monkeypatch.setattr(config, "ANCHOR", "none")
    assert anchor.anchor_hash("abc123") is None


def test_anchor_sui_without_wallet_is_safe(monkeypatch):
    # ANCHOR=sui but no funded wallet -> degrade to None, no crash.
    monkeypatch.setattr(config, "ANCHOR", "sui")
    monkeypatch.setattr(config, "SUI_PRIVATE_KEY", "")
    assert anchor.anchor_hash("abc123") is None


def test_anchor_sui_scaffold_fails_safe(monkeypatch):
    # ANCHOR=sui with a (fake) key -> scaffold raises internally, caught -> None.
    monkeypatch.setattr(config, "ANCHOR", "sui")
    monkeypatch.setattr(config, "SUI_PRIVATE_KEY", "0xdeadbeef")
    assert anchor.anchor_hash("abc123") is None


def test_audit_anchor_fields_present(monkeypatch):
    # write_audit always exposes the anchor fields (None when ANCHOR=none), local sink.
    from glassbox import audit
    monkeypatch.setattr(config, "ANCHOR", "none")
    monkeypatch.setattr(config, "AUDIT_SINK", "local")
    rec = audit.write_audit({"verdict": "HOLD"}, goal_text="")
    assert rec["anchorTxDigest"] is None
    assert "anchorTimestamp" in rec and "anchorNetwork" in rec
