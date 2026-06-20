# GlassBox — Demo run-sheet (the can't-die playbook)

Pairs with `PITCH.md` (the spoken script). Goal: the live demo **cannot fail on stage**.

## Pre-stage checklist (do on strong Wi-Fi, before you present)
- [ ] **Rotate / confirm the LLM key** in `.env` (a funded Gemini key, or `LLM_PROVIDER` + key of choice). For the crispest cached reasoning, set `GEMINI_MODEL_SMART=gemini-2.5-pro` *just for the bake*.
- [ ] **Bake the demo cache:** `cd server && python3 -m glassbox.seed_demo` (re-run if you changed the canonical question or the model). Confirm `demo_cache.json` updated.
- [ ] **Pre-write a real Walrus blob** for the proof story (optional but nice): run `python3 -m glassbox.audit_smoke` once on good Wi-Fi so a real on-chain record exists you can point to.
- [ ] **Start the server in present + demo mode:**
      `cd server && DEMO_MODE=1 python3 -m uvicorn glassbox.main:app --port 8787`
      then open **http://localhost:8787/?present** (bigger type for the projector).
- [ ] **Record the fallback video** (see below) and have it open in a background tab + on your phone.
- [ ] Phone hotspot ready as a network backup. Laptop on mains power. Notifications off.
- [ ] Hard-refresh the page once so the canonical question is pre-filled.

## The golden path (what you click — ~75s of demo)
1. **Question is pre-filled** ("Should I hold SUI for the next 2 weeks? moderate risk"). Hit **Analyze** (or ⌘↵). With `DEMO_MODE=1` the result is **instant** — the debate + verdict paint in under a second.
2. Gesture across **Bull vs Bear** → land on the **64px verdict** + Signal Strength. *"The AI argued both sides and gave a call — and showed why."*
3. Click **🔒 Prove it** → the **receipt** appears (fingerprint, signature, the **Walrus · Sui** chip). *"It signed this exact decision and wrote it on-chain."*
4. Click **Verify** → big green **VERIFIED**. *"Reads it back — byte-for-byte identical."*
5. Click **Try to alter it** → big red **TAMPER DETECTED** + the **hash diff** (anchored vs tampered, tampered glowing red). **This is the wow.** *"I change one thing the AI decided — and the chain catches it. No one can quietly rewrite it after the fact."*
6. (Optional) QR to the live Walrus record so a judge can verify it themselves.

## Cut list (if time/network is bad, drop in this order)
1. The optional real on-chain Walrus write / QR → rely on the cached path (still honest: "we wrote this earlier; here it is, verifiable").
2. Any live (non-cached) question → stick to the canonical one (`DEMO_MODE`).
3. If the page itself won't load → **play the recorded video** and narrate over it. Don't apologize; cut mid-sentence.

## Record the fallback video (REQUIRED — do this on good Wi-Fi)
A flawless screen capture is your insurance. On macOS:
- `Cmd+Shift+5` → record the browser window → run the golden path above end-to-end, slowly and cleanly → stop → trim dead air → export `demo_fallback.mp4`.
- Also export a short **GIF** of just the **Alter → MISMATCH + hash-diff** beat (the money shot) for the deck/Devpost.
- Keep both open in a background tab AND on your phone. If anything hangs > ~4s live, cut to the video without breaking stride.

## Claim discipline on stage (say these, avoid those)
- Say **"tamper-evident"**, "signed (origin)", "anchored on Sui (non-alteration + timestamp)", "evidence layer".
- Never say "tamper-proof", "provable to anyone", or anything implying a **profit/return**. Pitch *accountability*, not alpha.
- The honest line that pre-empts the toughest question: *"We're not selling that the AI is right — we're selling that no one can quietly edit what it decided."*

## If a judge asks to type their own question
`DEMO_MODE` falls through to the **live** pipeline for non-canonical questions — it works, just takes ~6-10s and the result varies. Fine for Q&A, not for the timed run. (Or keep a second baked question in `seed_demo.py`.)
