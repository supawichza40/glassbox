"""Live use-case gallery — watch GlassBox answer a variety of real user questions.

Sends the queries to your RUNNING server (real LLM + live SUI feed), so you see actual
verdicts, real market numbers, and how off-topic input is redirected. Start the server
first, then run this from server/ (in the venv), in a second terminal:

    DEMO_MODE=1 python3 -m uvicorn glassbox.main:app --port 8787   # terminal 1
    .venv/bin/python -m glassbox.usecases                         # terminal 2

Point elsewhere with GLASSBOX_URL (default http://localhost:8787). Takes ~1 min — most
queries are live LLM calls. (Unlike tests/test_scenarios.py, this is a demo, not pass/fail.)
"""
import os
import time

import requests

BASE = os.getenv("GLASSBOX_URL", "http://localhost:8787")

# (question, risk band, short label of the use-case)
QUERIES = [
    ("Should I hold SUI for the next 2 weeks?", "moderate", "cautious hold"),
    ("Is now a good time to buy SUI? I can take more risk.", "high", "aggressive buy"),
    ("I'm risk-averse — should I avoid SUI right now?", "low", "risk-averse"),
    ("Should I take some profit on my SUI position?", "moderate", "take profit"),
    ("What's the outlook for SUI over the next month?", "high", "longer horizon"),
    ("Hello", "moderate", "greeting (off-topic)"),
    ("What's the weather in London today?", "moderate", "off-topic question"),
    ("Write me a poem about cats", "moderate", "off-topic request"),
]


def _trim(s, n=86):
    s = " ".join(str(s).split())
    return s if len(s) <= n else s[: n - 1] + "…"


def main():
    try:
        prov = requests.get(f"{BASE}/api/health", timeout=5).json().get("provider", "?")
    except Exception:
        print(f"Could not reach GlassBox at {BASE}. Start the server first:\n"
              f"  cd server && DEMO_MODE=1 python3 -m uvicorn glassbox.main:app --port 8787")
        return
    print(f"\nGlassBox — live use-case gallery   (server: {BASE}, provider: {prov})")
    print("=" * 80)
    for goal, risk, label in QUERIES:
        t0 = time.time()
        try:
            r = requests.post(f"{BASE}/api/analyze",
                              json={"goalText": goal, "risk": risk}, timeout=90)
        except Exception as e:
            print(f"\n▶ {label}: request failed: {e}")
            continue
        dt = time.time() - t0
        print(f"\n▶ {label}   [risk={risk}]   ({dt:.1f}s)")
        print(f"  Q: {goal}")
        if r.status_code == 422:
            body = r.json()
            if body.get("outOfScope"):
                print(f"  → OFF-TOPIC, redirected: {_trim(body['message'])}")
            else:
                print(f"  → rejected (validation): {_trim(body)}")
            continue
        d = r.json()
        i = d.get("inputs", {})
        print(f"  → {d['verdict']}   signal {d['signalStrengthPct']}% ({d['signalBand']})"
              f"   size {d['suggestedSizePct']}%")
        print(f"     market: SUI ${i.get('priceUsd')} · RSI {i.get('rsi14')} · "
              f"vol%ile {i.get('realizedVolPercentile')} · drawdown {i.get('drawdownFromHighPct')}%")
        print(f"     bull:  {_trim(d['bull']['points'][0])}")
        print(f"     bear:  {_trim(d['bear']['points'][0])}")
        print(f"     why:   {_trim(d.get('whyResolved', ''))}")
    print("\n" + "=" * 80)
    print("Note: questions about the SAME market at the SAME time give a consistent read —")
    print("the verdict reflects SUI's market, not the wording. Risk band drives the size.")


if __name__ == "__main__":
    main()
