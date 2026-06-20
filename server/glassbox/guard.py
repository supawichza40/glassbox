"""Relevance gate — GlassBox only analyzes SUI/USDC investing questions.

Stops the embarrassing "Hello -> HOLD" case: greetings, small talk, tests, and other
off-topic input get a friendly redirect instead of a fabricated buy/hold/avoid verdict.

Two layers: a cheap heuristic short-circuits the obvious cases (no LLM call), then a fast
LLM classifier judges the rest. It fails OPEN — if the classifier errors, a real question
is never blocked.
"""
import re

from . import llm

REDIRECT = (
    "That doesn't look like an investing question. GlassBox only analyzes whether to buy, "
    "hold, or avoid SUI/USDC — try something like: "
    "\"Should I hold SUI for the next 2 weeks? I'm moderate risk.\""
)

_GREETINGS = {
    "hi", "hello", "hey", "yo", "sup", "hiya", "howdy", "gm", "good morning",
    "good afternoon", "good evening", "test", "testing", "ping", "ok", "okay",
    "thanks", "thank you", "hello there", "hi there",
}


def _obviously_offtopic(text: str) -> bool:
    t = " ".join((text or "").lower().split())
    if not re.search(r"[a-z]", t):                 # no letters at all (numbers/punct only)
        return True
    t_alnum = re.sub(r"[^a-z0-9 ]", "", t).strip()
    if t_alnum in _GREETINGS:                       # exact greeting / filler
        return True
    words = t_alnum.split()
    if len(words) <= 2 and all(w in _GREETINGS for w in words):
        return True
    return False


def relevance_gate(goal_text: str):
    """Return a redirect message if the text is NOT an investing question, else None."""
    if _obviously_offtopic(goal_text):
        return REDIRECT
    try:
        system = (
            "You route messages for GlassBox, which ONLY analyzes whether to buy, hold, or "
            "avoid the crypto pair SUI/USDC. Decide if the user's message is a genuine request "
            "for an investing/trading decision or market analysis (about SUI, crypto, or "
            "markets / a financial goal). Greetings, small talk, tests, jokes, or unrelated "
            "topics are NOT. Return JSON only: {\"relevant\": true} or {\"relevant\": false}."
        )
        out = llm.chat_json(system, f"<user_message>{goal_text}</user_message>", role="fast")
        if isinstance(out, dict) and out.get("relevant") is False:
            return REDIRECT
    except Exception:
        pass  # fail open — never block a real question on a classifier hiccup
    return None
