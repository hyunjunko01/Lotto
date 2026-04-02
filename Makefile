.PHONY: setup-vrf setup-entrypoint deploy clean help

help:
	@echo "Available targets:"
	@echo "  make setup-vrf    - Deploy VRF mock, create subscription, and update .env"
	@echo "  make setup-entrypoint - Deploy EntryPoint and update .env"
	@echo "  make deploy       - Deploy Lotto contracts to anvil"
	@echo "  make clean        - Remove broadcast and cache artifacts"

setup-vrf:
	@chmod +x scripts/setup_vrf.sh && ./scripts/setup_vrf.sh

setup-entrypoint:
	@chmod +x scripts/setup_entrypoint.sh && ./scripts/setup_entrypoint.sh

deploy: setup-vrf setup-entrypoint
	@cd contracts && \
	bash -c 'set -a; source .env; set +a; \
	echo "Deploying Lotto contracts..."; \
	forge script script/deploy/DeployLotto.s.sol --rpc-url $$ANVIL_RPC_URL --private-key $$ANVIL_PRIVATE_KEY --broadcast'

clean:
	@cd contracts && rm -rf broadcast cache out
	@echo "Cleaned broadcast, cache, and out directories"
