#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BUNDLER_DIR="$ROOT_DIR/tools/alto"
CONTRACTS_ENV_FILE="$ROOT_DIR/contracts/.env"
ENV_FILE="$ROOT_DIR/frontend/.env.local"

if [[ ! -d "$BUNDLER_DIR" ]]; then
  echo "[info] Alto repo not found. Cloning..."
  git clone --depth 1 https://github.com/pimlicolabs/alto.git "$BUNDLER_DIR"
fi

if ! command -v pnpm >/dev/null 2>&1; then
  if ! command -v corepack >/dev/null 2>&1; then
    echo "[error] pnpm is not installed and corepack is unavailable."
    exit 1
  fi
  echo "[info] enabling pnpm via corepack..."
  corepack enable
  corepack prepare pnpm@8.15.4 --activate
fi

if [[ -f "$CONTRACTS_ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$CONTRACTS_ENV_FILE"
  set +a
fi

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

AA_RPC_URL="${AA_RPC_URL:-http://127.0.0.1:8545}"
AA_BUNDLER_PORT="${AA_BUNDLER_PORT:-4337}"
AA_BUNDLER_PRIVATE_API_PORT="${AA_BUNDLER_PRIVATE_API_PORT:-4338}"
AA_ENTRYPOINT_ADDRESS="${AA_ENTRYPOINT_ADDRESS:-${ANVIL_ENTRY_POINT:-}}"
AA_BUNDLER_NETWORK_NAME="${AA_BUNDLER_NETWORK_NAME:-local}"
AA_BUNDLER_EXECUTOR_PRIVATE_KEYS="${AA_BUNDLER_EXECUTOR_PRIVATE_KEYS:-${ANVIL_PRIVATE_KEY:-}}"
AA_BUNDLER_UTILITY_PRIVATE_KEY="${AA_BUNDLER_UTILITY_PRIVATE_KEY:-${ANVIL_PRIVATE_KEY:-}}"
AA_BUNDLER_SAFE_MODE="${AA_BUNDLER_SAFE_MODE:-false}"
AA_BUNDLER_MIN_BALANCE="${AA_BUNDLER_MIN_BALANCE:-0}"

if [[ -z "$AA_ENTRYPOINT_ADDRESS" ]]; then
  echo "[error] missing EntryPoint address. Set ANVIL_ENTRY_POINT in contracts/.env or AA_ENTRYPOINT_ADDRESS in frontend/.env.local."
  exit 1
fi

if [[ -z "$AA_BUNDLER_EXECUTOR_PRIVATE_KEYS" ]]; then
  echo "[error] missing executor private key(s). Set ANVIL_PRIVATE_KEY or AA_BUNDLER_EXECUTOR_PRIVATE_KEYS."
  exit 1
fi

if [[ -z "$AA_BUNDLER_UTILITY_PRIVATE_KEY" ]]; then
  echo "[error] missing utility private key. Set ANVIL_PRIVATE_KEY or AA_BUNDLER_UTILITY_PRIVATE_KEY."
  exit 1
fi

cd "$BUNDLER_DIR"

if [[ ! -d node_modules ]]; then
  echo "[info] installing Alto dependencies..."
  pnpm install
fi

if [[ ! -d src/esm ]]; then
  echo "[info] building Alto..."
  pnpm build:all
fi

echo "[info] starting bundler (Pimlico Alto)"
echo "       network: $AA_RPC_URL"
echo "       entryPoint: $AA_ENTRYPOINT_ADDRESS"
echo "       public RPC: http://127.0.0.1:$AA_BUNDLER_PORT/rpc"
echo "       private API port (unused by Alto): $AA_BUNDLER_PRIVATE_API_PORT"

./alto \
  --network-name "$AA_BUNDLER_NETWORK_NAME" \
  --rpc-url "$AA_RPC_URL" \
  --entrypoints "$AA_ENTRYPOINT_ADDRESS" \
  --executor-private-keys "$AA_BUNDLER_EXECUTOR_PRIVATE_KEYS" \
  --utility-private-key "$AA_BUNDLER_UTILITY_PRIVATE_KEY" \
  --safe-mode "$AA_BUNDLER_SAFE_MODE" \
  --min-balance "$AA_BUNDLER_MIN_BALANCE" \
  --port "$AA_BUNDLER_PORT" \
  --api-version "v1,v2"
