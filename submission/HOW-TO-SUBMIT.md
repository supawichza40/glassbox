# How to submit GlassBox — step by step

**Deadline: today, Sun 21 Jun 12:00 BST. Submit a DRAFT now; edit to the buzzer.**
All copy is in [`form-answers.md`](form-answers.md). Repo is public; Render is live.

## Order of operations
1. **First pass (5 min):** paste the two text fields + the three links you already have → **Save draft.**
2. **Second pass:** record the video + export the deck PDF → add those two links → re-save.
3. **Final:** select challenges + team, re-check links logged-out, **Submit.**

---

## Field by field

### 1. Challenge Explanation
Paste the **"Challenge Explanation"** block from `form-answers.md` (the Sui / BGA / *codeplain approach). Make sure the three challenges **Sui · BGA · *codeplain** are selected/checked so this field shows.

### 2. Submission Details
Paste the **"Submission Details"** block from `form-answers.md`.

### 3. Submission Files  *(upload, max 25 MB each — do NOT put the video here, link it)*
Upload, in order of value:
- **The deck as PDF** (see "Export the deck" below)
- **One-pager** — `submission/one-pager.md` (or its PDF)
- **Prompts + tech stack** — `submission/prompts-and-tech-stack.md`
- **2–3 screenshots** — the Bull/Bear debate + verdict, the **TAMPER DETECTED** moment, the verify/QR page

### 4. Link to Code
```
https://github.com/supawichza40/glassbox
```
(Public ✓. Contains `glassbox.plain` + `glassbox.config.yaml` for *codeplain.)

### 5. Link to Presentation
Easiest reliable route: **export the deck to PDF → upload to Google Drive → Share → "Anyone with the link" → paste that link.** (Or DocSend/Canva.) Don't link the raw GitHub `.html` — it won't render as slides.

### 6. Link to Demo Video
Record from [`demo-video-script.md`](demo-video-script.md) (~2–3 min) → upload to **YouTube (Unlisted or Public)** or Loom → paste the link. **Confirm it plays logged-out.**

### 7. Live Demo Link
```
https://glassbox-1mvl.onrender.com
```
⚠️ Free Render host sleeps when idle — **open it once ~1 min before you submit / before judges click** so it's warm. (Backup: `https://glassbox-evidence-834d99a1d3b7.herokuapp.com`.)

---

## Export the deck to PDF (fastest)
1. Open `deck/glassbox-deck.html` in Chrome.
2. `Cmd+P` → **Destination: Save as PDF** → Layout **Landscape** → Save.
3. Upload that PDF to the **Submission Files** field AND to Google Drive for the **Link to Presentation**.

## Before final submit — checklist
- [ ] Challenges selected: **Sui · BGA · *codeplain**
- [ ] Team: **The Start of a Joke** — Supavich Aussawaauschariyakul · Orestis Kap
- [ ] Both text fields pasted; files uploaded
- [ ] All 4 links open **logged-out**: repo, presentation, video, live demo
- [ ] Render warmed (opened it in the last minute)
- [ ] You saw the **"submitted"** confirmation (don't assume)
- [ ] 🔐 Rotate the Heroku API key you shared earlier
