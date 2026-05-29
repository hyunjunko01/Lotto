# Lotto-AA

Testnet portfolio project focused on **smart contract design**: clone-based lottery instances, Chainlink VRF winner selection, and a timeout-based refund path when VRF is delayed. A minimal frontend on [Vercel](https://lottoproject.vercel.app/) demonstrates EOA and ERC-4337 flows against deployed contracts.

**Live demo:** [https://lottoproject.vercel.app/](https://lottoproject.vercel.app/) (Base Sepolia)

## What This Project Demonstrates

- EIP-1167 minimal proxy pattern (`LottoFactory` + `LottoImplementation`)
- Centralized VRF integration in the factory (instances request randomness via the factory)
- Explicit lotto state machine with liveness recovery (`CALCULATING` → `REFUNDING`)
- ERC-4337 stack: `EthAccount`, `AccountFactory`, selector-restricted `LottoPaymaster`
- Foundry unit and integration tests (full flow, multi-instance, refund path, paymaster policy)

## Core Contracts

| Contract | Role |
|----------|------|
| `LottoFactory` | Deploys lotto clones, owns VRF subscription flow, forwards randomness to instances |
| `LottoImplementation` | Per-instance logic: join, request winner, finalize, withdraw, refund |
| `LottoEntryToken` | ERC-20 entry/prize token (test faucet for demo) |
| `EthAccount` | ERC-4337 smart account (ECDSA validation, `execute` to external targets) |
| `AccountFactory` | Deterministic minimal-proxy deploy for `EthAccount` |
| `LottoPaymaster` | Sponsors UserOps only for allowlisted targets and selectors |

### `LottoFactory`

- `createLotto(entryFee, maxPlayers, entryToken)` — clone + `initialize`
- `requestWinnerRandomness()` — callable only by registered lotto instances
- `fulfillRandomWords()` — VRF callback; calls `finalizeWinner` on the matching instance

### `LottoImplementation`

- `joinLotto()` — ERC-20 entry fee; transitions to `FULL` at `maxPlayers`
- `requestWinner()` — moves to `CALCULATING`, requests VRF via factory
- `finalizeWinner(randomness)` — factory-only; picks winner, `CLOSED`
- `withdrawPrize()` — winner withdraws pool
- `triggerRefundMode()` — after `CALCULATING_TIMEOUT` (1 day), anyone can enable refunds
- `claimRefund()` — per-address refund in `REFUNDING`

### `LottoPaymaster`

Default allowlist includes factory `createLotto`, lotto `joinLotto` / `requestWinner` / `withdrawPrize` / `triggerRefundMode` / `claimRefund`, and entry-token `claimTestTokens` / `approve`. Owner can update mappings.

## State Machine

Normal flow:

```text
OPEN → FULL → CALCULATING → CLOSED
```

Recovery when VRF callback is stuck:

```text
CALCULATING --(timeout + triggerRefundMode)--> REFUNDING
```

| State | Meaning |
|-------|---------|
| `OPEN` | Join allowed |
| `FULL` | Cap reached; `requestWinner` allowed |
| `CALCULATING` | Awaiting VRF fulfillment |
| `CLOSED` | Winner set; `withdrawPrize` allowed |
| `REFUNDING` | `claimRefund` allowed per participant |

## Deadlock Recovery

If a lotto remains in `CALCULATING` longer than `CALCULATING_TIMEOUT`:

1. Anyone calls `triggerRefundMode()` after the timeout elapses.
2. State becomes `REFUNDING`.
3. Each participant calls `claimRefund()` for their tracked `refundableAmount` (supports multiple joins from the same address).

`finalizeWinner` only runs in `CALCULATING`, so refund mode and VRF fulfillment do not double-settle.

## Base Sepolia (Demo Deployment)

| Contract | Address |
|----------|---------|
| LottoFactory | [`0x09fd0737ef78e25ad482ffacb1a8d0c9831033d0`](https://sepolia.basescan.org/address/0x09fd0737ef78e25ad482ffacb1a8d0c9831033d0) |
| AccountFactory | [`0x9aae48c6513d81100c7c28b457c5521a392dba63`](https://sepolia.basescan.org/address/0x9aae48c6513d81100c7c28b457c5521a392dba63) |
| LottoEntryToken (LET) | [`0x44a964abf084fe20f3661e0fbf7b6db6ee584ba3`](https://sepolia.basescan.org/address/0x44a964abf084fe20f3661e0fbf7b6db6ee584ba3) |
| LottoPaymaster | [`0x80E8E1Bec1b4dD5D7f806859857CC7B36D035f20`](https://sepolia.basescan.org/address/0x80E8E1Bec1b4dD5D7f806859857CC7B36D035f20) |

Chain ID: `84532`. The live app is wired to these addresses via deployment env config.

## Repository Layout

```text
contracts/
  src/Lotto/              LottoFactory, LottoImplementation, LottoEntryToken
  src/Account/Ethereum/   EthAccount, AccountFactory, LottoPaymaster
  script/                 setup, deploy (anvil, sepolia, base_sepolia)
  test/unit/              per-contract tests
  test/Integration/       end-to-end lotto + paymaster flows

frontend/                 Next.js demo UI (not the focus of this README)
scripts/                  local setup helpers
```

## Testing

From the repo root:

```bash
forge test --root contracts
```

Focused suites:

```bash
forge test --root contracts --match-path test/unit/LottoImplementation.t.sol
forge test --root contracts --match-path test/unit/LottoFactory.t.sol
forge test --root contracts --match-path test/Integration/LottoSystem.t.sol
forge test --root contracts --match-path test/Integration/LottoPaymaster.t.sol
```

CI runs `forge fmt --check`, `forge build`, and `forge test` on push/PR.

## Local Contract Development

```bash
# Anvil + deploy scripts (see scripts/deploy/anvil/)
./scripts/deploy/anvil/setup_entrypoint.sh
./scripts/deploy/anvil/setup_vrf.sh
./scripts/deploy/anvil/setup_lotto.sh
```

VRF on local networks uses Chainlink mocks; see `contracts/script/setup/`.

## Scope and Limitations

- **Testnet / portfolio only** — not audited or hardened for real funds.
- Demo token and faucet are for testing, not production economics.
- Same address may join a lotto multiple times (increases that address’s weight in the winner index); acceptable for demo, not fair-lottery production semantics.
- `randomness % maxPlayers` has standard modulo bias unless `maxPlayers` is a power of two.
- Paymaster must stay funded for sponsored AA transactions on demo networks.
