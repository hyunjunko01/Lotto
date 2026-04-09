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

echo "Mining initial block..."
cast rpc anvil_mine 1 --rpc-url "$ANVIL_RPC_URL" > /dev/null 2>&1 || true

echo "Running SetupVrf..."
forge script script/setup/SetupVrf.s.sol --rpc-url "$ANVIL_RPC_URL" --private-key "$ANVIL_PRIVATE_KEY" --broadcast

echo "Mining to confirm transactions..."
cast rpc anvil_mine 1 --rpc-url "$ANVIL_RPC_URL" > /dev/null 2>&1 || true

echo "Extracting coordinator and subscription ID from broadcast..."
BROADCAST_JSON="broadcast/SetupVrf.s.sol/${CHAIN_ID}/run-latest.json"
require_file "$BROADCAST_JSON"

# Get coordinator address from the CREATE transaction
COORDINATOR=$(extract_create_address "$BROADCAST_JSON" "VRFCoordinatorV2_5Mock")

# Extract subId topic from SubscriptionCreated event in receipts
# SubscriptionCreated(uint256,address) topic0
SUB_CREATED_TOPIC0="0x1d3015d7ba850fa198dc7b1a3f5d42779313a681035f77c8c03764c61005518d"
SUB_TOPIC=$(jq -r --arg t0 "$SUB_CREATED_TOPIC0" '.receipts[] | .logs[] | select(.topics[0] == $t0) | .topics[1]' "$BROADCAST_JSON" | head -1)

if [[ -z "$SUB_TOPIC" || "$SUB_TOPIC" == "null" ]]; then
  echo "Error: Could not extract subscription topic from receipt"
  exit 1
fi

# Convert uint256 hex topic to decimal safely (bash arithmetic overflows on uint256)
SUB_ID=$(cast to-dec "$SUB_TOPIC")

if [[ -z "$COORDINATOR" ]] || [[ "$COORDINATOR" == "null" ]]; then
  echo "Error: Could not extract coordinator address"
  exit 1
fi

if [[ -z "$SUB_ID" ]] || [[ "$SUB_ID" == "null" ]]; then
  echo "Error: Could not extract subscription ID"
  exit 1
fi

update_env_file .env ANVIL_VRF_COORDINATOR "$COORDINATOR"
update_env_file .env ANVIL_SUBSCRIPTION_ID "$SUB_ID"

echo "✓ Updated .env:"
echo "  ANVIL_VRF_COORDINATOR=$COORDINATOR"
echo "  ANVIL_SUBSCRIPTION_ID=$SUB_ID"
