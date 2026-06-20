---
marp: true
paginate: true
size: 16:9
title: GlassBox — tamper-evident accountability for AI financial decisions
---

<style>
:root{
  --bg:#090c12; --surface:#121821; --line:#2a3543;
  --ink:#eef3fa; --ink2:#c0cbda; --muted:#8a97a8;
  --brand:#7c5cff; --bull:#2ed573; --bear:#ff4d5e; --warn:#ffc24d; --accent:#21d4c4;
}
section{
  background:var(--bg); color:var(--ink);
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Inter,sans-serif;
  font-size:26px; line-height:1.5; padding:54px 64px;
}
h1{ color:var(--ink); font-size:62px; letter-spacing:-.02em; margin:0 0 8px }
h2{ color:var(--ink); font-size:38px; letter-spacing:-.01em; margin:0 0 14px }
h3{ color:var(--accent); font-size:22px; text-transform:uppercase; letter-spacing:.12em; margin:0 0 18px }
strong{ color:#fff }
em{ color:var(--ink2); font-style:italic }
a{ color:var(--accent) }
ul{ margin:.2em 0 } li{ margin:.32em 0 }
code{ background:#0e141d; color:var(--accent); padding:1px 7px; border-radius:6px; font-size:.82em }
section::after{ color:var(--muted); font-size:14px }
.tag{ display:inline-block; background:#19212e; border:1px solid var(--line); color:var(--ink2);
      border-radius:999px; padding:4px 14px; font-size:18px; margin:4px 6px 0 0 }
.bull{ color:var(--bull) } .bear{ color:var(--bear) } .buy{ color:var(--bull) } .warn{ color:var(--warn) }
.flow{ display:flex; gap:10px; align-items:stretch; margin-top:22px; font-size:19px }
.flow .b{ flex:1; background:var(--surface); border:1px solid var(--line); border-radius:12px;
          padding:14px 12px; text-align:center }
.flow .b small{ color:var(--muted); display:block; font-size:14px; margin-top:4px }
.flow .arr{ align-self:center; color:var(--muted); font-size:24px }
.match{ color:var(--bull); border-color:var(--bull)!important }
.mismatch{ color:var(--bear); border-color:var(--bear)!important; border-style:dashed!important }
.lead{ color:var(--ink2); font-size:30px }
.kicker{ color:var(--brand); font-weight:700; letter-spacing:.06em; text-transform:uppercase; font-size:18px }
.small{ font-size:19px; color:var(--muted) }
.cols{ display:flex; gap:30px } .cols>div{ flex:1 }
blockquote{ border-left:3px solid var(--brand); margin:18px 0; padding:6px 0 6px 20px; color:var(--ink2); font-size:28px }
table{ font-size:21px; border-collapse:collapse } td,th{ border:1px solid var(--line); padding:8px 12px }
th{ color:var(--accent); text-align:left }
</style>

<!-- _paginate: false -->

<span class="kicker">Encode Vibe Coding Hackathon · London</span>

# GlassBox

## Tamper-evident accountability for AI financial decisions

<span class="lead">Watch two AI agents argue an investing call — then prove the decision they signed **can't be rewritten** after the fact.</span>

<br>

<span class="small">**The Start of a Joke** — Supavich Aussawaauschariyakul · Orestis Kap</span>

<!-- Open with the one line. We're not another AI trading bot — we're the evidence layer that makes an AI's decisions accountable. -->

---

<h3>The problem</h3>

## AI is starting to make financial calls. When it's wrong, three questions have no answer.

- **Did the AI actually say that?** — logs live in a database the operator can quietly edit.
- **Was the record changed afterward?** — a screenshot proves nothing; a mutable log proves nothing.
- **Why** did it decide that — and what did it **miss**?

<br>

Regulators already demand trustworthy, time-ordered records — **SEC Rule 17a-4**, **MiFID II RTS 6**. An AI black box with an editable log doesn't meet that bar.

<!-- Frame the pain in regulator language — this is what compliance judges (BGA, Solvimon) react to. -->

---

<h3>What GlassBox does</h3>

## The agents reason. The code computes the numbers. The chain keeps it honest.

<div class="flow">
  <div class="b"><span class="bull">Bull</span> vs <span class="bear">Bear</span><small>debate + 1 rebuttal</small></div>
  <div class="arr">→</div>
  <div class="b"><span class="buy">VERDICT</span><small>+ Signal Strength</small></div>
  <div class="arr">→</div>
  <div class="b">Sign<small>ed25519 (origin)</small></div>
  <div class="arr">→</div>
  <div class="b">Walrus · Sui<small>stored + anchored</small></div>
  <div class="arr">→</div>
  <div class="b match">Verify ✓<small>byte-for-byte</small></div>
</div>

<br>

Two agents argue over **5 computed market features** (trend, RSI, volatility, DeepBook liquidity, drawdown) — citing **only** those numbers. A Risk Arbiter resolves a **BUY / HOLD / AVOID**, a *mechanical* Signal Strength, a counterfactual, and named blind-spots.

<!-- Signal Strength is mechanical, not a profit prediction. Every gameable number is deterministic Python, never the model. -->

---

<h3>The wow — live</h3>

## Change one character, and the chain catches it.

<div class="flow">
  <div class="b match" style="flex:1.4">VERIFIED ✓<small>re-fetched from Walrus — byte-for-byte identical</small></div>
  <div class="arr">then</div>
  <div class="b mismatch" style="flex:1.4">TAMPER DETECTED ✗<small>flip one field → the fingerprint no longer matches</small></div>
</div>

<br>

```
anchored   3f9a1c… 7b2e
after edit  c0114d… a9f1   ← the record fought back
```

> *"I change one thing the AI decided — and it's caught. No one can quietly rewrite an AI's decision after the fact, not even the fund being audited."*

<!-- This is the demo. Slow down here. The diverging hash is the whole pitch. -->

---

<h3>Why it's real</h3>

## Proven live, end-to-end — and verifiable without us.

<div class="cols">
<div>

**The proof stack**
- **ed25519 signature** → proves *origin*
- **Walrus (Sui)** → real testnet blob storage
- **On-chain Sui object** → *non-alteration + independent reference*
- **`verify_cli`** → a third party checks a record **straight from Walrus, with no GlassBox server in the loop**

</div>
<div>

**Engineered, not faked**
- Real Walrus-testnet write (live `blobId`)
- Provider-agnostic LLM · `gemini · openrouter · ollama`
- **100 tests + CI**, repair-retry, safe fallbacks
- Spec-first frontend via **codeplain**

</div>
</div>

<!-- "Verifiable by anyone" is literal: we demoed verify_cli reading the blob and checking the signature with the published key, no server involved. -->

---

<h3>Honest by construction</h3>

## We're precise about what this proves — that's the point.

- **Tamper-*evident*, not tamper-*proof*.** We make alteration *detectable*, not impossible.
- Signature = **origin**; the on-chain Sui object = **non-alteration + an independent reference**. It does **not** prove the inputs were true or the call correct.
- **Signal Strength is not a probability of profit.** We never pitch returns or PnL.
- PII-free anchored record + an AES-GCM **crypto-erasable** store for the goal text (GDPR).

> An **evidence layer** — *designed to map to* 17a-4 / RTS 6 record-keeping — **not** a compliance guarantee or model validation.

<!-- This slide is a feature, not a disclaimer. Compliance-minded judges trust the team that states the limits. -->

---

<h3>Why it wins</h3>

## One product, stacked across the bounties.

| Bounty | How GlassBox lands it |
|---|---|
| **Sui** | Walrus storage that registers an **on-chain Sui object** · **live DeepBook** depth/spread drives the liquidity feature + manipulation flag |
| **BGA** | Transparency **not PnL** — explainable, auditable, signed reasoning + a mechanical signal |
| **codeplain** | Spec-first: `glassbox.plain` is the source of truth, generated code is a build artifact |
| **Main finale** | A working product with a hard, **provable** wow (MATCH → MISMATCH) |

<span class="tag">Solvimon — B2B evidence/compliance line</span><span class="tag">FLock — provider-agnostic / sovereign</span>

<!-- Don't claim five equal wins. Sui + BGA + finale are primary; Solvimon + FLock are narrative. -->

---

<h3>The business</h3>

## Every fund running AI will have to prove its decisions weren't a reckless black box.

- **Customer:** funds, fintechs & AI-trading desks that must keep auditable records of *what was decided, on what inputs, by which model, and when*.
- **Today** they hand-roll brittle logs no auditor trusts.
- **GlassBox** is the decision-evidence layer — **per-analyst seat + evidence-retention tier + audit-export pack**.
- **SKU = "Evidence Retention," never "Compliance."** It produces the evidence; it doesn't validate your model.

<!-- Solvimon judges are billing/metering experts — reward genuine usage-based monetisation mapped to a real obligation. -->

---

<h3>Built with codeplain · spec-first</h3>

## The product *is* the spec.

- **`glassbox.plain`** generates the React frontend — the spec is the source of truth, generated code is a gitignored artifact.
- A hand-proven **Python FastAPI brain** stays a stable service the frontend calls over HTTP.
- Design distilled to **`resources/ui_reference.md`** from a 4-lens review (visual/UX · usability · HCI/a11y · first-user).
- Change the product by editing the spec and re-rendering — reproducible and fast to evolve.

<span class="small">Public repo · `.plain` specs · 100 tests + CI · provider-agnostic LLM</span>

<!-- For the codeplain judges: 2/3 of the score is spec quality + presentation, both fully in our control. -->

---

<!-- _paginate: false -->

<span class="kicker">The line that closes it</span>

# We're not selling that the AI is right.

## We're selling that **no one can quietly edit what it decided.**

<br>

<span class="lead">GlassBox — watch the AI argue, then prove it can't be rewritten.</span>

<br>

<span class="small">**The Start of a Joke** · Encode Vibe Coding Hackathon, London · live demo + open repo</span>

<!-- End on the line, then go straight into (or back to) the live MISMATCH if there's time. -->
