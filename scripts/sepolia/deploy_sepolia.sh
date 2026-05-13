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

CHAIN_ID="${SEPOLIA_CHAIN_ID:-11155111}"
FRONTEND_ENV_FILE="../frontend/.env.local"
PAYMASTER_INITIAL_DEPOSIT_ETH="${SEPOLIA_PAYMASTER_INITIAL_DEPOSIT_ETH:-0.005}"
UPDATE_FRONTEND_ENV="${UPDATE_FRONTEND_ENV_FOR_SEPOLIA:-false}"
SEPOLIA_AA_BUNDLER_URL="${SEPOLIA_BUNDLER_URL:-${SEPOLIA_RPC_URL:-}}"

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

require_env() {
  local key="$1"
  if [[ -z "${!key:-}" ]]; then
    echo "Error: required env var is missing: $key"
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

require_deployed_code() {
  local label="$1"
  local address="$2"
  local code

  code=$(cast code "$address" --rpc-url "$SEPOLIA_RPC_URL")
  if [[ -z "$code" || "$code" == "0x" ]]; then
    echo "Error: $label has no bytecode at $address"
    exit 1
  fi
}

deploy_script() {
  local script_path="$1"
  echo "Running $script_path..."
  forge script "$script_path" \
    --rpc-url "$SEPOLIA_RPC_URL" \
    --private-key "$SEPOLIA_PRIVATE_KEY" \
    --broadcast
}

require_cmd forge
require_cmd jq
require_cmd cast

require_env SEPOLIA_RPC_URL
require_env SEPOLIA_PRIVATE_KEY
require_env SEPOLIA_ENTRY_POINT
require_env SEPOLIA_VRF_COORDINATOR
require_env SEPOLIA_VRF_KEYHASH
require_env SEPOLIA_SUBSCRIPTION_ID

echo "Checking Sepolia dependencies..."
require_deployed_code "Sepolia EntryPoint" "$SEPOLIA_ENTRY_POINT"
require_deployed_code "Sepolia VRF coordinator" "$SEPOLIA_VRF_COORDINATOR"

DEPLOYER=$(cast wallet address --private-key "$SEPOLIA_PRIVATE_KEY")
DEPLOYER_BALANCE=$(cast balance "$DEPLOYER" --rpc-url "$SEPOLIA_RPC_URL")
echo "Deployer: $DEPLOYER"
echo "Deployer balance: $DEPLOYER_BALANCE wei"

deploy_script script/deploy/DeployAccount.s.sol
ACCOUNT_BROADCAST_JSON="broadcast/DeployAccount.s.sol/${CHAIN_ID}/run-latest.json"
require_file "$ACCOUNT_BROADCAST_JSON"
SEPOLIA_ACCOUNT_FACTORY=$(extract_create_address "$ACCOUNT_BROADCAST_JSON" "AccountFactory")
if [[ -z "$SEPOLIA_ACCOUNT_FACTORY" || "$SEPOLIA_ACCOUNT_FACTORY" == "null" ]]; then
  echo "Error: Could not extract Sepolia AccountFactory address"
  exit 1
fi
update_env_file .env SEPOLIA_ACCOUNT_FACTORY "$SEPOLIA_ACCOUNT_FACTORY"

deploy_script script/deploy/DeployEntryToken.s.sol
ENTRY_TOKEN_BROADCAST_JSON="broadcast/DeployEntryToken.s.sol/${CHAIN_ID}/run-latest.json"
require_file "$ENTRY_TOKEN_BROADCAST_JSON"
SEPOLIA_ENTRY_TOKEN=$(extract_create_address "$ENTRY_TOKEN_BROADCAST_JSON" "LottoEntryToken")
if [[ -z "$SEPOLIA_ENTRY_TOKEN" || "$SEPOLIA_ENTRY_TOKEN" == "null" ]]; then
  echo "Error: Could not extract Sepolia LottoEntryToken address"
  exit 1
fi
update_env_file .env SEPOLIA_ENTRY_TOKEN "$SEPOLIA_ENTRY_TOKEN"

deploy_script script/deploy/DeployLotto.s.sol
LOTTO_BROADCAST_JSON="broadcast/DeployLotto.s.sol/${CHAIN_ID}/run-latest.json"
require_file "$LOTTO_BROADCAST_JSON"
SEPOLIA_LOTTO_FACTORY=$(extract_create_address "$LOTTO_BROADCAST_JSON" "LottoFactory")
if [[ -z "$SEPOLIA_LOTTO_FACTORY" || "$SEPOLIA_LOTTO_FACTORY" == "null" ]]; then
  echo "Error: Could not extract Sepolia LottoFactory address"
  exit 1
fi
update_env_file .env SEPOLIA_LOTTO_FACTORY "$SEPOLIA_LOTTO_FACTORY"

set -a
source .env
set +a

echo "Registering Sepolia LottoFactory as VRF consumer..."
deploy_script script/setup/ConfigureVrfConsumer.s.sol

deploy_script script/deploy/DeployPaymaster.s.sol
PAYMASTER_BROADCAST_JSON="broadcast/DeployPaymaster.s.sol/${CHAIN_ID}/run-latest.json"
require_file "$PAYMASTER_BROADCAST_JSON"
SEPOLIA_PAYMASTER=$(extract_create_address "$PAYMASTER_BROADCAST_JSON" "LottoPaymaster")
if [[ -z "$SEPOLIA_PAYMASTER" || "$SEPOLIA_PAYMASTER" == "null" ]]; then
  echo "Error: Could not extract Sepolia LottoPaymaster address"
  exit 1
fi
update_env_file .env SEPOLIA_PAYMASTER "$SEPOLIA_PAYMASTER"

if [[ "$PAYMASTER_INITIAL_DEPOSIT_ETH" != "0" && "$PAYMASTER_INITIAL_DEPOSIT_ETH" != "0.0" ]]; then
  echo "Depositing ${PAYMASTER_INITIAL_DEPOSIT_ETH} ETH into Sepolia paymaster EntryPoint balance..."
  cast send "$SEPOLIA_PAYMASTER" \
    "deposit()" \
    --value "${PAYMASTER_INITIAL_DEPOSIT_ETH}ether" \
    --rpc-url "$SEPOLIA_RPC_URL" \
    --private-key "$SEPOLIA_PRIVATE_KEY" > /dev/null
fi

PAYMASTER_DEPOSIT=$(cast call "$SEPOLIA_ENTRY_POINT" "balanceOf(address)(uint256)" "$SEPOLIA_PAYMASTER" --rpc-url "$SEPOLIA_RPC_URL")

if [[ "$UPDATE_FRONTEND_ENV" == "true" ]]; then
  update_env_file "$FRONTEND_ENV_FILE" NEXT_PUBLIC_CHAIN_ID "$CHAIN_ID"
  update_env_file "$FRONTEND_ENV_FILE" NEXT_PUBLIC_CHAIN_NAME "Sepolia"
  update_env_file "$FRONTEND_ENV_FILE" NEXT_PUBLIC_LOG_LOOKBACK_BLOCKS "10"
  update_env_file "$FRONTEND_ENV_FILE" NEXT_PUBLIC_RPC_URL "$SEPOLIA_RPC_URL"
  update_env_file "$FRONTEND_ENV_FILE" AA_RPC_URL "$SEPOLIA_RPC_URL"
  update_env_file "$FRONTEND_ENV_FILE" AA_BUNDLER_URL "$SEPOLIA_AA_BUNDLER_URL"
  update_env_file "$FRONTEND_ENV_FILE" NEXT_PUBLIC_ENTRYPOINT_ADDRESS "$SEPOLIA_ENTRY_POINT"
  update_env_file "$FRONTEND_ENV_FILE" AA_ENTRYPOINT_ADDRESS "$SEPOLIA_ENTRY_POINT"
  update_env_file "$FRONTEND_ENV_FILE" NEXT_PUBLIC_ACCOUNT_FACTORY_ADDRESS "$SEPOLIA_ACCOUNT_FACTORY"
  update_env_file "$FRONTEND_ENV_FILE" NEXT_PUBLIC_LOTTO_FACTORY_ADDRESS "$SEPOLIA_LOTTO_FACTORY"
  update_env_file "$FRONTEND_ENV_FILE" NEXT_PUBLIC_ENTRY_TOKEN_ADDRESS "$SEPOLIA_ENTRY_TOKEN"
  update_env_file "$FRONTEND_ENV_FILE" AA_PAYMASTER_ADDRESS "$SEPOLIA_PAYMASTER"
  update_env_file "$FRONTEND_ENV_FILE" NEXT_PUBLIC_PAYMASTER_ADDRESS "$SEPOLIA_PAYMASTER"
fi

echo "✓ Updated contracts/.env:"
echo "  SEPOLIA_ACCOUNT_FACTORY=$SEPOLIA_ACCOUNT_FACTORY"
echo "  SEPOLIA_LOTTO_FACTORY=$SEPOLIA_LOTTO_FACTORY"
echo "  SEPOLIA_ENTRY_TOKEN=$SEPOLIA_ENTRY_TOKEN"
echo "  SEPOLIA_PAYMASTER=$SEPOLIA_PAYMASTER"
echo "✓ Registered LottoFactory as VRF consumer"
echo "✓ Sepolia paymaster deposit:"
echo "  balanceOf($SEPOLIA_PAYMASTER)=$PAYMASTER_DEPOSIT wei"

if [[ "$UPDATE_FRONTEND_ENV" == "true" ]]; then
  echo "✓ Updated frontend/.env.local for Sepolia"
  echo "  NEXT_PUBLIC_CHAIN_ID=$CHAIN_ID"
  echo "  NEXT_PUBLIC_CHAIN_NAME=Sepolia"
  echo "  NEXT_PUBLIC_LOG_LOOKBACK_BLOCKS=10"
  echo "  NEXT_PUBLIC_RPC_URL=$SEPOLIA_RPC_URL"
  echo "  AA_RPC_URL=$SEPOLIA_RPC_URL"
  echo "  AA_BUNDLER_URL=$SEPOLIA_AA_BUNDLER_URL"
else
  echo "Note: frontend/.env.local was not updated. Set UPDATE_FRONTEND_ENV_FOR_SEPOLIA=true to point the frontend at Sepolia."
fi
