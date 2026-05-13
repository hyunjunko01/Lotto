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

PAYMASTER_INITIAL_DEPOSIT_ETH="${BASE_SEPOLIA_PAYMASTER_INITIAL_DEPOSIT_ETH:-0.005}"

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Error: required command not found: $cmd"
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

require_cmd forge
require_cmd cast

require_env BASE_SEPOLIA_RPC_URL
require_env BASE_SEPOLIA_PRIVATE_KEY
require_env BASE_SEPOLIA_ENTRY_POINT
require_env BASE_SEPOLIA_LOTTO_FACTORY
require_env BASE_SEPOLIA_ENTRY_TOKEN

DEPLOYER=$(cast wallet address --private-key "$BASE_SEPOLIA_PRIVATE_KEY")
DEPLOYER_NONCE=$(cast nonce "$DEPLOYER" --rpc-url "$BASE_SEPOLIA_RPC_URL")

echo "Deploying LottoPaymaster via forge create..."
echo "Deployer: $DEPLOYER"
echo "Current nonce: $DEPLOYER_NONCE"

OUT=$(
  forge create "src/Account/Ethereum/LottoPaymaster.sol:LottoPaymaster" \
    --rpc-url "$BASE_SEPOLIA_RPC_URL" \
    --private-key "$BASE_SEPOLIA_PRIVATE_KEY" \
    --broadcast \
    --constructor-args \
      "$BASE_SEPOLIA_ENTRY_POINT" \
      "$DEPLOYER" \
      "$BASE_SEPOLIA_LOTTO_FACTORY" \
      "$BASE_SEPOLIA_ENTRY_TOKEN" \
    2>&1
)

echo "$OUT"

BASE_SEPOLIA_PAYMASTER=$(echo "$OUT" | grep -i "^deployed to:" | head -1 | sed 's/.*: *//' | tr -d '\r' | xargs)
if [[ -z "$BASE_SEPOLIA_PAYMASTER" ]]; then
  echo "Error: failed to parse deployed address from forge create output"
  exit 1
fi

CODE=$(cast code "$BASE_SEPOLIA_PAYMASTER" --rpc-url "$BASE_SEPOLIA_RPC_URL")
if [[ -z "$CODE" || "$CODE" == "0x" ]]; then
  echo "Error: no bytecode found at deployed paymaster address: $BASE_SEPOLIA_PAYMASTER"
  exit 1
fi

update_env_file .env BASE_SEPOLIA_PAYMASTER "$BASE_SEPOLIA_PAYMASTER"

if [[ "$PAYMASTER_INITIAL_DEPOSIT_ETH" != "0" && "$PAYMASTER_INITIAL_DEPOSIT_ETH" != "0.0" ]]; then
  echo "Depositing ${PAYMASTER_INITIAL_DEPOSIT_ETH} ETH into paymaster EntryPoint balance..."
  cast send "$BASE_SEPOLIA_PAYMASTER" \
    "deposit()" \
    --value "${PAYMASTER_INITIAL_DEPOSIT_ETH}ether" \
    --rpc-url "$BASE_SEPOLIA_RPC_URL" \
    --private-key "$BASE_SEPOLIA_PRIVATE_KEY" > /dev/null
fi

PAYMASTER_DEPOSIT=$(cast call "$BASE_SEPOLIA_ENTRY_POINT" "balanceOf(address)(uint256)" "$BASE_SEPOLIA_PAYMASTER" --rpc-url "$BASE_SEPOLIA_RPC_URL")

echo "✓ Updated contracts/.env:"
echo "  BASE_SEPOLIA_PAYMASTER=$BASE_SEPOLIA_PAYMASTER"
echo "✓ Base Sepolia paymaster deposit:"
echo "  balanceOf($BASE_SEPOLIA_PAYMASTER)=$PAYMASTER_DEPOSIT wei"
