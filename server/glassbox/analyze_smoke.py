"""End-to-end analyze test against the configured provider.
Run from server/:   python3 -m glassbox.analyze_smoke
"""
import json
import time

from . import analyze


def main():
    goal = "Should I hold SUI for 2 weeks? Moderate risk."
    t = time.time()
    d = analyze.analyze(goal, risk_band="moderate")
    dt = time.time() - t
    print(f"\n=== analyze ran in {dt:.1f}s ===\n")
    print(json.dumps(d, indent=2))


if __name__ == "__main__":
    main()
