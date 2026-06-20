# "Verify-it-yourself" public receipt — go-live runbook

The wow: a judge scans a QR with **their own phone**, and the page fetches the signed
decision record straight from **Walrus**, recomputes the SHA-256 fingerprint, and checks
the **ed25519** signature against GlassBox's **published key** — all in their browser.
Then they edit one character and it flips to **TAMPER DETECTED** with a plain-English
field diff. The proof survives in the judge's own hands.

Built on branch `feature/explore-feature2`. Tier-1 core is untouched (this is a new,
read-only static page).

## What was added
- `server/glassbox/static/verify.html` — the standalone receipt page (no framework, no Codeplain re-render).
- `server/glassbox/static/vendor/noble-ed25519.js`, `qrcode.js` — vendored, **offline** (only the Walrus blob fetch hits the network).
- `server/glassbox/static/receipts/latest.json` (+ `<id>.json`) — the baked, real, signed, Walrus-stored record the page verifies.
- `server/glassbox/bake_receipt.py` — bakes a fresh real record (no LLM key needed).
- Routes in `main.py`: `GET /verify` and `GET /r/<recordId>` (clean alias).
- Must-fixes: `verify_cli` now reports `hashMatch`; `verify.py` pins to the published key; honest "Walrus blob registration object + storage epoch" labels; `SPEC.md` JCS wording corrected.
- Tests: `server/tests/test_verify_receipt.py` (5 new; full suite = 105 green).

## Run locally
```bash
cd server
python3 -m venv .venv && ./.venv/bin/pip install -r requirements.txt -r requirements-dev.txt
# NOTE: port 8787 may be taken by another GlassBox session — pick a free port.
./.venv/bin/python -m uvicorn glassbox.main:app --port 8799
# open http://localhost:8799/verify   (or /r/<id>, add ?present for projector)
```

## Bake a FRESH real record (do this the night before, on good Wi-Fi)
```bash
cd server
AUDIT_SINK=walrus ./.venv/bin/python -m glassbox.bake_receipt
```
This signs + writes the blob to Walrus testnet (registering a real on-chain Sui object)
and writes `static/receipts/latest.json`. **If you regenerate the signing key, also update**
`PUBLISHED_PUBKEY` in `verify.html` (the test `test_verify_page_published_key_matches_install`
guards this) — get it from `GET /api/pubkey`.

## Deploy the public QR URL (your call — needs your account)
The page is fully static + verifies client-side (Walrus CORS is open), so deploy the
`server/glassbox/static/` directory to any static host, e.g. **Vercel**:
```bash
cd server/glassbox/static && npx vercel deploy --prod
```
The QR auto-encodes whatever URL the page is served at, so no rebuild needed. Point the
deck/QR at `https://<your-host>/verify` (or `/r/<id>`).
> If you'd rather keep the live FastAPI server, expose it with a tunnel (`cloudflared tunnel --url http://localhost:8799`) and use that HTTPS URL.

## Stage checklist (can't-die)
1. **Pre-warm Walrus** right before you present: open `/verify` once so the aggregator is hot (clean fetch ≈ 1.3s; 4s timeout → honest amber "shown from a copy" fallback, still VERIFIED).
2. **Phone-test on the venue/hotspot Wi-Fi** — scan the real QR, confirm VERIFIED, then tamper.
3. **Record the fallback NOW**: a screen-capture GIF/video of (scan → VERIFIED → edit one char → TAMPER DETECTED) on a phone. If live Wi-Fi dies on stage, play the clip.
4. Confirm the **baked record's verdict** matches your spoken script (currently **HOLD**; the demo tamper line that reads best is editing the `verdict` value, e.g. HOLD→BUY).

## Claim discipline (verified by security review — keep it)
Say **"tamper-evident"**, never "tamper-proof". The on-chain link is the **Walrus blob's
registration object + storage epoch** (a Sui *epoch*, not a wall-clock time, not a
dedicated anchor tx). The page proves **origin + non-alteration**, NOT that the decision
is correct/profitable/compliant. The page's own "what this does NOT prove" caption states this.

## Verification status (red-teamed)
- QA (real headless browser): **PASS / demo-stable** — happy path, tamper+field-diff, QR, phone + projector, reduced-motion a11y, offline fallback all confirmed.
- Security: **sound + honest** — crypto verified end-to-end on a live record; dev-key fallback now fails-closed visually; "no server in the loop" overclaims replaced with "trust the math, not our server".
