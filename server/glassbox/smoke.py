"""Confirms the configured LLM provider + key work and how fast.
Run from server/:   python3 -m glassbox.smoke
"""
import time
from . import config, llm


def main():
    fast, smart = config.models()
    print(f"provider = {config.LLM_PROVIDER}")
    print(f"fast     = {fast}")
    print(f"smart    = {smart}")
    print("-" * 50)
    for role in ("fast", "smart"):
        try:
            t = time.time()
            out = llm.chat_json(
                "You output only valid JSON.",
                'Return exactly: {"ok": true, "greeting": "<a three word hello>"}',
                role=role, timeout=60)
            print(f"  [{role:5}] {llm.model_for(role):40}  {time.time()-t:5.1f}s  OK  {out}")
        except Exception as e:
            print(f"  [{role:5}] {llm.model_for(role):40}  ERROR  {e}")


if __name__ == "__main__":
    main()
