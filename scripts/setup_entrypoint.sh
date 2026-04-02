#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../contracts"

set -a
source .env
set +a

echo "Running SetupEntryPoint..."
forge script script/setup/SetupEntryPoint.s.sol --rpc-url "$ANVIL_RPC_URL" --private-key "$ANVIL_PRIVATE_KEY" --broadcast --code-size-limit 40000

echo "Extracting entrypoint address from broadcast..."
BROADCAST_JSON="broadcast/SetupEntryPoint.s.sol/31337/run-latest.json"
ANVIL_ENTRY_POINT=$(jq -r '.transactions[] | select(.transactionType == "CREATE") | .contractAddress' "$BROADCAST_JSON" | head -1)

if [[ -z "$ANVIL_ENTRY_POINT" ]] || [[ "$ANVIL_ENTRY_POINT" == "null" ]]; then
  echo "Error: Could not extract entrypoint address"
  exit 1
fi

sed -i '' "/^ANVIL_ENTRY_POINT=/d" .env || true
echo "ANVIL_ENTRY_POINT=$ANVIL_ENTRY_POINT" >> .env

echo "✓ Updated .env:"
echo "  ANVIL_ENTRY_POINT=$ANVIL_ENTRY_POINT"
