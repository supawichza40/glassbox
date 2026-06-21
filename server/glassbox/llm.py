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


def _openai_compat(base_url, api_key, model, system, user, headers_extra=None, timeout=60):
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    if headers_extra:
        headers.update(headers_extra)
    body = {
        "model": model,
        "temperature": 0,
        "messages": [{"role": "system", "content": system},
                     {"role": "user", "content": user}],
        "response_format": {"type": "json_object"},
    }
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


def _gemini(api_key, model, system, user, timeout=60):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    body = {
        "system_instruction": {"parts": [{"text": system}]},
        "contents": [{"parts": [{"text": user}]}],
        "generationConfig": {"temperature": 0, "responseMimeType": "application/json"},
    }
    r = requests.post(url, json=body, timeout=timeout)
    if r.status_code >= 400:
        raise LLMError(f"{model}: HTTP {r.status_code} {r.text[:200]}")
    return r.json()["candidates"][0]["content"]["parts"][0]["text"]


def _ollama(model, system, user, timeout=180):
    r = requests.post(
        "http://localhost:11434/api/chat",
        json={"model": model, "stream": False, "format": "json",
              "options": {"temperature": 0},
              "messages": [{"role": "system", "content": system},
                           {"role": "user", "content": user}]},
        timeout=timeout,
    )
    if r.status_code >= 400:
        raise LLMError(f"{model}: HTTP {r.status_code} {r.text[:200]}")
    return r.json()["message"]["content"]


def _dispatch(system: str, user: str, role: str, timeout: int) -> str:
    p = config.LLM_PROVIDER
    model = model_for(role)
    if p == "openrouter":
        if not config.OPENROUTER_API_KEY:
            raise LLMError("OPENROUTER_API_KEY is empty — paste it into .env")
        return _openai_compat(
            "https://openrouter.ai/api/v1", config.OPENROUTER_API_KEY, model, system, user,
            headers_extra={"HTTP-Referer": "https://github.com/supawichza40/glassbox", "X-Title": "GlassBox"},
            timeout=timeout)
    if p == "gemini":
        if not config.GEMINI_API_KEY:
            raise LLMError("GEMINI_API_KEY is empty — paste it into .env")
        return _gemini(config.GEMINI_API_KEY, model, system, user, timeout=timeout)
    if p == "ollama":
        return _ollama(model, system, user, timeout=max(timeout, 180))
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
