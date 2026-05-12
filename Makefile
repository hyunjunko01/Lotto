.PHONY: setup-vrf setup-entrypoint setup-lotto setup-entry-token setup-paymaster sync-abis deploy deploy-sepolia fulfill-randomness bundler-start clean help

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
	@echo "  make bundler-start - Start local Pimlico Alto bundler"
	@echo "  make clean        - Remove broadcast and cache artifacts"

setup-vrf:
	@chmod +x scripts/anvil/setup_vrf.sh && ./scripts/anvil/setup_vrf.sh

setup-entrypoint:
	@chmod +x scripts/anvil/setup_entrypoint.sh && ./scripts/anvil/setup_entrypoint.sh

setup-lotto:
	@chmod +x scripts/anvil/setup_lotto.sh && ./scripts/anvil/setup_lotto.sh

setup-entry-token:
	@chmod +x scripts/anvil/setup_entry_token.sh && ./scripts/anvil/setup_entry_token.sh

setup-paymaster:
	@chmod +x scripts/anvil/setup_paymaster.sh && ./scripts/anvil/setup_paymaster.sh

sync-abis:
	@chmod +x scripts/sync-abi.sh && ./scripts/sync-abi.sh

deploy: setup-vrf setup-entrypoint setup-lotto setup-entry-token setup-paymaster sync-abis

deploy-sepolia:
	@chmod +x scripts/sepolia/deploy_sepolia.sh && ./scripts/sepolia/deploy_sepolia.sh

fulfill-randomness:
	@LOTTO_ADDR="$(if $(LOTTO),$(LOTTO),$(filter 0x%,$(MAKECMDGOALS)))"; \
	chmod +x scripts/anvil/fulfill_randomness.sh && ./scripts/anvil/fulfill_randomness.sh "$$LOTTO_ADDR"

# Allow positional address usage:
# make fulfill-randomness 0xabc...
0x%:
	@:

bundler-start:
	@bash scripts/anvil/start_bundler.sh

clean:
	@cd contracts && rm -rf broadcast cache out
	@echo "Cleaned broadcast, cache, and out directories"
