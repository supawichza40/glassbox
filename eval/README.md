# GlassBox chatbot eval harness

Measures the explainer chatbot for **answer quality, grounding, claim discipline,
and graceful refusal**. New artifact — it observes the production policy layer
(`chat_prompt`, `chat_knowledge`, `chat`) and edits nothing.

## Files
- `chat_evalset.jsonl` — ~67 labeled cases: legit explainer questions that must be
  ANSWERED (with `must_mention` grounded facts + `must_not_say` claim-discipline
  red lines), plus advice / prediction / new_analysis / off_topic cases that must be
  REFUSED, plus an adversarial/borderline block that probes the precheck↔self_check seam.
- `../server/glassbox/chat_eval.py` — the runner (offline + live scorecards).

## Case schema (one JSON object per line)
```json
{"id": "...", "category": "answer|advice|prediction|new_analysis|off_topic",
 "expect": "answer|refuse", "expect_refusal_category": "advice|...",
 "question": "...", "must_mention": ["fact", ...], "must_not_say": ["bad phrase", ...],
 "notes": "..."}
```

## Run OFFLINE (no key — runs now)
```bash
cd server && ./.venv/bin/python -m glassbox.chat_eval
```
Scores three things without a model: precheck refusal routing + category accuracy,
self_check claim-discipline catch-rate (direct adversarial probes), and whether each
answer case's `must_mention` facts exist in `PAGE_KNOWLEDGE`. Exit code is non-zero on
hard fails (claim-discipline misses, precheck overblocks, redirect copy that overclaims).

## Run LIVE (needs a key)
Auto-enables when a key is present, or force it with `--live`:
```bash
cd server && OPENROUTER_API_KEY=sk-or-... ./.venv/bin/python -m glassbox.chat_eval --live
# or
cd server && GEMINI_API_KEY=...           ./.venv/bin/python -m glassbox.chat_eval --live
# add an LLM-as-judge pass (uses the smart model):
cd server && OPENROUTER_API_KEY=sk-or-... ./.venv/bin/python -m glassbox.chat_eval --live --judge
# machine-readable output:
./.venv/bin/python -m glassbox.chat_eval --json
```
LIVE mode calls `chat.answer_chat(question)` per case and grades the real answer:
`must_mention` present, `must_not_say` absent, refusal flagged correctly, and
`self_check` clean on the produced text.

## Reading the score
- **precheck LEAKS** are reported but NOT counted as hard fails — precheck is a cheap
  pre-gate; the LIVE model + `self_check` are the real net. Run `--live` to test that net.
- **OVERBLOCKS** (a legit explainer question refused) and **self_check MISSES** ARE hard
  fails — they're user-visible or claim-discipline breaches.
