# GlassBox — UI design reference

Design brief for the GlassBox frontend, distilled from a 4-lens design review (visual/UX, usability, HCI/accessibility, first-time-user). `glassbox.plain` should point the renderer at this file. The working reference implementation is `server/glassbox/static/index.html`.

## Goals the UI must serve
1. **3-second read on a projector** — judges at the back of the room must read the verdict and the wow.
2. **Trustworthy fintech, not a toy** — restrained, credible; no decorative emoji as load-bearing semantics.
3. **The MISMATCH is the climax** — the tamper demo must be the biggest, brightest, most-animated moment.

## Design tokens
```
color  bg #090c12 · surface-1 #121821 · surface-2 #19212e · line #2a3543
text   ink #eef3fa · ink-2 #c0cbda · muted #8a97a8 · faint #aab6c6 (fine print)
brand  #7c5cff   action(CTA) #2563eb   accent2(chain/focus) #21d4c4
sem    bull/BUY #2ed573 · bear/AVOID #ff4d5e · HOLD #ffc24d · MATCH = bull green
type   base 17px (present-mode 20px) · verdict 64px/800 · MATCH 38px · MISMATCH 46px
       h1 30 · h2 20 · body 16-17 · meta 15 · fine-print floor 13 (nothing smaller)
font   sans: system-ui/Inter · mono: ui-monospace/JetBrains Mono
space  4px grid (4/8/12/16/24/32) · radius 8/12/16
```

## Layout & flow (top to bottom)
- **Header:** "GlassBox" + a live "AI online · <provider>" pill (never a bare "…"). Benefit tagline: *"An AI Bull and Bear debate your trade — then we lock the verdict so it can't be quietly rewritten."* A 3-step stepper: **1. Ask → 2. Get a verdict → 3. Prove it can't be faked.**
- **Ask card:** a pre-filled example question (lowers "what do I type"), Asset shown as a static **chip** "SUI/USDC · more soon" (NOT a disabled dropdown — reads as broken), risk select, Analyze button (⌘↵ also submits; textarea autofocused).
- **Loading (6–10s):** a two-column **shimmer skeleton** + a **stepping caption** that advances ("agents debating…", "scoring conviction…"). Never a static spinner — dead air loses the room.
- **Decision card (verdict-first):** the **VERDICT is the hero** (64px BUY/HOLD/AVOID with a ▲/■/▼ glyph so meaning survives color loss), then the Signal Strength chip ("rule-based, not a profit forecast") and suggested size ("X% of your portfolio"). Below: the "<side> wins the argument" line, then the **Bull/Bear debate** (color-coded top borders + square glyphs, NO animal emoji), each with 2 points + a rebuttal + conviction (word-labelled: "4/5 (strong)"). Counterfactual / blind-spots / risk live behind a **"Why you should doubt this"** expander. A clean, readable **disclaimer panel** (not buried fine print).
- **Proof card:** a plain-English why-line ("…wrote its fingerprint to Walrus on Sui; if a single character changes, it won't match"), a **receipt panel** (fingerprint, signature "proves origin", a "● Walrus · Sui" provenance chip — hashes in ink, not grey), then **Verify** and **Try to alter it**.
- **The climax:** Verify → big green **VERIFIED** banner. "Try to alter it" → 46px red **TAMPER DETECTED** banner (dashed border + glow + shake) and a **hash diff** showing the anchored fingerprint vs the tampered one (tampered glowing red). This must be the brightest, only-animating thing on screen at that beat.

## Staging (the demo arc)
Idle → (Analyze) skeleton+caption → debate rises in → **verdict pops ~0.5s later** (its own moment) → (Prove) receipt → (Verify) MATCH glow → (Alter) MISMATCH slam+shake + hash diff. Nothing else animates during the MISMATCH.

## Accessibility (required)
- Live regions: `#status` `role=status aria-live=polite`; MATCH `aria-live=assertive`; MISMATCH `role=alert`.
- Visible `:focus-visible` ring (accent2) on every control; keyboard operable.
- Non-color cues: MATCH solid border + "VERIFIED"; MISMATCH **dashed** border + "TAMPER DETECTED" (don't rely on green/red alone — ~8% of male judges are colorblind).
- `prefers-reduced-motion`: disable animations.
- Contrast: body ≥ 4.5:1, disclaimer ≥ 4.5:1 at ≥13px, large text ≥ 3:1 (CTA blue #2563eb clears it).
- Decorative glyphs `aria-hidden`; the adjacent text always carries the meaning.
- Touch targets ≥ 44px.

## Reliability (every action)
Loading + disabled + error states on **all** of Analyze / Prove / Verify / Alter. Guard `if(!audit) return` before Verify/Alter. After Prove succeeds, lock the button (no double-fire). Use the goal captured *at analyze time* for the audit (don't read a possibly-edited textarea). Map raw HTTP errors to plain language.

## Claim discipline (copy)
Always "**tamper-evident**", never "tamper-proof / provable to anyone". Signature = origin; on-chain anchor = non-alteration + timestamp. "Evidence layer", not "compliance guarantee". Never imply a profit forecast. Keep the honest disclaimer prominent — for compliance-minded judges that *increases* trust.

## `body.present` (stage mode)
Add `?present` to the URL (or `class="present"`) to bump type for the live pitch.
