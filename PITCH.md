# GlassBox — Pitch

**Tamper-evident accountability for AI financial decisions.**

> Team "The Start of a Joke" — Supavich + Orestis · Encode Vibe Coding Hackathon, London
> Format: 2–3 min pitch + judge Q&A · Live demo against real services (FastAPI + Gemini 2.5 Flash + Walrus/Sui + DeepBook + CoinGecko)

---

## The one line (say it twice — open and close)

> **"We're not selling that the AI is right. We're selling that no one can quietly edit what it decided — and prove it."**

---

## 1. The opening line (first 10 seconds)

> *"In 2024, Knight Capital's spiritual heirs are everywhere: AI systems now make financial calls at machine speed. When one goes wrong — a model dumps a position, a fund loses millions — the regulator asks one question: **why did it decide that, and can you prove the record wasn't changed afterward?** Today, for almost every AI in finance, the honest answer is: **no.** The reasoning is gone, and the log lives on a server the firm controls."*

Delivered cold. No "Hi, we're team X." The judge should feel the gap before they know what we built.

---

## 2. The full spoken script (2:45 target — write to 30s under a 3:00 limit)

> **Format:** S = Supavich, O = Orestis. Hand-offs are marked. The **demo is the hero**; slides are the frame. Narrate the action, never read the slide.

---

### [0:00–0:20] HOOK — *Supavich, no slides yet / title slide up*

**S:** "In 2024, AI systems started making real financial decisions at machine speed. So here's the question every regulator is now asking: when an AI moves money and it goes wrong — *why* did it decide that, and can you prove the record wasn't edited after the fact? For almost every AI in finance, the answer today is **no**. The reasoning evaporates, and the audit log sits on a server the firm itself controls."

*(pause — one beat)*

---

### [0:20–0:40] INSIGHT — *Supavich · slide: "Everyone is validating the model. No one is protecting the record."*

**S:** "Everyone in this space is racing to make the AI *smarter* or *more accurate*. We think that's the wrong fight for the auditor. The thing that actually breaks in court isn't whether the model was right — it's that **no one can prove what the model said and when**. So we built the opposite of a black box. We built a **GlassBox**: a tamper-evident record of every AI financial decision, anchored to a network the firm doesn't control."

---

### [0:40–1:00] SOLUTION — *Supavich · slide: the one-sentence architecture*

**S:** "Here's how it works in one sentence: an AI debate produces a decision, we **cryptographically sign it to prove origin** and store it on **Walrus** — which **registers it as a real on-chain object on Sui** — so anyone can later verify the record is exactly what was produced, unaltered. Let me show you, live. Orestis."

*(hand-off — S steps back, O takes the keyboard)*

---

### [1:00–1:25] DEMO PART 1 — the decision · *Orestis driving*

**O:** "I'm a portfolio analyst. I type a plain-English goal — *'grow my SUI position over the next month, medium risk'* — and pick a risk tolerance. GlassBox runs a **Bull agent and a Bear agent** over five real market features for SUI/USDC. Watch — they actually **argue**: the Bull makes its case, the Bear rebuts it, one round each."

*(let the argument render — point at it, don't read it)*

**O:** "Then a **Risk Arbiter** resolves the debate into a verdict — here, **HOLD** — with a mechanical **Signal Strength**. Important: that's a measure of *how strong the agreement is*, **not** a probability of profit. And critically, it gives us a **counterfactual** — *'what would have flipped this to BUY'* — and **named blind-spots** the model admits it can't see. That's the accountability surface."

---

### [1:25–2:05] DEMO PART 2 — the wow · *Orestis driving, this is the moment*

**O:** "Now the part that matters. I click **Prove it**. GlassBox hashes the full decision, **signs it with an ed25519 key** — that proves *GlassBox* produced it — and writes it to **Walrus**, which **registers it as a real object on Sui** you can open on the explorer."

*(beat)*

**O:** "I click **Verify** — it reads the record back from the chain... **MATCH**. The decision is intact."

*(let MATCH land — pause)*

**O:** "Now I'm a bad actor. Here's the actual signed record — I'll **edit just one character of it**, the way someone might quietly doctor a log after a loss."

*(edit a character — let the fingerprint turn red)*

**O:** "**TAMPER DETECTED** — instantly. Its fingerprint no longer matches what's anchored on Sui. One character, and it's caught — on a network the firm doesn't control."

**O:** "And you don't have to take my word for it —"

*(hand-off back)*

---

### [2:05–2:25] PROOF FOR THE ROOM — *Supavich · slide: QR code, big*

**S:** "— scan this QR. It pulls the record we just created straight off Walrus, and you can verify the signature and the on-chain Sui object **yourselves**, right now, from your phones. We're not asking you to trust us. That's the entire point of the product."

---

### [2:25–2:45] IMPACT + ASK — *Supavich · slide: the metric + the ask*

**S:** "The honest scope: the anchor proves the record wasn't **altered** and **when** it existed — not that the inputs were truthful or the decision correct. That's the auditor's missing layer, and it's **designed to map to** SEC Rule 17a-4 audit-trail and MiFID II RTS 6 logging requirements.

The whole pipeline — debate, sign, store, anchor, verify — runs **live, end to end, against real services**, not slideware. We're 'The Start of a Joke,' and the punchline is serious: **we're not selling that the AI is right. We're selling that no one can quietly edit what it decided — and prove it.** That's the compliance layer every AI-in-finance team is about to need. Thank you."

*(close on the one line — that's what we want repeated in deliberation)*

---

**Timing discipline:** rehearse to **2:45**. If running long, cut the SEC/MiFID sentence in [2:25] to "designed to map to the audit-trail rules regulators already enforce." Never cut the MISMATCH beat or the QR.

**Hand-off seams (rehearse these):**
- [1:00] S → O on "Let me show you, live. Orestis." (S physically steps back from keyboard)
- [2:05] O → S on "you don't have to take my word for it —" (S already has QR slide up)
- Golden rule: while the demo is on screen, the speaker narrates the *action*, never the slide.

---

## 3. Deck outline (10 slides — one idea each, readable in 3 seconds)

1. **TITLE** — "GlassBox: tamper-evident accountability for AI financial decisions." + the one line, small.
2. **THE HOOK** — "An AI moved the money. The regulator asked *why*. Nobody could prove it." (one sentence, 60pt)
3. **THE INSIGHT** — "Everyone is validating the model. No one is protecting the record." (split, big)
4. **THE SOLUTION** — one-sentence flow: *Debate → Sign → Walrus → Anchor on Sui → Verify.* (5 icons, arrow)
5. **HOW IT DECIDES** — "Bull vs Bear, one rebuttal, Risk Arbiter → verdict + Signal Strength + counterfactual + blind-spots." (visual of the debate)
6. **[LIVE DEMO]** — single word "DEMO" / black slide. Get out of the demo's way.
7. **THE WOW** — "VERIFIED → edit one character → **TAMPER DETECTED.** The fingerprint breaks live." (the two states, side by side)
8. **WHAT THE PROOF MEANS** — "Signature = origin. On-chain Sui object = non-alteration + an independent reference." (and the honest caveat, one line, smaller)
9. **THE METRIC / SCAN IT** — big QR. "Verify this exact record yourself — right now." (the one memorable proof)
10. **WHY NOW + ASK** — "Designed to map to SEC 17a-4 + MiFID II RTS 6. The evidence layer every AI-in-finance team is about to need." + one line each: built on **Sui + DeepBook + Walrus**, **codeplain** spec-first, transparency-first for **BGA**. Close on the one line.

> Design rules: one idea per slide, metric/verdict in 80pt, no slide read over the live demo, never the word "tamper-proof" anywhere on a slide.

---

## 4. Judge Q&A objection bank (one confident sentence each — no defensiveness, redirect to a strength)

**"Isn't this just a log file? Why a blockchain?"**
A log file lives on a server the auditee controls and can rewrite silently; the Sui anchor gives an *independent* timestamp on a network they *don't* control — that independence is the whole product, and it's exactly what an auditor needs.

**"Is this real, or is the demo faked?"**
Fully real and end-to-end live — the debate runs on Gemini 2.5 Flash over **live CoinGecko + DeepBook** market data, the signature is real ed25519, and the record is stored on Walrus which **registers it as a real on-chain Sui object**; scan the QR and verify it from your own phone — that's why we built the verify path for *you*, not us.

**"What's actually novel here?"**
Plenty of people are validating AI models; we're the first to treat the *decision record* as the regulated artifact — a tamper-evident, independently-timestamped evidence layer for AI financial decisions, mapped to audit rules that already exist.

**"Isn't a BUY/AVOID verdict regulated financial advice?"**
We're an evidence and accountability layer, not an advisor — GlassBox doesn't tell *you* what to do; it makes whatever an AI *already* decided provable and unalterable, which is the compliance side of the problem, not the recommendation side.

**"Where's your edge / does it make money?"**
We deliberately don't pitch returns — our customer is the compliance and risk team at any firm running AI in finance, and they pay for defensibility, not alpha; the edge is being the audit-trail standard for AI decisions before the regulation forces everyone to have one.

**"Does it scale?"**
The decision is the expensive part and it's just an API call; signing and anchoring are cheap and Walrus is built for decentralized storage at scale — we anchor a hash, not the payload, so cost-per-record stays flat as volume grows.

**"What's the honest limitation?"**
The anchor proves the record wasn't *altered* and *when it existed* — it does **not** prove the inputs were truthful or the decision correct; we say "tamper-**evident**," never "tamper-proof," and that honesty is exactly what makes it credible to an auditor.

**"What would you do with another week?"**
We already read live **DeepBook** depth/spread — next is an *audited* DeepBook execution path (manual-confirm, capped), a batch-anchoring mode for high-frequency decision streams, and a one-click auditor export that maps each record to the specific 17a-4 / RTS 6 clause it satisfies.

---

## Claim-discipline checklist (for the speakers — internalize, never break on stage)

- Say **"tamper-evident"** — never "tamper-proof," "provable to anyone," or "impossible to fake."
- **Signature = origin** ("GlassBox produced this"). **The on-chain Sui object = non-alteration + an independent on-chain reference (a Sui epoch).** Independence comes from *the chain*, not the key.
- It's an **evidence layer** — not model validation, not a compliance *guarantee*. Say "**designed to map to**" 17a-4 / RTS 6.
- **Never** pitch returns / PnL / "it makes money." Pitch transparency + accountability.
- State the caveat, don't hide it: anchor proves non-alteration + timestamp, **not** that inputs were truthful or the decision correct.
- **Signal Strength is mechanical agreement, NOT probability of profit.**
- Stay **monogamous on stage**: Sui/Walrus + the live proof. Never say "5 bounties." Solvimon + FLock = one deck line, not a talking point.
