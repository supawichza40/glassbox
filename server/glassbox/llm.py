"""Provider-agnostic LLM call. One function: chat_json(system, user, role).

role 'fast'  -> LLM_MODEL_FAST  (Bull / Bear)
role 'smart' -> LLM_MODEL_SMART (Arbiter)
Provider chosen by LLM_PROVIDER: openrouter | gemini | ollama.
"""
import json
import re

import requests

from . import config


class LLMError(RuntimeError):
    pass


def model_for(role: str) -> str:
    fast, smart = config.models()
    return smart if role == "smart" else fast


def _parse_json(text: str) -> dict:
    s = (text or "").strip()
    m = re.search(r"```(?:json)?\s*([\s\S]*?)```", s)
    if m:
        s = m.group(1).strip()
    if not s.startswith("{"):
        i, j = s.find("{"), s.rfind("}")
        if i != -1 and j != -1:
            s = s[i:j + 1]
    return json.loads(s)


def _openai_compat(base_url, api_key, model, system, user, headers_extra=None, timeout=60,
                   json_mode=True):
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    if headers_extra:
        headers.update(headers_extra)
    body = {
        "model": model,
        "temperature": 0,
        "messages": [{"role": "system", "content": system},
                     {"role": "user", "content": user}],
    }
    if json_mode:
        body["response_format"] = {"type": "json_object"}
    r = requests.post(f"{base_url}/chat/completions", headers=headers, json=body, timeout=timeout)
    if r.status_code == 400 and "response_format" in r.text:  # model lacks JSON mode
        body.pop("response_format", None)
        r = requests.post(f"{base_url}/chat/completions", headers=headers, json=body, timeout=timeout)
    if r.status_code >= 400:
        raise LLMError(f"{model}: HTTP {r.status_code} {r.text[:200]}")
    data = r.json()
    if isinstance(data, dict) and data.get("error"):
        raise LLMError(f"{model}: {data['error']}")
    choices = data.get("choices") or []
    if not choices:
        raise LLMError(f"{model}: no choices returned ({str(data)[:200]})")
    msg = choices[0].get("message") or {}
    content = msg.get("content") or msg.get("reasoning") or ""
    if not content:
        raise LLMError(f"{model}: empty content ({str(choices[0])[:200]})")
    return content


def _gemini(api_key, model, system, user, timeout=60, json_mode=True):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    gen_cfg = {"temperature": 0}
    if json_mode:
        gen_cfg["responseMimeType"] = "application/json"
    body = {
        "system_instruction": {"parts": [{"text": system}]},
        "contents": [{"parts": [{"text": user}]}],
        "generationConfig": gen_cfg,
    }
    r = requests.post(url, json=body, timeout=timeout)
    if r.status_code >= 400:
        raise LLMError(f"{model}: HTTP {r.status_code} {r.text[:200]}")
    return r.json()["candidates"][0]["content"]["parts"][0]["text"]


def _ollama(model, system, user, timeout=180, json_mode=True):
    payload = {"model": model, "stream": False,
               "options": {"temperature": 0},
               "messages": [{"role": "system", "content": system},
                            {"role": "user", "content": user}]}
    if json_mode:
        payload["format"] = "json"
    r = requests.post("http://localhost:11434/api/chat", json=payload, timeout=timeout)
    if r.status_code >= 400:
        raise LLMError(f"{model}: HTTP {r.status_code} {r.text[:200]}")
    return r.json()["message"]["content"]


def _dispatch(system: str, user: str, role: str, timeout: int, json_mode: bool = True) -> str:
    """Send one (system, user) to the active provider and return the raw text.

    ``json_mode`` toggles the provider's structured-output mode. chat_json calls
    with json_mode=True (and parses); chat_text calls with json_mode=False to get
    free-form prose. The provider routing is shared so there is one transport path.
    """
    p = config.LLM_PROVIDER
    model = model_for(role)
    try:
        if p == "openrouter":
            if not config.OPENROUTER_API_KEY:
                raise LLMError("OPENROUTER_API_KEY is empty — paste it into .env")
            return _openai_compat(
                "https://openrouter.ai/api/v1", config.OPENROUTER_API_KEY, model, system, user,
                headers_extra={"HTTP-Referer": "https://github.com/supawichza40/glassbox", "X-Title": "GlassBox"},
                timeout=timeout, json_mode=json_mode)
        if p == "gemini":
            if not config.GEMINI_API_KEY:
                raise LLMError("GEMINI_API_KEY is empty — paste it into .env")
            return _gemini(config.GEMINI_API_KEY, model, system, user, timeout=timeout, json_mode=json_mode)
        if p == "ollama":
            return _ollama(model, system, user, timeout=max(timeout, 180), json_mode=json_mode)
    except requests.exceptions.RequestException as e:
        # Transport-level failure (connection refused/aborted, DNS, read timeout) —
        # e.g. a local Ollama crash or a provider blip. Surface as LLMError so callers
        # (the chatbot) degrade to a friendly fallback instead of a raw 500.
        raise LLMError(f"{model}: transport error ({type(e).__name__}: {str(e)[:160]})") from e
    raise LLMError(f"unknown LLM_PROVIDER='{p}' (use openrouter | gemini | ollama)")


def chat_json(system: str, user: str, role: str = "fast", timeout: int | None = None) -> dict:
    """Call the provider and parse JSON, with ONE repair retry on malformed output."""
    if timeout is None:
        timeout = config.LLM_TIMEOUT
    last_err = None
    for attempt in range(2):
        u = user if attempt == 0 else (
            user + "\n\nYour previous reply was not valid JSON. Reply with ONLY the JSON "
            "object — no prose, no markdown fences.")
        content = _dispatch(system, u, role, timeout)
        try:
            return _parse_json(content)
        except Exception as e:  # noqa: BLE001 - retry once, then surface
            last_err = e
    raise LLMError(f"{model_for(role)} returned non-JSON after retry ({last_err})")


def chat_text(system: str, user: str, role: str = "fast", timeout: int | None = None) -> str:
    """Call the provider in free-form TEXT mode and return the reply verbatim.

    Same provider routing as chat_json (OpenRouter / Gemini / Ollama) but with
    JSON-mode OFF and no JSON parsing — used by the explainer chatbot, which wants
    plain prose. Raises LLMError on transport failure or an empty reply.
    """
    if timeout is None:
        timeout = config.LLM_TIMEOUT
    content = _dispatch(system, user, role, timeout, json_mode=False)
    text = (content or "").strip()
    if not text:
        raise LLMError(f"{model_for(role)} returned empty text")
    return text
