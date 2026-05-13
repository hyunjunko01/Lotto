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

LOTTO_ADDRESS="${1:-}"

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Error: required command not found: $cmd"
    exit 1
  fi
}

require_env() {
  local key="$1"
  local value="${!key:-}"
  if [[ -z "$value" ]]; then
    echo "Error: $key is missing in contracts/.env"
    exit 1
  fi
}

if [[ -z "$LOTTO_ADDRESS" ]]; then
  echo "Usage: ./scripts/deploy/anvil/fulfill_randomness.sh <LOTTO_INSTANCE_ADDRESS>"
  echo "Example: ./scripts/deploy/anvil/fulfill_randomness.sh 0x1234...abcd"
  exit 1
fi

require_cmd cast
require_cmd jq

require_env ANVIL_RPC_URL
require_env ANVIL_PRIVATE_KEY
require_env ANVIL_VRF_COORDINATOR
require_env ANVIL_LOTTO_FACTORY

# RandomnessRequested(uint256,address)
EVENT_TOPIC0="$(cast keccak "RandomnessRequested(uint256,address)")"
PADDED_LOTTO_TOPIC="0x000000000000000000000000${LOTTO_ADDRESS#0x}"

echo "Looking up latest requestId for lotto: $LOTTO_ADDRESS"
LOGS_JSON=$(cast rpc --rpc-url "$ANVIL_RPC_URL" eth_getLogs \
  "$(jq -nc \
    --arg address "$ANVIL_LOTTO_FACTORY" \
    --arg topic0 "$EVENT_TOPIC0" \
    --arg topic2 "$PADDED_LOTTO_TOPIC" \
    '{address: $address, fromBlock: "0x0", toBlock: "latest", topics: [$topic0, null, $topic2]}')")

REQUEST_ID_TOPIC=$(echo "$LOGS_JSON" | jq -r '.[-1].topics[1] // empty')
if [[ -z "$REQUEST_ID_TOPIC" ]]; then
  echo "Error: no RandomnessRequested event found for lotto $LOTTO_ADDRESS"
  exit 1
fi

REQUEST_ID_DEC="$(cast to-dec "$REQUEST_ID_TOPIC")"
echo "Found requestId: $REQUEST_ID_DEC"
echo "Calling fulfillRandomWords on VRF coordinator..."

cast send "$ANVIL_VRF_COORDINATOR" \
  "fulfillRandomWords(uint256,address)" \
  "$REQUEST_ID_DEC" \
  "$ANVIL_LOTTO_FACTORY" \
  --rpc-url "$ANVIL_RPC_URL" \
  --private-key "$ANVIL_PRIVATE_KEY" > /dev/null

echo "✓ Fulfilled randomness"
echo "  lotto: $LOTTO_ADDRESS"
echo "  requestId: $REQUEST_ID_DEC"
