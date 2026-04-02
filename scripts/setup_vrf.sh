#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../contracts"

set -a
source .env
set +a

echo "Mining initial block..."
cast rpc anvil_mine 1 --rpc-url "$ANVIL_RPC_URL" > /dev/null 2>&1 || true

echo "Running SetupVrf..."
forge script script/setup/SetupVrf.s.sol --rpc-url "$ANVIL_RPC_URL" --private-key "$ANVIL_PRIVATE_KEY" --broadcast

echo "Mining to confirm transactions..."
cast rpc anvil_mine 1 --rpc-url "$ANVIL_RPC_URL" > /dev/null 2>&1 || true

echo "Extracting coordinator and subscription ID from broadcast..."
# Read broadcast JSON
BROADCAST_JSON="broadcast/SetupVrf.s.sol/31337/run-latest.json"

# Get coordinator address from the CREATE transaction
COORDINATOR=$(jq -r '.transactions[] | select(.transactionType == "CREATE") | .contractAddress' "$BROADCAST_JSON" | head -1)

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

sed -i '' "/^ANVIL_VRF_COORDINATOR=/d" .env || true
sed -i '' "/^ANVIL_SUBSCRIPTION_ID=/d" .env || true
echo "ANVIL_VRF_COORDINATOR=$COORDINATOR" >> .env
echo "ANVIL_SUBSCRIPTION_ID=$SUB_ID" >> .env

echo "✓ Updated .env:"
echo "  ANVIL_VRF_COORDINATOR=$COORDINATOR"
echo "  ANVIL_SUBSCRIPTION_ID=$SUB_ID"
