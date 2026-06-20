"""End-to-end pipeline tests with mocks: analyze -> audit -> verify.

Exercises the full chain offline:
  * LLM mocked via canned_chat_json (no Gemini/OpenRouter)
  * Walrus disabled via local_sink (audit sink = 'local')
Confirms a clean record MATCHES and a tampered record MISMATCHES.
"""
from glassbox import analyze as analyze_mod, audit as audit_mod, verify as verify_mod


def test_analyze_audit_verify_match_end_to_end(canned_chat_json, local_sink):
    decision = analyze_mod.analyze("save for a house deposit", "SUI/USDC", "moderate")
    assert decision["verdict"] in ("BUY", "HOLD", "AVOID")

    audit = audit_mod.write_audit(decision, goal_text="confidential goal text")
    assert audit["sink"] == "local"
    assert audit["blobId"] is None
    # erasable PII bundle present because a goal_text was supplied
    assert audit["erasable"] is not None
    assert set(audit["erasable"].keys()) == {"keyB64", "nonceB64", "ctB64"}

    result = verify_mod.verify(audit)
    assert result["hashMatch"] is True
    assert result["signatureValid"] is True
    assert result["source"] == "local"


def test_tamper_breaks_verification_end_to_end(canned_chat_json, local_sink):
    decision = analyze_mod.analyze("grow my savings", "SUI/USDC", "moderate")
    audit = audit_mod.write_audit(decision, goal_text="")

    # Tamper with the canonical bytes that verify() will recompute the hash over.
    tampered = dict(audit)
    canonical = tampered["_canonical"]
    # flip the verdict inside the canonical JSON string -> different bytes/hash
    for a, b in (('"verdict":"BUY"', '"verdict":"AVOID"'),
                 ('"verdict":"AVOID"', '"verdict":"BUY"'),
                 ('"verdict":"HOLD"', '"verdict":"BUY"')):
        if a in canonical:
            canonical = canonical.replace(a, b, 1)
            break
    else:
        canonical = canonical + " "  # guarantee a byte change as a fallback
    tampered["_canonical"] = canonical

    result = verify_mod.verify(tampered)
    assert result["hashMatch"] is False        # bytes no longer hash to recordHash
    assert result["signatureValid"] is False   # signature no longer matches bytes


def test_audit_without_goaltext_has_no_erasable(canned_chat_json, local_sink):
    decision = analyze_mod.analyze("save for a house", "SUI/USDC", "low")
    audit = audit_mod.write_audit(decision, goal_text="")
    assert audit["erasable"] is None
    assert verify_mod.verify(audit)["hashMatch"] is True
