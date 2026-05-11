#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Error: required command not found: $cmd"
    exit 1
  fi
}

require_cmd forge
require_cmd node

echo "Building contract artifacts..."
forge build --root "$ROOT_DIR/contracts"

echo "Syncing frontend ABIs..."
ROOT_DIR="$ROOT_DIR" node <<'NODE'
const fs = require('fs');
const path = require('path');

const rootDir = process.env.ROOT_DIR;
const contractsOutDir = path.join(rootDir, 'contracts/out');
const frontendAbiDir = path.join(rootDir, 'frontend/src/contracts');

const targetContracts = [
  { source: 'AccountFactory.sol', name: 'AccountFactory' },
  { source: 'EthAccount.sol', name: 'EthAccount' },
  { source: 'LottoEntryToken.sol', name: 'LottoEntryToken' },
  { source: 'LottoFactory.sol', name: 'LottoFactory' },
  { source: 'LottoImplementation.sol', name: 'LottoImplementation' },
  { source: 'LottoPaymaster.sol', name: 'LottoPaymaster' },
];

fs.mkdirSync(frontendAbiDir, { recursive: true });

for (const { source, name } of targetContracts) {
  const artifactPath = path.join(contractsOutDir, source, `${name}.json`);
  if (!fs.existsSync(artifactPath)) {
    console.warn(`Warning: ${name}.json not found in ${artifactPath}`);
    continue;
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  fs.writeFileSync(path.join(frontendAbiDir, `${name}.json`), JSON.stringify(artifact.abi, null, 2));
  console.log(`${name}.json synced`);
}

console.log('All ABIs are up to date.');
NODE
