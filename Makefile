.PHONY: setup-vrf setup-entrypoint setup-lotto setup-entry-token setup-paymaster sync-abis deploy fulfill-randomness bundler-start clean help

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
	@echo "  make deploy       - Run setup-vrf, setup-entrypoint, setup-lotto"
	@echo "  make bundler-start - Start local Pimlico Alto bundler"
	@echo "  make clean        - Remove broadcast and cache artifacts"

setup-vrf:
	@chmod +x scripts/setup_vrf.sh && ./scripts/setup_vrf.sh

setup-entrypoint:
	@chmod +x scripts/setup_entrypoint.sh && ./scripts/setup_entrypoint.sh

setup-lotto:
	@chmod +x scripts/setup_lotto.sh && ./scripts/setup_lotto.sh

setup-entry-token:
	@chmod +x scripts/setup_entry_token.sh && ./scripts/setup_entry_token.sh

setup-paymaster:
	@chmod +x scripts/setup_paymaster.sh && ./scripts/setup_paymaster.sh

sync-abis:
	@chmod +x scripts/sync-abi.sh && ./scripts/sync-abi.sh

deploy: setup-vrf setup-entrypoint setup-lotto setup-entry-token setup-paymaster sync-abis

fulfill-randomness:
	@LOTTO_ADDR="$(if $(LOTTO),$(LOTTO),$(filter 0x%,$(MAKECMDGOALS)))"; \
	chmod +x scripts/fulfill_randomness.sh && ./scripts/fulfill_randomness.sh "$$LOTTO_ADDR"

# Allow positional address usage:
# make fulfill-randomness 0xabc...
0x%:
	@:

bundler-start:
	@bash scripts/start_bundler.sh

clean:
	@cd contracts && rm -rf broadcast cache out
	@echo "Cleaned broadcast, cache, and out directories"
