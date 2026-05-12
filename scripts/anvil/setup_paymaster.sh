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
INITIAL_DEPOSIT_ETH="${AA_PAYMASTER_INITIAL_DEPOSIT_ETH:-1}"

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
require_cmd cast

if [[ -z "${ANVIL_ENTRY_POINT:-}" ]]; then
  echo "Error: ANVIL_ENTRY_POINT is missing in contracts/.env. Run make setup-entrypoint first."
  exit 1
fi

if [[ -z "${ANVIL_LOTTO_FACTORY:-}" ]]; then
  echo "Error: ANVIL_LOTTO_FACTORY is missing in contracts/.env. Run make deploy first."
  exit 1
fi

if [[ -z "${ANVIL_ENTRY_TOKEN:-}" ]]; then
  echo "Error: ANVIL_ENTRY_TOKEN is missing in contracts/.env. Run make setup-entry-token first."
  exit 1
fi

echo "Running DeployPaymaster..."
forge script script/deploy/DeployPaymaster.s.sol --rpc-url "$ANVIL_RPC_URL" --private-key "$ANVIL_PRIVATE_KEY" --broadcast

echo "Extracting paymaster address from broadcast..."
BROADCAST_JSON="broadcast/DeployPaymaster.s.sol/${CHAIN_ID}/run-latest.json"
require_file "$BROADCAST_JSON"
ANVIL_PAYMASTER=$(extract_create_address "$BROADCAST_JSON" "LottoPaymaster")

if [[ -z "$ANVIL_PAYMASTER" ]] || [[ "$ANVIL_PAYMASTER" == "null" ]]; then
  echo "Error: Could not extract paymaster address"
  exit 1
fi

update_env_file .env ANVIL_PAYMASTER "$ANVIL_PAYMASTER"
update_env_file "$FRONTEND_ENV_FILE" AA_PAYMASTER_ADDRESS "$ANVIL_PAYMASTER"
update_env_file "$FRONTEND_ENV_FILE" NEXT_PUBLIC_PAYMASTER_ADDRESS "$ANVIL_PAYMASTER"

echo "Depositing ${INITIAL_DEPOSIT_ETH} ETH into paymaster entryPoint balance..."
cast send "$ANVIL_PAYMASTER" \
  "deposit()" \
  --value "${INITIAL_DEPOSIT_ETH}ether" \
  --rpc-url "$ANVIL_RPC_URL" \
  --private-key "$ANVIL_PRIVATE_KEY" > /dev/null

PAYMASTER_DEPOSIT=$(cast call "$ANVIL_ENTRY_POINT" "balanceOf(address)(uint256)" "$ANVIL_PAYMASTER" --rpc-url "$ANVIL_RPC_URL")

echo "✓ Updated .env:"
echo "  ANVIL_PAYMASTER=$ANVIL_PAYMASTER"
echo "✓ Updated frontend/.env.local:"
echo "  AA_PAYMASTER_ADDRESS=$ANVIL_PAYMASTER"
echo "  NEXT_PUBLIC_PAYMASTER_ADDRESS=$ANVIL_PAYMASTER"
echo "✓ Paymaster deposit on EntryPoint:"
echo "  balanceOf($ANVIL_PAYMASTER)=$PAYMASTER_DEPOSIT wei"
