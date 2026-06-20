"""End-to-end: analyze -> audit (sign + Walrus) -> verify (MATCH) -> tamper (MISMATCH).
Run from server/:   python3 -m glassbox.audit_smoke
"""
from . import analyze, audit, verify


def main():
    goal = "Should I hold SUI for 2 weeks? Moderate risk."
    print("1) analyze ...")
    d = analyze.analyze(goal)
    print(f"   verdict={d['verdict']}  signal={d['signalStrengthPct']}% ({d['signalBand']})  size={d['suggestedSizePct']}%")

    print("2) audit (sign + Walrus) ...")
    a = audit.write_audit(d, goal_text=goal)
    print(f"   sink={a['sink']}  blobId={a['blobId']}")
    print(f"   recordHash={a['recordHash'][:20]}...  sig={a['signature'][:20]}...  pubkey={a['pubkey'][:20]}...")

    print("3) verify ...")
    v = verify.verify(a)
    print(f"   {v}")
    print("   ->", "✅ MATCH" if v["hashMatch"] and v["signatureValid"] else "❌ FAIL")

    print("4) tamper test (alter the verdict, re-verify) ...")
    tampered = dict(a)
    tampered["_canonical"] = a["_canonical"].replace(
        f'"verdict":"{d["verdict"]}"', '"verdict":"BUY"', 1)
    tampered["blobId"] = None  # verify the altered local copy
    v2 = verify.verify(tampered)
    print(f"   {v2}")
    print("   ->", "✅ MISMATCH detected" if not v2["hashMatch"] else "❌ tamper NOT detected")


if __name__ == "__main__":
    main()
