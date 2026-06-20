#!/usr/bin/env bash
# Self-contained GlassBox backend test runner.
# Mirrors the codeplain test-harness pattern: cd into server/ and run pytest.
# All tests are OFFLINE + DETERMINISTIC (LLM + Walrus are mocked) — no API keys
# or network are required.
set -euo pipefail

# Resolve the directory this script lives in (server/), regardless of caller cwd.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

python3 -m pytest -q "$@"
