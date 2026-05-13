.PHONY: setup-vrf setup-entrypoint setup-lotto setup-entry-token setup-paymaster sync-abis deploy deploy-sepolia deploy-base-sepolia deploy-base-sepolia-paymaster-create env-local-anvil env-local-sepolia env-local-base-sepolia fulfill-randomness bundler-start clean help

help:
	@echo "Available targets:"
	@echo "  make setup-vrf    - Deploy VRF mock, create subscription, and update .env"
	@echo "  make setup-entrypoint - Deploy/reuse EntryPoint on anvil and deploy AccountFactory"
	@echo "  make setup-lotto  - Deploy Lotto contracts and update env files"
	@echo "  make setup-entry-token - Deploy LottoEntryToken and update env files"
	@echo "  make setup-paymaster - Deploy LottoPaymaster and update env files"
	@echo "  make sync-abis   - Build contracts and sync frontend ABI files"
	@echo "  make fulfill-randomness LOTTO=0x... - Fulfill latest VRF request for a lotto instance"
	@echo "  make fulfill-randomness 0x...       - Same as above (positional address)"
	@echo "  make deploy       - Run Anvil setup-vrf, setup-entrypoint, setup-lotto"
	@echo "  make deploy-sepolia - Deploy Sepolia contracts and update contracts/.env"
	@echo "  make deploy-base-sepolia - Deploy Base Sepolia contracts and update contracts/.env"
	@echo "  make deploy-base-sepolia-paymaster-create - Deploy only Base Sepolia paymaster via forge create"
	@echo "  make env-local-anvil - Update frontend/.env.local from contracts/.env (Anvil values)"
	@echo "  make env-local-sepolia - Update frontend/.env.local from contracts/.env (Sepolia values)"
	@echo "  make env-local-base-sepolia - Update frontend/.env.local from contracts/.env (Base Sepolia values)"
	@echo "  make bundler-start - Start local Pimlico Alto bundler"
	@echo "  make clean        - Remove broadcast and cache artifacts"

setup-vrf:
	@chmod +x scripts/deploy/anvil/setup_vrf.sh && ./scripts/deploy/anvil/setup_vrf.sh

setup-entrypoint:
	@chmod +x scripts/deploy/anvil/setup_entrypoint.sh && ./scripts/deploy/anvil/setup_entrypoint.sh

setup-lotto:
	@chmod +x scripts/deploy/anvil/setup_lotto.sh && ./scripts/deploy/anvil/setup_lotto.sh

setup-entry-token:
	@chmod +x scripts/deploy/anvil/setup_entry_token.sh && ./scripts/deploy/anvil/setup_entry_token.sh

setup-paymaster:
	@chmod +x scripts/deploy/anvil/setup_paymaster.sh && ./scripts/deploy/anvil/setup_paymaster.sh

sync-abis:
	@chmod +x scripts/frontend/sync_abi.sh && ./scripts/frontend/sync_abi.sh

deploy: setup-vrf setup-entrypoint setup-lotto setup-entry-token setup-paymaster sync-abis

deploy-sepolia:
	@chmod +x scripts/deploy/sepolia/deploy.sh && ./scripts/deploy/sepolia/deploy.sh

deploy-base-sepolia:
	@chmod +x scripts/deploy/base_sepolia/deploy.sh && ./scripts/deploy/base_sepolia/deploy.sh

deploy-base-sepolia-paymaster-create:
	@chmod +x scripts/deploy/base_sepolia/deploy_paymaster_create.sh && ./scripts/deploy/base_sepolia/deploy_paymaster_create.sh

env-local-anvil:
	@chmod +x scripts/frontend/update_env_local_anvil.sh && ./scripts/frontend/update_env_local_anvil.sh

env-local-sepolia:
	@chmod +x scripts/frontend/update_env_local_sepolia.sh && ./scripts/frontend/update_env_local_sepolia.sh

env-local-base-sepolia:
	@chmod +x scripts/frontend/update_env_local_base_sepolia.sh && ./scripts/frontend/update_env_local_base_sepolia.sh

fulfill-randomness:
	@LOTTO_ADDR="$(if $(LOTTO),$(LOTTO),$(filter 0x%,$(MAKECMDGOALS)))"; \
	chmod +x scripts/deploy/anvil/fulfill_randomness.sh && ./scripts/deploy/anvil/fulfill_randomness.sh "$$LOTTO_ADDR"

# Allow positional address usage:
# make fulfill-randomness 0xabc...
0x%:
	@:

bundler-start:
	@bash scripts/deploy/anvil/start_bundler.sh

clean:
	@cd contracts && rm -rf broadcast cache out
	@echo "Cleaned broadcast, cache, and out directories"
