# Lotto-AA

A scalable Web3 lottery application designed for seamless user experience.

## 🏗 Contracts

### Core Logic
- Leverages **Chainlink VRF** for verifiable, tamper-proof randomness to ensure fair winner selection.

### Architecture
Implemented using the **Factory-Clone Pattern** for maximum efficiency.

- **LottoFactory**: Manages the lifecycle of lottery instances and serves as the central gateway for Chainlink VRF requests.
- **LottoImplementation**: Contains the core game logic. Deployed as a **Minimal Proxy (EIP-1167)** to ensure high scalability and minimize deployment gas costs.

## 🛡 Account Abstraction (AA)
- Integrates **Account Abstraction (ERC-4337)** to lower the barrier to entry, providing a Web2-like UX (e.g., gasless transactions, social login) for Web3 newcomers.

## 📁 Project Structure

```text
contracts/
	script/
		config/
			HelperConfig.s.sol        # Reads env-driven deployment config
		setup/
			SetupEntryPoint.s.sol     # Deploys EntryPoint
			SetupVrf.s.sol            # Deploys VRF mock + subscription setup logic
		deploy/
			DeployAccount.s.sol       # Deploys AA account system using HelperConfig
			DeployLotto.s.sol         # Deploys Lotto system using HelperConfig
	test/
		Integration/                # Integration tests (env-independent local setup)
		unit/

scripts/
	setup_entrypoint.sh           # Broadcast + receipt parsing + .env update
	setup_vrf.sh                  # Broadcast + receipt parsing + .env update
```

## 🔄 Workflow Split

- **Deployment path**: `scripts/*.sh` + `contracts/script/config/HelperConfig.s.sol`
- **Test path**: integration tests deploy dependencies locally in `setUp()` and do not rely on `.env` or receipt parsing

