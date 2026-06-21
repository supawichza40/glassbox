# GlassBox — Submission Package

Everything needed to submit GlassBox to the **Encode Vibe Coding Hackathon** (London).
**Deadline: Sunday 21 June 2026, 12:00 BST.** Submit a *draft* early; you can edit to the buzzer.

> **Sticky line:** *Change one character of an AI's signed decision and it breaks — verified on a judge's own phone, against a network we don't control.*

## What's in this folder
| File | Use it for |
|---|---|
| [form-answers.md](form-answers.md) | **Copy-paste** text for every field on the submission form |
| [project-description.md](project-description.md) | Long-form description (tagline / what it does / how built / challenges / next) |
| [prompts-and-tech-stack.md](prompts-and-tech-stack.md) | The "built with AI" requirement — prompts + full stack |
| [one-pager.md](one-pager.md) | The leave-behind (problem → solution → how → team) |
| [elevator-30s.md](elevator-30s.md) | 30-second spoken/written blurb for judges |
| [demo-video-script.md](demo-video-script.md) | **Shot-by-shot video script** — slides + live demo, what to show + what to say (~2.5–3 min) |

## Links (all verified live, logged-out)
- **Live full app (Render, PRIMARY):** https://glassbox-1mvl.onrender.com  *(free host — open once to warm it ~30s before judging)*
- **Backup full app (Heroku):** https://glassbox-evidence-834d99a1d3b7.herokuapp.com
- **Verify-it-yourself (Vercel, static):** https://static-flame-tau.vercel.app/verify
- **Code:** https://github.com/supawichza40/glassbox  ⚠️ **currently PRIVATE — must be made public** (see blockers)
- **Demo video:** ⏳ NOT yet recorded — placeholder in form-answers.md
- **Deck:** `deck/glassbox-deck.html` (Marp source `deck/glassbox.md`) — export a PDF for upload

## 🚨 Blockers to clear BEFORE final submit (in priority order)
1. **Make the GitHub repo PUBLIC.** Judging + the *codeplain bounty require it (the `.plain` files must be visible). Currently private → judges get a 404.
   - One command: `gh repo edit supawichza40/glassbox --visibility public --accept-visibility-change-consequences`
2. **Record the demo video** (~2–3 min) — full shot-by-shot script in [demo-video-script.md](demo-video-script.md). Must play for a logged-out viewer; paste the link.
3. **Export the deck to PDF** (and ideally PPTX) for the "Link to Presentation" / upload.
4. ✅ **Done:** `GEMINI_API_KEY` + `GLASSBOX_ED25519_SK_HEX` are set on **Render** — the live dashboard's *Analyze* works and the pubkey matches `c0eac674…` (both confirmed). (If you ever fall back to Heroku, set the same vars there.)

## The hard checklist (gate — tick before you hit submit)
- [ ] Deadline + timezone confirmed (Sun 21 Jun **12:00 BST**); alarm set 1h before
- [ ] **Draft submitted early**, editable
- [ ] Repo is **public**; README renders; `glassbox.plain` + `glassbox.config.yaml` visible
- [ ] Every required field filled (Challenge Explanation, Submission Details, Files, Code, Presentation, Demo Video, Live Demo)
- [ ] Demo video plays **logged-out**
- [ ] Live demo URL works **logged-out** (it does) + QR ready for the room
- [ ] Deck attached (PDF) if the form wants an upload
- [ ] Bounties/track selected: **Sui · BGA · *codeplain**
- [ ] Team set: The Start of a Joke (Supavich Aussawaauschariyakul, Orestis Kap)
- [ ] Claim discipline check: nowhere says "tamper-proof" / promises PnL / "makes you compliant"
- [ ] Final submit confirmed (you saw the "submitted" state)
