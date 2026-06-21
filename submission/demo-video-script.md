# GlassBox — Demo Video Script (slides + live demo, shot-by-shot)

**Target length: ~2.5–3 min** (matches the finale pitch window). **Build only with AI** entry · Team *The Start of a Joke*.
Slides referenced are the 10-slide deck in `deck/` (`glassbox-deck.html`). **Claim discipline:** say *tamper-evident*, never "tamper-proof"; never promise PnL; Signal Strength is mechanical, not a profit probability.

## Before you hit record (5-min setup)
1. **Run it locally in DEMO_MODE** for a flawless, instant, deterministic take (no cold-start, no live-API risk):
   ```bash
   cd server && python3 -m glassbox.seed_demo            # bake the canonical Decision
   DEMO_MODE=1 GEMINI_API_KEY=<key> python3 -m uvicorn glassbox.main:app --port 8787
   # open http://localhost:8787/?present   (present = bigger type for video)
   ```
   *(If you'd rather film the deployed app, pre-warm the Render URL first — the free plan cold-starts ~30s.)*
2. Have the **verify page** ready in a second tab: `http://localhost:8787/verify` (and the QR visible).
3. Screen-record at 1080p, quiet room, mic check. Cursor visible. Slides full-screen.
4. Pre-type the question so you don't fumble: **"Should I hold SUI for the next 2 weeks? I'm moderate risk."**

---

## The script  (SHOW = what's on screen · SAY = narration, verbatim)

| Time | SHOW | SAY (read this) |
|---|---|---|
| **0:00–0:18** | **Slide 1** (title) | "This is **GlassBox**. AI is starting to make financial decisions — but the *record* of what it decided is just a log the operator can quietly edit. GlassBox makes that record **tamper-evident**, and lets anyone verify it themselves." |
| **0:18–0:38** | **Slide 2** (the problem) | "When an AI says *buy* and it goes wrong, three questions have no answer: did it really say that, was the record changed afterward, and *why* did it decide that? Regulators already demand trustworthy, time-ordered records — SEC 17a-4, MiFID II. An editable log doesn't meet that bar." |
| **0:38–0:55** | **Slide 3** (the flow) | "Here's how it works. A **Bull** and a **Bear** agent debate over five *computed* market features; a risk arbiter resolves a verdict. The agents reason, the code computes every number, and the chain keeps it honest." |
| **0:55–1:05** | **App** — type the question, click **Analyze** | "Let's run it live. *Should I hold SUI for two weeks, moderate risk?*" |
| **1:05–1:25** | The **Bull/Bear debate** + verdict render | "The two agents argue using **only** the frozen numbers — trend, RSI, volatility, DeepBook liquidity, drawdown — each citing a specific figure. The arbiter lands a **verdict** and a **Signal Strength**. That's not a profit forecast — it's *how decisive the evidence was*." |
| **1:25–1:38** | Click **Prove it** → the proof receipt | "Now we make it accountable. The decision is **ed25519-signed** and written to **Walrus**, which registers a real **on-chain Sui object** — an independent anchor." |
| **1:38–1:52** | Open the **verify page / show the QR** (scan on phone if filming a phone) | "And here's the part that matters — **verify it yourself**. Scan this and *your own phone* re-fetches the record from Walrus, recomputes the fingerprint, and checks the signature against our published key — **with no GlassBox server in the loop**." |
| **1:52–1:58** | **VERIFIED** state | "Verified — byte for byte." |
| **1:58–2:12** | **Edit one character** of the record → **TAMPER DETECTED** (let it sit) | "Now watch. I change **one character** of the signed record… and it's caught. **TAMPER DETECTED** — the fingerprint no longer matches what was anchored. *No one can quietly rewrite what the AI decided — not even the fund being audited.*" |
| **2:12–2:30** | **Slide 5** then **Slide 6** | "This is live on Walrus testnet, with a standalone verifier anyone can run offline. And we're precise about the claim: it's tamper-**evident**, not tamper-proof. We prove *what* the AI decided and that nobody altered it — **not** that the call is correct." |
| **2:30–2:48** | **Slide 7** (bounties) → **Slide 10** (closing) | "One product, across **Sui, BGA, and *codeplain** — built spec-first from a `.plain` file. We're not selling that the AI is *right*. We're selling that **no one can quietly edit what it decided.** That's GlassBox." |

**End on Slide 10** (the closing line) or freeze on the red **TAMPER DETECTED** frame.

---

## If you only have 60 seconds (alt cut)
Slide 1 hook (8s) → Analyze + one line on the debate (15s) → **Prove it → VERIFIED → edit one char → TAMPER DETECTED** (30s, the whole point) → closing line on Slide 10 (7s).

## Recording & safety tips
- **The tamper flip is the money shot** — slow down, let VERIFIED → TAMPER DETECTED breathe for ~2s each. Consider a subtle zoom on the fingerprint.
- Film the **verify on a real phone** if you can — "on the judge's own device" is the differentiator; it's far more convincing than a second browser tab.
- DEMO_MODE makes the canonical question instant and identical every take — use it; do a second take on a *live* question only if it's snappy.
- Keep total **under 3 min**. Upload unlisted/public (YouTube/Loom), confirm it **plays logged-out**, paste the link into the submission form (`form-answers.md` → "Link to Demo Video").
- This is the **recorded fallback** too — if the live demo dies on stage at the finale, play this.
