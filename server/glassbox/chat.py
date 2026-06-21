"""Orchestration for the GlassBox EXPLAINER chatbot.

Thin, pure-ish glue between the policy brain (``chat_prompt``), the knowledge
base (``chat_knowledge``) and the LLM transport (``llm.chat_text``). It owns NO
prompt text and NO claim-discipline logic of its own — that all lives in
``chat_prompt`` (SYSTEM_PROMPT + precheck + self_check) by design, so this module
must never weaken it.

Flow (see chat_prompt's module docstring for the contract):

    precheck(question)                      # cheap regex pre-gate, no LLM
      └─ refused?  -> return redirect copy + suggestions (NO model call)
    build_messages(question, PAGE_KNOWLEDGE, context, history)   # whitelist context
    chat_text(system, user, role="fast")    # free-form prose from the provider
    self_check(answer)                       # claim-discipline post-gate
      └─ violations? -> substitute SAFE_FALLBACK

On any LLM transport failure we return a friendly, on-brand fallback rather than
surfacing an error — the chatbot is a demo surface, not a critical path.
"""
from __future__ import annotations

from typing import Iterator, Optional

from . import llm
from .chat_knowledge import PAGE_KNOWLEDGE, SUGGESTED_QUESTIONS
from .chat_prompt import (
    DEFAULT_SUGGESTIONS,
    SAFE_FALLBACK,
    build_messages,
    precheck,
    self_check,
)

# How many suggestion chips the UI wants by default (keep it tidy).
_MAX_SUGGESTIONS = 4
# Shown when the provider errors or returns nothing usable. On-brand, claim-safe,
# and never a stack trace.
_TROUBLE_FALLBACK = (
    "Sorry — I'm having trouble reaching my brain right now, so I can't write a full "
    "answer this second. You can still explore GlassBox on the page: the verdict, the "
    "Bull/Bear debate, what Signal Strength measures, or how to verify this record. "
    "Try me again in a moment."
)


def _default_suggestions() -> list[str]:
    """The default follow-up chips for a non-refused answer (trimmed).

    Prefers the authored SUGGESTED_QUESTIONS list; falls back to the prompt's
    DEFAULT_SUGGESTIONS if the knowledge module's list is empty.
    """
    base = list(SUGGESTED_QUESTIONS) or list(DEFAULT_SUGGESTIONS)
    return base[:_MAX_SUGGESTIONS]


def answer_chat(
    question: str,
    context: Optional[dict] = None,
    history: Optional[list[dict]] = None,
) -> dict:
    """Produce the chatbot reply as ``{answer, refused, suggestions}``.

    1. precheck — on a refusal, return the redirect copy + tuned suggestions and
       make NO LLM call.
    2. else build whitelisted messages, call the model in text mode, run
       self_check, and substitute SAFE_FALLBACK on any violation.
    3. on any transport error, return a friendly trouble message (not an error).

    Pure aside from the single LLM network call; safe to unit-test by mocking
    ``llm.chat_text``.
    """
    pre = precheck(question)
    if pre.refuse:
        return {
            "answer": pre.answer,
            "refused": True,
            "suggestions": pre.suggestions or _default_suggestions(),
        }

    system, user = build_messages(question, PAGE_KNOWLEDGE, context, history)
    try:
        raw = llm.chat_text(system, user, role="fast")
    except llm.LLMError:
        return {"answer": _TROUBLE_FALLBACK, "refused": False,
                "suggestions": _default_suggestions()}

    verdict = self_check(raw)
    answer = raw if verdict.ok else verdict.fallback
    # A self_check substitution is a safety redirect, not an answer to the user's
    # actual question — surface that as refused so the UI can treat it like one.
    return {"answer": answer, "refused": not verdict.ok,
            "suggestions": _default_suggestions()}


def _sse(event: str, data: dict) -> str:
    """Serialize one Server-Sent Event frame (``event:`` + ``data:`` + blank line)."""
    import json
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


# Typewriter chunking: stream the (already self_check'd) answer in small pieces so
# the UI animates without us ever emitting an un-vetted token.
_CHUNK_CHARS = 24


def _chunks(text: str, size: int = _CHUNK_CHARS) -> Iterator[str]:
    for i in range(0, len(text), size):
        yield text[i:i + size]


def stream_chat(
    question: str,
    context: Optional[dict] = None,
    history: Optional[list[dict]] = None,
) -> Iterator[str]:
    """Yield SSE frames for the streaming variant of /api/chat.

    SAFETY-FIRST pattern (chat_prompt option (a), recommended for the demo):
    we BUFFER the whole answer, run self_check on the assembled text, THEN stream
    the vetted text out as small typewriter chunks — so a banned phrase can never
    leak token-by-token. A precheck refusal is emitted as a single delta + done
    with no model call.

    Emits zero+ ``delta`` events then exactly one ``done`` event, always.
    """
    result = answer_chat(question, context, history)
    answer = result["answer"]
    refused = result["refused"]
    suggestions = result["suggestions"]

    # Stream the vetted answer as typewriter chunks (one delta per chunk).
    for chunk in _chunks(answer):
        if chunk:
            yield _sse("delta", {"text": chunk})
    yield _sse("done", {"refused": refused, "suggestions": suggestions})
