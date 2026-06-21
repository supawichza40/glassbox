# GlassBox — One-Pager

**Tamper-evident accountability for AI financial decisions.**
*Encode Vibe Coding Hackathon · Team "The Start of a Joke" (Supavich Aussawaauschariyakul · Orestis Kap)*

### The problem
AI is making more financial calls, but the *record* of what it decided is a brittle log the operator can quietly edit after the fact. There's no way for an outsider — an auditor, a regulator, a counterparty — to confirm *what the AI actually decided, on what inputs, and that it wasn't changed since.*

### The solution
GlassBox produces a **signed, independently-verifiable record** of every AI decision. A Bull and Bear agent debate frozen real market data; a Risk Arbiter resolves a verdict with a transparent, mechanical Signal Strength. The decision is ed25519-signed, written to **Walrus** (registering an **on-chain Sui object**), and anyone can **re-verify it in their own browser** — recompute the hash, check the signature against a published key — with **no GlassBox server in the trust path.**

### The wow (and the honest claim)
**Edit a single character of a signed decision → it breaks into TAMPER DETECTED, on a judge's own phone (scan the QR).** We prove *what* the AI decided and that nobody altered it — **not** that the decision is correct or profitable. Tamper-*evident*, not "tamper-proof."

### How it works
`ask → Bull/Bear debate (frozen CoinGecko + DeepBook v3 inputs) → Risk Arbiter verdict + mechanical Signal Strength → PII-free record → ed25519 sign → Walrus blob + on-chain Sui object → verify-it-yourself (in-browser) + interactive tamper diff`

### Bounties
**Sui** (DeepBook + Walrus, on-chain object) · **BGA** (AI trading judged on transparency, not PnL) · ***codeplain** (frontend generated from a `.plain` spec). *Narrative:* Solvimon (B2B evidence-retention), FLock.

### Try it
- Live app: **https://glassbox-evidence-834d99a1d3b7.herokuapp.com**
- Verify-it-yourself: **https://static-flame-tau.vercel.app/verify**
- Code: **https://github.com/supawichza40/glassbox**
