#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../../contracts"

if [[ ! -f .env ]]; then
  echo "Error: contracts/.env not found"
  exit 1
fi

set -a
source .env
set +a

CHAIN_ID="${ANVIL_CHAIN_ID:-31337}"
FRONTEND_ENV_FILE="../frontend/.env.local"
ENTRYPOINT_STANDARD_ADDRESS="0x433709009B8330FDa32311DF1C2AFA402eD8D009"
AA_LIB_DIR="lib/account-abstraction"

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
  local section=""

  delete_env_key "$env_file" "$key"

  case "$key" in
    ANVIL_*) section="Local (Anvil)" ;;
    BASE_SEPOLIA_*) section="Base Sepolia" ;;
    SEPOLIA_*) section="Sepolia" ;;
  esac

  if [[ "$env_file" == ".env" && -n "$section" ]]; then
    local tmp_file
    tmp_file="$(mktemp "${env_file}.tmp.XXXXXX")"
    awk -v section="$section" -v line="${key}=${value}" '
      BEGIN { header_seen = 0; in_section = 0; inserted = 0 }
      $0 == "# " section { print; header_seen = 1; next }
      header_seen && $0 ~ /^# -+$/ { print; in_section = 1; header_seen = 0; next }
      in_section && !inserted && $0 ~ /^# / { print line; inserted = 1; in_section = 0 }
      { print }
      END { if (!inserted) print line }
    ' "$env_file" > "$tmp_file"
    mv "$tmp_file" "$env_file"
  else
    echo "${key}=${value}" >> "$env_file"
  fi
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
require_cmd cast
require_cmd yarn

has_code_at_address() {
  local rpc_url="$1"
  local address="$2"
  local code

  code=$(cast code "$address" --rpc-url "$rpc_url" 2>/dev/null || true)
  [[ -n "$code" && "$code" != "0x" ]]
}

lowercase() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]'
}

deploy_standard_entrypoint() {
  echo "Deploying standard EntryPoint with account-abstraction deterministic deploy..."
  require_file "$AA_LIB_DIR/package.json"
  require_file "$AA_LIB_DIR/hardhat.config.ts"

  (
    cd "$AA_LIB_DIR"
    if [[ ! -d node_modules ]]; then
      echo "Installing account-abstraction deploy dependencies..."
      yarn install --frozen-lockfile
    fi

    MNEMONIC_FILE="${MNEMONIC_FILE:-/tmp/lotto-aa-mnemonic-does-not-exist}" yarn deploy --network dev
  )
}

assert_standard_entrypoint_healthy() {
  local sender_creator
  local sender_creator_entry_point

  if ! has_code_at_address "$ANVIL_RPC_URL" "$ENTRYPOINT_STANDARD_ADDRESS"; then
    echo "Error: standard EntryPoint address has no bytecode: $ENTRYPOINT_STANDARD_ADDRESS"
    exit 1
  fi

  sender_creator=$(cast call "$ENTRYPOINT_STANDARD_ADDRESS" "senderCreator()(address)" --rpc-url "$ANVIL_RPC_URL" 2>/dev/null || true)
  if [[ -z "$sender_creator" || "$sender_creator" == "0x0000000000000000000000000000000000000000" ]]; then
    echo "Error: could not read EntryPoint senderCreator from $ENTRYPOINT_STANDARD_ADDRESS"
    exit 1
  fi

  sender_creator_entry_point=$(cast call "$sender_creator" "entryPoint()(address)" --rpc-url "$ANVIL_RPC_URL" 2>/dev/null || true)
  if [[ "$(lowercase "$sender_creator_entry_point")" != "$(lowercase "$ENTRYPOINT_STANDARD_ADDRESS")" ]]; then
    echo "Error: standard EntryPoint is unhealthy."
    echo "       senderCreator: $sender_creator"
    echo "       senderCreator.entryPoint(): $sender_creator_entry_point"
    echo "       expected: $ENTRYPOINT_STANDARD_ADDRESS"
    echo "       Restart Anvil from a clean state and rerun make deploy."
    exit 1
  fi
}

if has_code_at_address "$ANVIL_RPC_URL" "$ENTRYPOINT_STANDARD_ADDRESS"; then
  echo "Reusing existing standard EntryPoint address: $ENTRYPOINT_STANDARD_ADDRESS"
else
  deploy_standard_entrypoint
fi

assert_standard_entrypoint_healthy
ANVIL_ENTRY_POINT="$ENTRYPOINT_STANDARD_ADDRESS"

update_env_file .env ANVIL_ENTRY_POINT "$ANVIL_ENTRY_POINT"
update_env_file "$FRONTEND_ENV_FILE" NEXT_PUBLIC_CHAIN_ID "$CHAIN_ID"
update_env_file "$FRONTEND_ENV_FILE" NEXT_PUBLIC_CHAIN_NAME "Anvil Local"
update_env_file "$FRONTEND_ENV_FILE" NEXT_PUBLIC_RPC_URL "$ANVIL_RPC_URL"
update_env_file "$FRONTEND_ENV_FILE" AA_RPC_URL "$ANVIL_RPC_URL"
update_env_file "$FRONTEND_ENV_FILE" AA_BUNDLER_URL "${AA_BUNDLER_URL:-http://127.0.0.1:4337/rpc}"
update_env_file "$FRONTEND_ENV_FILE" NEXT_PUBLIC_ENTRYPOINT_ADDRESS "$ANVIL_ENTRY_POINT"
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
update_env_file "$FRONTEND_ENV_FILE" NEXT_PUBLIC_ACCOUNT_FACTORY_ADDRESS "$ANVIL_ACCOUNT_FACTORY"

echo "✓ Updated .env:"
echo "  ANVIL_ENTRY_POINT=$ANVIL_ENTRY_POINT"
echo "  ANVIL_ACCOUNT_FACTORY=$ANVIL_ACCOUNT_FACTORY"
echo "✓ Updated frontend/.env.local:"
echo "  NEXT_PUBLIC_CHAIN_ID=$CHAIN_ID"
echo "  NEXT_PUBLIC_CHAIN_NAME=Anvil Local"
echo "  NEXT_PUBLIC_RPC_URL=$ANVIL_RPC_URL"
echo "  AA_RPC_URL=$ANVIL_RPC_URL"
echo "  AA_BUNDLER_URL=${AA_BUNDLER_URL:-http://127.0.0.1:4337/rpc}"
echo "  NEXT_PUBLIC_ENTRYPOINT_ADDRESS=$ANVIL_ENTRY_POINT"
echo "  AA_ENTRYPOINT_ADDRESS=$ANVIL_ENTRY_POINT"
echo "  NEXT_PUBLIC_ACCOUNT_FACTORY_ADDRESS=$ANVIL_ACCOUNT_FACTORY"
