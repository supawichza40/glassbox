# GlassBox — UI design reference (visual replica brief)

This is the **design source of truth** for the Codeplain-rendered frontend. The goal is a **visual replica** of the hand-built reference at `server/glassbox/static/index.html`: a **dark-themed, projector-first** AI-decision dashboard. `glassbox.plain` carries the load-bearing `***implementation reqs***` (which restate the key tokens inline so the renderer never has to guess); this file is the thorough companion the spec points at.

Three goals the visual design must serve:
1. **3-second read on a projector** — judges at the back of the room read the VERDICT and the tamper WOW instantly.
2. **Trustworthy fintech, not a toy** — dark, restrained, high-contrast, credible; no decorative emoji as load-bearing meaning.
3. **The tamper moment is the climax** — flipping VERIFIED → TAMPER DETECTED is the biggest, brightest, only-animating thing on screen, and a judge can do it themselves.

---

## 1. Design tokens (use these exact hex values)

### Color
| Token | Hex | Used for |
|---|---|---|
| `bg` | `#090c12` | page background (near-black, with a faint radial glow top-center) |
| `surface-1` | `#121821` | card background |
| `surface-2` | `#19212e` | inputs, inner panels, debate sides, meter tracks, chips |
| `line` | `#2a3543` | all 1px borders / dividers |
| `ink` | `#eef3fa` | primary text |
| `ink-2` | `#c0cbda` | secondary text, leads, receipt values |
| `muted` | `#8a97a8` | labels, captions, axis text |
| `faint` | `#aab6c6` | fine print / disclaimer |
| `brand` (violet) | `#7c5cff` | confidence bar, evidence-override accent, MA trend line |
| `action` (CTA blue) | `#2563eb` | primary buttons |
| `accent2` (teal) | `#21d4c4` | links, focus ring, Sui object link, chain chip, numeric highlights |
| `bull` / BUY / MATCH | `#2ed573` | green — bull side, BUY verdict, VERIFIED banner |
| `bear` / AVOID | `#ff4d5e` | red — bear side, AVOID verdict, TAMPER banner |
| `warn` / HOLD | `#ffc24d` | amber — HOLD verdict, warning gauges, DEMO pill |

The page background is a near-black radial gradient: a faint blue-grey glow (~`#162030` at low opacity) at top-center fading to `#090c12`. Deep panels (disclaimer, record editor) sit one notch darker than surface-2 (~`#0e141d`).

### Radius scale
`8px` (small — inputs, chips, buttons), `12px` (medium — inner panels, debate sides, banners), `16px` (large — top-level cards).

### Spacing rhythm
4px grid: 4 / 8 / 12 / 16 / 22 / 24 / 30. Cards: ~22px internal padding, ~18px gap between stacked cards. Page top padding ~30px, bottom ~90px.

### Elevation
Top-level cards: soft drop shadow `0 8px 30px rgba(0,0,0,.45)`. The VERIFIED/TAMPER banners add a colored glow (green or red) on top of the shadow.

---

## 2. Typography

- **Sans stack:** `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif`.
- **Mono stack:** `ui-monospace, SFMono-Regular, Menlo, "JetBrains Mono", monospace` — for ALL hashes, fingerprints, signatures, blob/object IDs, the editable record, and chart axis numbers.
- **Base body:** 17px / line-height ~1.55. **Present mode** (`?present`) bumps base to 20px.

### Type scale
| Role | Size / weight |
|---|---|
| Verdict hero | **64px / 800**, letter-spacing -.03em, line-height 1 (52px on narrow screens) |
| TAMPER DETECTED banner | **46px / 800** (the largest stable state) |
| VERIFIED banner | **38px / 800** |
| h1 ("GlassBox") | 30px, letter-spacing -.02em |
| h2 (card titles) | 20px |
| Section eyebrow labels | 13px, UPPERCASE, letter-spacing .08em, `muted` |
| Body / debate points | 16–17px |
| Meta / receipt | 15px |
| Fine print / disclaimer | **13px floor — never smaller** |

---

## 3. Layout

- **Centered single column**, `max-width: 1040px`, auto margins, ~22px horizontal padding.
- **Every section is a CARD:** `surface-1` background, 1px `line` border, **16px radius**, ~22px padding, the soft drop shadow, ~18px top margin between cards.
- Vertical flow top→bottom: header → ask card → (loading skeleton) → decision card → proof card.
- Generous padding and clear vertical rhythm; nothing cramped — this must read from across a room.

---

## 4. Header

- Row, wrapping: **"GlassBox"** (h1, 30px) followed by small **status pills** (rounded-999px, 1px `line` border, ~13px).
  - **Health pill:** a colored dot + text — `AI online · <provider>` when up (green dot with green glow), `AI offline` when down (red dot). Never a bare "…".
  - **Mode pill:** `LIVE mode` (green) or `DEMO mode` (amber).
- Below: a **lead** line in `ink-2` (~17px): *"An AI Bull and Bear debate your trade — then we lock the verdict so it can't be quietly rewritten."*
- A **3-step stepper** in `muted` 14px with bold numbers: **1. Ask → 2. Get a verdict → 3. Prove it can't be faked.**

---

## 5. Ask card

- Eyebrow label: **"Your investing question"** (13px uppercase, muted).
- A **textarea** (surface-2 bg, 1px line border, 8px radius, ink text), pre-filled with an example question so users aren't staring at a blank box. Autofocused; ⌘/Ctrl+Enter submits.
- A **row** of: a static **Asset chip** reading `SUI/USDC · more soon` (a chip, NOT a disabled dropdown — a greyed dropdown reads as broken); a **Risk select** (low / moderate / high); and the **Analyze** button (`action` blue, white text, 8px radius, ≥46px tall).
- A **status line** below for progress/errors (`role=status`, `aria-live=polite`).
- **Off-topic input:** a short friendly redirect in the status line — never a fabricated verdict.

---

## 6. Loading state

- A **two-column shimmer skeleton** (two grey blocks side-by-side, animated left-to-right shimmer) mirroring the debate layout.
- A **stepping caption** in the status line that advances every ~2s through phrases like "Spinning up the Bull and Bear analysts…", "The agents are debating both sides…", "Cross-examining and scoring conviction…", "Resolving the verdict…", with a thin teal indeterminate progress bar sliding underneath. Never a static spinner — dead air loses the room.

---

## 7. Decision card (verdict-first)

Eyebrow: **"Decision"** plus a small `cached demo` / `live` source tag (amber / green pill outline).

### Verdict hero — THE focal point
- The **VERDICT word** at **64px / 800**, colored by outcome:
  - **BUY → green `#2ed573`**, glyph **▲**
  - **HOLD → amber `#ffc24d`**, glyph **■**
  - **AVOID → red `#ff4d5e`**, glyph **▼**
- The glyph sits immediately left of the word (decorative / `aria-hidden`; the word carries meaning).
- The hero **pops in ~0.5s after** the debate appears — its own moment.

### Signal-strength meter (directly under the hero)
- Two thin **horizontal bars**: **Bull** (green fill, labelled `Bull` in green + `N/5`) and **Bear** (red fill with a subtle diagonal hatch, labelled in red + `N/5`). Tracks are surface-2 with a 1px line border, ~18px tall, 8px radius; fills animate their width in on reveal.
- Below them a **Confidence** bar: `Confidence in <VERDICT>` with the percent + band (e.g. `72% · strong`) in mono on the right, and a **violet (`brand`) fill** (neutral on purpose — the verdict is already color-coded in the hero, so this bar isn't a third "side").
- A small caption explains the math in plain words and ends with "Rule-based, not a profit forecast."

### Suggested size
- A meta line: `Suggested size: <X>% of your portfolio`.

### Resolved line
- `<Bull|Bear> side wins the argument.` (bold) followed by the one-line reason.

### Bull / Bear debate
- **Two side-by-side cards** (`grid-template-columns: 1fr 1fr`, ~16px gap), each surface-2, 1px line border, 12px radius.
  - **BULL** card: a **3px green top-border** (`#2ed573`); heading "BULL CASE" in green, uppercase, letter-spacing .1em, with a small glowing green square glyph.
  - **BEAR** card: a **3px red top-border** (`#ff4d5e`); heading "BEAR CASE" in red, uppercase, with a glowing red square glyph.
  - Each lists 2 bullet points, then a dashed-top-border **rebuttal** line in muted, and conviction stated in words (e.g. "4/5 (strong)"). **No animal emoji** — squares + color + label only.
- **On narrow screens (≤640px) the two cards stack to a single column.**

### Evidence override strip
- A short line with a **violet left-border accent** and faint violet tint: shows the rule-based baseline verdict vs the debate's verdict as small bordered chips — `agree ✓` (green) when they match, or `baseline → debate` with a violet arrow when the debate overrode the rules.

### Evidence (expanders)
- **"See the numbers they debated"** expander → a responsive grid of **gauges**, each: a small label, a thin horizontal **track** (surface-2 + line border) with a tick mark at the threshold and a fill colored **teal `accent2` when OK / amber `warn` when flagged**, a min/max axis, the numeric value (mono) with a `✓`/`!` glyph, and a one-line caption. Numbers read in the accent/teal or amber per state.
- An optional **price panel**: an SVG line chart of daily closes (ink-2 line) + dashed violet 20-day average, a teal "as-of / now" marker at the last close, mono axis labels, and a legend — captioned "No forecast — nothing is drawn to the right of now."
- **"Why you should doubt this"** expander → main risk, what would flip the call, blind spots.

### Disclaimer panel
- A clearly-readable panel (deep `#0e141d` bg, 1px line border, 8px radius, `faint` 13px text) — **"Not financial advice."** prominent. Honest and visible, not buried.

### Prove-it CTA
- A **"🔒 Prove it"** button (action blue) that reveals the proof card.

---

## 8. Proof card

- Title **"Proof — the on-chain record"**, then a plain-English why-line in `ink-2`: GlassBox signed this exact decision and wrote its fingerprint to Walrus on Sui; anyone can re-check it, and a single changed character breaks the match.
- **Receipt panel** (surface-2, 1px line, 12px radius, **monospace** ~14px/1.9): keys in `muted`, values in `ink`:
  - `decision fingerprint (sha-256)` → short hash + `…`
  - `signature — proves origin` → short sig + `…`
  - `stored on` → a small rounded **chain chip** `● Walrus · Sui` outlined in **teal `accent2`**, plus the blob id.
  - `Walrus registration object (Sui)` → the Sui object id as a **teal link** to the explorer, plus `storage epoch <n>`.
  - A teal-outlined button-link: "🔍 Verify it yourself on your phone →".

### Interactive tamper (the climax setup)
- Eyebrow: **"Try it yourself — tamper with the record"** + the instruction "Change any single character below and the fingerprint breaks. Put it back exactly and it verifies again."
- An **editable record box** (deep `#0e141d` bg, mono ~13px, resizable), pre-filled with the canonical record.
- Two fingerprint rows (mono): **`anchored fingerprint (sha-256)`** (fixed) and **`this record's fingerprint`** (recomputed in-browser via Web Crypto on every edit). When they differ, the **changed characters are highlighted in red** in the live fingerprint.
- Buttons: **Try to alter it**, **Reset** (ghost: transparent, 1px line border), **Re-verify on Walrus** (ghost).

---

## 9. Tamper banners — the asymmetric climax

Two banners share placement but are deliberately **unequal** in weight. Both use **a word AND an icon**, never color alone (~8% of male judges are colorblind).

- **VERIFIED (calm green):** shown while the record is untouched. Solid 2px **green** border, faint green tint, **green glow**, **38px / 800**, text **`✓ VERIFIED`** with a sub-line "This record matches its anchored fingerprint, byte for byte." A gentle pop on appear.

- **TAMPER DETECTED (the loudest state):** shown the instant any character changes. **Dashed 2px red** border (dashed, distinct from the solid green), stronger red tint, **bigger red glow**, **46px / 800** — the **largest, most prominent state on the page** — text **`✗ TAMPER DETECTED`** with a sub-line "The record changed — its fingerprint no longer matches what was anchored on Walrus." Animates with a **pop + shake**.

Reset → back to the calm VERIFIED. Nothing else on the page animates during the TAMPER state.

---

## 10. Interaction states & reliability

- **Every action** (Analyze / Prove / Verify / Alter) has loading, disabled, and error states. Buttons disable while in-flight and show progress text ("Signing + anchoring…", "Re-fetching from Walrus…"). After Prove succeeds, the button locks ("✓ Proved") so it can't double-fire.
- Map raw HTTP errors to plain language in the status line.
- Use the goal captured at analyze-time for the audit (not a possibly-edited textarea).

---

## 11. Motion & staged reveal

- **Idle → Analyze:** skeleton + stepping caption.
- **Result:** the debate **rises in** (fade + slight upward translate), then the **verdict hero pops** ~0.5s later as its own beat; the strength bars grow their widths.
- **Prove → receipt** appears; **Verify → VERIFIED glow**; **Alter → TAMPER slam + shake** with the hash diff.
- All transitions use a snappy ease (`cubic-bezier(.2,.9,.2,1)`), short (~0.16–0.6s). Honor `prefers-reduced-motion`: disable animations entirely.

---

## 12. Accessibility

- Live regions: status `role=status aria-live=polite`; VERIFIED `aria-live=assertive`; TAMPER `role=alert`.
- Visible **teal `:focus-visible`** ring (`accent2`, 2px, 2px offset) on every control; fully keyboard operable.
- Non-color cues everywhere: verdict glyphs (▲/■/▼), VERIFIED solid border + word, TAMPER dashed border + word.
- Decorative glyphs `aria-hidden`; adjacent text always carries the meaning.
- Contrast: body ≥ 4.5:1; large text ≥ 3:1 (CTA blue clears it); fine print ≥ 13px at ≥ 4.5:1.
- Touch targets ≥ 44px.

---

## 13. Responsive

- **≤640px:** debate cards stack to one column; verdict drops to 52px; popovers become a bottom sheet.
- **`?present` (stage mode):** base type bumps to 20px for the live pitch; explainer chips slightly larger.

---

## 14. Claim discipline (copy)

Always **"tamper-evident"**, never "tamper-proof". The **signature proves origin**; the **Walrus-registered on-chain Sui object** is the anchor (a Sui *epoch* — a rough window, not a wall-clock time). It is an **evidence layer**, not model validation or a compliance guarantee. Never imply a profit forecast. Keep the honest disclaimer prominent — for compliance-minded judges that *increases* trust.
