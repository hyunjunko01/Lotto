#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../contracts"

if [[ ! -f .env ]]; then
  echo "Error: contracts/.env not found"
  exit 1
fi

set -a
source .env
set +a

CHAIN_ID="${ANVIL_CHAIN_ID:-31337}"
FRONTEND_ENV_FILE="../frontend/.env.local"

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Error: required command not found: $cmd"
    exit 1
  fi
}

require_file() {
  local path="$1"
  if [[ ! -f "$path" ]]; then
    echo "Error: required file not found: $path"
    exit 1
  fi
}

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

extract_create_address() {
  local broadcast_json="$1"
  local contract_name="$2"

  jq -r --arg name "$contract_name" \
    '.transactions[] | select(.transactionType == "CREATE" and .contractName == $name) | .contractAddress' \
    "$broadcast_json" | head -1
}

require_cmd forge
require_cmd jq

echo "Running SetupEntryPoint..."
forge script script/setup/SetupEntryPoint.s.sol --rpc-url "$ANVIL_RPC_URL" --private-key "$ANVIL_PRIVATE_KEY" --broadcast --code-size-limit 40000

echo "Extracting entrypoint address from broadcast..."
BROADCAST_JSON="broadcast/SetupEntryPoint.s.sol/${CHAIN_ID}/run-latest.json"
require_file "$BROADCAST_JSON"
ANVIL_ENTRY_POINT=$(extract_create_address "$BROADCAST_JSON" "EntryPoint")

if [[ -z "$ANVIL_ENTRY_POINT" ]] || [[ "$ANVIL_ENTRY_POINT" == "null" ]]; then
  echo "Error: Could not extract entrypoint address"
  exit 1
fi

update_env_file .env ANVIL_ENTRY_POINT "$ANVIL_ENTRY_POINT"
update_env_file "$FRONTEND_ENV_FILE" AA_ENTRYPOINT_ADDRESS "$ANVIL_ENTRY_POINT"

echo "Running DeployAccount..."
forge script script/deploy/DeployAccount.s.sol --rpc-url "$ANVIL_RPC_URL" --private-key "$ANVIL_PRIVATE_KEY" --broadcast --code-size-limit 40000

echo "Extracting account factory address from broadcast..."
BROADCAST_JSON="broadcast/DeployAccount.s.sol/${CHAIN_ID}/run-latest.json"
require_file "$BROADCAST_JSON"
ANVIL_ACCOUNT_FACTORY=$(extract_create_address "$BROADCAST_JSON" "AccountFactory")

if [[ -z "$ANVIL_ACCOUNT_FACTORY" ]] || [[ "$ANVIL_ACCOUNT_FACTORY" == "null" ]]; then
  echo "Error: Could not extract account factory address"
  exit 1
fi

update_env_file .env ANVIL_ACCOUNT_FACTORY "$ANVIL_ACCOUNT_FACTORY"
update_env_file "$FRONTEND_ENV_FILE" AA_ACCOUNT_FACTORY_ADDRESS "$ANVIL_ACCOUNT_FACTORY"
update_env_file "$FRONTEND_ENV_FILE" NEXT_PUBLIC_ACCOUNT_FACTORY_ADDRESS "$ANVIL_ACCOUNT_FACTORY"

echo "✓ Updated .env:"
echo "  ANVIL_ENTRY_POINT=$ANVIL_ENTRY_POINT"
echo "  ANVIL_ACCOUNT_FACTORY=$ANVIL_ACCOUNT_FACTORY"
echo "✓ Updated frontend/.env.local:"
echo "  AA_ENTRYPOINT_ADDRESS=$ANVIL_ENTRY_POINT"
echo "  AA_ACCOUNT_FACTORY_ADDRESS=$ANVIL_ACCOUNT_FACTORY"
echo "  NEXT_PUBLIC_ACCOUNT_FACTORY_ADDRESS=$ANVIL_ACCOUNT_FACTORY"
