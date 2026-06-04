#!/usr/bin/env bash
# Local Slither scan (contracts/). Requires: forge build, .venv from requirements-dev.txt
# Note: Foundry deploy scripts live in script/ (singular), not this tools/ folder.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -x "$ROOT/.venv/bin/slither" ]]; then
  echo "Missing .venv. Run: python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt"
  exit 1
fi

forge build
# include_paths: first-party only. (filter_paths EXCLUDES matches — do not use for src/.)
CONFIG="${SLITHER_CONFIG:-$ROOT/slither.config.json}"
"$ROOT/.venv/bin/slither" . --foundry-out-directory out --config-file "$CONFIG" "$@"
