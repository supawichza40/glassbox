"""Pre-bake the canonical demo Decision(s) into demo_cache.json.

Run once before the pitch (tip: set GEMINI_MODEL_SMART=gemini-2.5-pro first for quality):
    cd server && python3 -m glassbox.seed_demo
Then present with DEMO_MODE=1 so the canonical question is instant + deterministic.
"""
from . import analyze, demo

GOALS = [
    ("Should I hold SUI for the next 2 weeks? I'm moderate risk.", "moderate"),
]


def main():
    for goal, risk in GOALS:
        print(f"baking: {goal!r} ...")
        d = analyze.analyze(goal, risk_band=risk)
        demo.save(goal, d)
        print(f"  -> verdict={d['verdict']} signal={d['signalStrengthPct']}% saved to demo_cache.json")
    print("Done. Present with DEMO_MODE=1.")


if __name__ == "__main__":
    main()
