#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
CONTRACTS_ENV_FILE="$ROOT_DIR/contracts/.env"
FRONTEND_ENV_FILE="$ROOT_DIR/frontend/.env.local"

if [[ ! -f "$CONTRACTS_ENV_FILE" ]]; then
  echo "Error: contracts/.env not found"
  exit 1
fi

set -a
source "$CONTRACTS_ENV_FILE"
set +a

delete_env_key() {
  local env_file="$1"
  local key="$2"
  touch "$env_file"

  if sed --version >/dev/null 2>&1; then
    sed -i "/^${key}=.*/d" "$env_file" 2>/dev/null || true
  else
    sed -i '' "/^${key}=.*/d" "$env_file" 2>/dev/null || true
  fi
}

update_env_file() {
  local env_file="$1"
  local key="$2"
  local value="$3"
  delete_env_key "$env_file" "$key"
  echo "${key}=${value}" >> "$env_file"
}

require_env() {
  local key="$1"
  if [[ -z "${!key:-}" ]]; then
    echo "Error: required env var is missing: $key"
    exit 1
  fi
}

require_env BASE_SEPOLIA_RPC_URL
require_env BASE_SEPOLIA_ENTRY_POINT
require_env BASE_SEPOLIA_ACCOUNT_FACTORY
require_env BASE_SEPOLIA_LOTTO_FACTORY
require_env BASE_SEPOLIA_ENTRY_TOKEN
require_env BASE_SEPOLIA_PAYMASTER

CHAIN_ID="${BASE_SEPOLIA_CHAIN_ID:-84532}"
BUNDLER_URL="${BASE_SEPOLIA_BUNDLER_URL:-$BASE_SEPOLIA_RPC_URL}"

update_env_file "$FRONTEND_ENV_FILE" NEXT_PUBLIC_CHAIN_ID "$CHAIN_ID"
update_env_file "$FRONTEND_ENV_FILE" NEXT_PUBLIC_CHAIN_NAME "\"Base Sepolia\""
update_env_file "$FRONTEND_ENV_FILE" NEXT_PUBLIC_LOG_LOOKBACK_BLOCKS "10"
update_env_file "$FRONTEND_ENV_FILE" NEXT_PUBLIC_RPC_URL "$BASE_SEPOLIA_RPC_URL"
update_env_file "$FRONTEND_ENV_FILE" AA_RPC_URL "$BASE_SEPOLIA_RPC_URL"
update_env_file "$FRONTEND_ENV_FILE" AA_BUNDLER_URL "$BUNDLER_URL"
update_env_file "$FRONTEND_ENV_FILE" NEXT_PUBLIC_ENTRYPOINT_ADDRESS "$BASE_SEPOLIA_ENTRY_POINT"
update_env_file "$FRONTEND_ENV_FILE" AA_ENTRYPOINT_ADDRESS "$BASE_SEPOLIA_ENTRY_POINT"
update_env_file "$FRONTEND_ENV_FILE" NEXT_PUBLIC_ACCOUNT_FACTORY_ADDRESS "$BASE_SEPOLIA_ACCOUNT_FACTORY"
update_env_file "$FRONTEND_ENV_FILE" NEXT_PUBLIC_LOTTO_FACTORY_ADDRESS "$BASE_SEPOLIA_LOTTO_FACTORY"
update_env_file "$FRONTEND_ENV_FILE" NEXT_PUBLIC_ENTRY_TOKEN_ADDRESS "$BASE_SEPOLIA_ENTRY_TOKEN"
update_env_file "$FRONTEND_ENV_FILE" AA_PAYMASTER_ADDRESS "$BASE_SEPOLIA_PAYMASTER"
update_env_file "$FRONTEND_ENV_FILE" NEXT_PUBLIC_PAYMASTER_ADDRESS "$BASE_SEPOLIA_PAYMASTER"

echo "✓ Updated frontend/.env.local for Base Sepolia"
