#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../../../contracts"

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

echo "Running DeployLotto..."
forge script script/deploy/DeployLotto.s.sol --rpc-url "$ANVIL_RPC_URL" --private-key "$ANVIL_PRIVATE_KEY" --broadcast

echo "Extracting lotto factory address from broadcast..."
BROADCAST_JSON="broadcast/DeployLotto.s.sol/${CHAIN_ID}/run-latest.json"
require_file "$BROADCAST_JSON"
ANVIL_LOTTO_FACTORY=$(extract_create_address "$BROADCAST_JSON" "LottoFactory")

if [[ -z "$ANVIL_LOTTO_FACTORY" ]] || [[ "$ANVIL_LOTTO_FACTORY" == "null" ]]; then
  echo "Error: Could not extract lotto factory address"
  exit 1
fi

update_env_file .env ANVIL_LOTTO_FACTORY "$ANVIL_LOTTO_FACTORY"
update_env_file "$FRONTEND_ENV_FILE" NEXT_PUBLIC_LOTTO_FACTORY_ADDRESS "$ANVIL_LOTTO_FACTORY"

set -a
source .env
set +a

echo "Registering LottoFactory as VRF consumer..."
forge script script/setup/ConfigureVrfConsumer.s.sol --rpc-url "$ANVIL_RPC_URL" --private-key "$ANVIL_PRIVATE_KEY" --broadcast

echo "✓ Updated .env:"
echo "  ANVIL_LOTTO_FACTORY=$ANVIL_LOTTO_FACTORY"
echo "✓ Updated frontend/.env.local:"
echo "  NEXT_PUBLIC_LOTTO_FACTORY_ADDRESS=$ANVIL_LOTTO_FACTORY"
echo "✓ Registered LottoFactory as VRF consumer"
