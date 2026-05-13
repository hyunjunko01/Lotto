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

CHAIN_ID="${BASE_SEPOLIA_CHAIN_ID:-84532}"
PAYMASTER_INITIAL_DEPOSIT_ETH="${BASE_SEPOLIA_PAYMASTER_INITIAL_DEPOSIT_ETH:-0.005}"
# Longer wait for tx receipts reduces false retries (EOA nonce changed / nonce too low) on public RPC.
FORGE_SCRIPT_TIMEOUT="${FORGE_SCRIPT_TIMEOUT:-300}"

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

  code=$(cast code "$address" --rpc-url "$BASE_SEPOLIA_RPC_URL")
  if [[ -z "$code" || "$code" == "0x" ]]; then
    echo "Error: $label has no bytecode at $address"
    exit 1
  fi
}

deploy_script() {
  local script_path="$1"
  local nonce
  nonce=$(cast nonce "$DEPLOYER" --rpc-url "$BASE_SEPOLIA_RPC_URL")
  echo "Running $script_path... (deployer latest nonce: $nonce)"
  forge script "$script_path" \
    --rpc-url "$BASE_SEPOLIA_RPC_URL" \
    --private-key "$BASE_SEPOLIA_PRIVATE_KEY" \
    --broadcast \
    --slow \
    --non-interactive \
    --timeout "$FORGE_SCRIPT_TIMEOUT"
}

require_cmd forge
require_cmd jq
require_cmd cast

require_env BASE_SEPOLIA_RPC_URL
require_env BASE_SEPOLIA_PRIVATE_KEY
require_env BASE_SEPOLIA_ENTRY_POINT
require_env BASE_SEPOLIA_VRF_COORDINATOR
require_env BASE_SEPOLIA_VRF_KEYHASH
require_env BASE_SEPOLIA_SUBSCRIPTION_ID

echo "Checking Base Sepolia dependencies..."
require_deployed_code "Base Sepolia EntryPoint" "$BASE_SEPOLIA_ENTRY_POINT"
require_deployed_code "Base Sepolia VRF coordinator" "$BASE_SEPOLIA_VRF_COORDINATOR"

DEPLOYER=$(cast wallet address --private-key "$BASE_SEPOLIA_PRIVATE_KEY")
DEPLOYER_BALANCE=$(cast balance "$DEPLOYER" --rpc-url "$BASE_SEPOLIA_RPC_URL")
echo "Deployer: $DEPLOYER"
echo "Deployer balance: $DEPLOYER_BALANCE wei"

deploy_script script/deploy/DeployAccount.s.sol
ACCOUNT_BROADCAST_JSON="broadcast/DeployAccount.s.sol/${CHAIN_ID}/run-latest.json"
require_file "$ACCOUNT_BROADCAST_JSON"
BASE_SEPOLIA_ACCOUNT_FACTORY=$(extract_create_address "$ACCOUNT_BROADCAST_JSON" "AccountFactory")
if [[ -z "$BASE_SEPOLIA_ACCOUNT_FACTORY" || "$BASE_SEPOLIA_ACCOUNT_FACTORY" == "null" ]]; then
  echo "Error: Could not extract Base Sepolia AccountFactory address"
  exit 1
fi
update_env_file .env BASE_SEPOLIA_ACCOUNT_FACTORY "$BASE_SEPOLIA_ACCOUNT_FACTORY"

deploy_script script/deploy/DeployEntryToken.s.sol
ENTRY_TOKEN_BROADCAST_JSON="broadcast/DeployEntryToken.s.sol/${CHAIN_ID}/run-latest.json"
require_file "$ENTRY_TOKEN_BROADCAST_JSON"
BASE_SEPOLIA_ENTRY_TOKEN=$(extract_create_address "$ENTRY_TOKEN_BROADCAST_JSON" "LottoEntryToken")
if [[ -z "$BASE_SEPOLIA_ENTRY_TOKEN" || "$BASE_SEPOLIA_ENTRY_TOKEN" == "null" ]]; then
  echo "Error: Could not extract Base Sepolia LottoEntryToken address"
  exit 1
fi
update_env_file .env BASE_SEPOLIA_ENTRY_TOKEN "$BASE_SEPOLIA_ENTRY_TOKEN"

deploy_script script/deploy/DeployLotto.s.sol
LOTTO_BROADCAST_JSON="broadcast/DeployLotto.s.sol/${CHAIN_ID}/run-latest.json"
require_file "$LOTTO_BROADCAST_JSON"
BASE_SEPOLIA_LOTTO_FACTORY=$(extract_create_address "$LOTTO_BROADCAST_JSON" "LottoFactory")
if [[ -z "$BASE_SEPOLIA_LOTTO_FACTORY" || "$BASE_SEPOLIA_LOTTO_FACTORY" == "null" ]]; then
  echo "Error: Could not extract Base Sepolia LottoFactory address"
  exit 1
fi
update_env_file .env BASE_SEPOLIA_LOTTO_FACTORY "$BASE_SEPOLIA_LOTTO_FACTORY"

set -a
source .env
set +a

echo "Registering Base Sepolia LottoFactory as VRF consumer..."
deploy_script script/setup/ConfigureVrfConsumer.s.sol

deploy_script script/deploy/DeployPaymaster.s.sol
PAYMASTER_BROADCAST_JSON="broadcast/DeployPaymaster.s.sol/${CHAIN_ID}/run-latest.json"
require_file "$PAYMASTER_BROADCAST_JSON"
BASE_SEPOLIA_PAYMASTER=$(extract_create_address "$PAYMASTER_BROADCAST_JSON" "LottoPaymaster")
if [[ -z "$BASE_SEPOLIA_PAYMASTER" || "$BASE_SEPOLIA_PAYMASTER" == "null" ]]; then
  echo "Error: Could not extract Base Sepolia LottoPaymaster address"
  exit 1
fi
update_env_file .env BASE_SEPOLIA_PAYMASTER "$BASE_SEPOLIA_PAYMASTER"

if [[ "$PAYMASTER_INITIAL_DEPOSIT_ETH" != "0" && "$PAYMASTER_INITIAL_DEPOSIT_ETH" != "0.0" ]]; then
  echo "Depositing ${PAYMASTER_INITIAL_DEPOSIT_ETH} ETH into Base Sepolia paymaster EntryPoint balance..."
  cast send "$BASE_SEPOLIA_PAYMASTER" \
    "deposit()" \
    --value "${PAYMASTER_INITIAL_DEPOSIT_ETH}ether" \
    --rpc-url "$BASE_SEPOLIA_RPC_URL" \
    --private-key "$BASE_SEPOLIA_PRIVATE_KEY" > /dev/null
fi

PAYMASTER_DEPOSIT=$(cast call "$BASE_SEPOLIA_ENTRY_POINT" "balanceOf(address)(uint256)" "$BASE_SEPOLIA_PAYMASTER" --rpc-url "$BASE_SEPOLIA_RPC_URL")

echo "✓ Updated contracts/.env:"
echo "  BASE_SEPOLIA_ACCOUNT_FACTORY=$BASE_SEPOLIA_ACCOUNT_FACTORY"
echo "  BASE_SEPOLIA_LOTTO_FACTORY=$BASE_SEPOLIA_LOTTO_FACTORY"
echo "  BASE_SEPOLIA_ENTRY_TOKEN=$BASE_SEPOLIA_ENTRY_TOKEN"
echo "  BASE_SEPOLIA_PAYMASTER=$BASE_SEPOLIA_PAYMASTER"
echo "✓ Registered LottoFactory as VRF consumer"
echo "✓ Base Sepolia paymaster deposit:"
echo "  balanceOf($BASE_SEPOLIA_PAYMASTER)=$PAYMASTER_DEPOSIT wei"
