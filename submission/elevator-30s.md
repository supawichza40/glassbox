# 30-second elevator blurb

**Spoken version (~30s):**

> "AI is making more financial decisions — but the record of *what* it decided is just a log the operator can quietly edit afterward. GlassBox fixes that. Two AI agents debate a trade over real market data, a risk arbiter calls it, and we sign that decision and anchor it on Sui via Walrus. The magic: anyone can verify it on their *own* phone — scan a QR, and your browser re-checks the signature against our published key, no GlassBox server involved. Change one character of the record and it instantly screams TAMPER DETECTED. We're not selling that the AI is *right* — we're proving that no one can rewrite what it decided."

**One-liner (for chat / a slide):**
> GlassBox — change one character of an AI's signed decision and it breaks, verified on your own phone against a network we don't control. Tamper-evident accountability for AI financial decisions.

**Judge Q&A — the three honest answers to have ready:**
- *"Is this tamper-proof?"* → No — **tamper-evident**. We can't stop someone editing a copy; the instant they do, it stops matching what was signed and anchored.
- *"Does it prove the decision is good?"* → No. It's an **evidence layer** — it proves *what* was decided, on *what* inputs, and that it's unaltered. Signal Strength is a mechanical formula, not a profit forecast.
- *"What's actually on-chain?"* → The Walrus blob's **registration object on Sui** + its storage epoch — an independent reference on a network we don't control. Not a wall-clock timestamp, not a dedicated anchor tx (that's roadmap).
