// frontend/scripts/sync-abi.js
const fs = require('fs');
const path = require('path');

// 1. Define paths
const CONTRACTS_OUT_DIR = path.join(__dirname, '../../../contracts/out');
const FRONTEND_ABI_DIR = path.join(__dirname, '../src/contracts/');

// 2. If the frontend ABI directory doesn't exist, create it
if (!fs.existsSync(FRONTEND_ABI_DIR)) {
    fs.mkdirSync(FRONTEND_ABI_DIR, { recursive: true });
}

// 3. main contract list
const TARGET_CONTRACTS = ['LottoFactory', 'AccountFactory'];

function syncAbis() {
    console.log('🚀 Syncing ABIs from Foundry to Frontend...');

    TARGET_CONTRACTS.forEach((contractName) => {
        const filePath = path.join(CONTRACTS_OUT_DIR, `${contractName}.sol`, `${contractName}.json`);

        if (fs.existsSync(filePath)) {
            const artifact = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            // Extract only the 'abi' part and save it
            const data = JSON.stringify(artifact.abi, null, 2);

            fs.writeFileSync(path.join(FRONTEND_ABI_DIR, `${contractName}.json`), data);
            console.log(`✅ ${contractName}.json synced!`);
        } else {
            console.warn(`⚠️  Warning: ${contractName}.json not found in ${filePath}`);
        }
    });

    console.log('✨ All ABIs are up to date!');
}

syncAbis();