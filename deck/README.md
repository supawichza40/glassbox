# GlassBox — pitch deck

10 slides, ~2.5–3 min, aligned to `../PITCH.md` (spoken script + judge-Q&A bank). Optimised for the finale: the **MISMATCH** is the climax; claim discipline throughout (tamper-evident, transparency-not-PnL).

## Files
- **`glassbox-deck.html`** — self-contained (no dependencies, works offline). **Use this now.**
- **`glassbox.md`** — Marp source (with `<!-- speaker notes -->` per slide). Edit here if you have Node; re-export.

## Present
Open `glassbox-deck.html` in a browser → fullscreen (`⌃⌘F` / F11). **↓ / Space** = next, **↑** = back.

## Export to PDF (no tools needed)
Open `glassbox-deck.html` → **Cmd+P** → *Save as PDF* → set **Landscape**, **Margins: None**, and tick **Background graphics** (so the dark theme prints). One slide per page.

## Export to PPTX / PDF (needs Node)
```bash
npx -y @marp-team/marp-cli@latest glassbox.md --pptx --allow-local-files
npx -y @marp-team/marp-cli@latest glassbox.md --pdf  --allow-local-files
```

## Slide order
1. Title · 2. Problem · 3. What it does (the loop) · 4. **The wow** (MATCH→MISMATCH) · 5. Why it's real (proof stack + verify_cli) · 6. Honest by construction · 7. Why it wins (bounty map) · 8. Business (Solvimon) · 9. Built with codeplain · 10. Close ("no one can quietly edit what it decided").
