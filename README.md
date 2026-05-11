# Lotto-AA

`Lotto-AA` is a lottery dApp portfolio project with two user paths:

- **MetaMask (EOA) flow**
- **Web3Auth + ERC-4337 Account Abstraction (AA) flow**

The project uses **Chainlink VRF** for winner randomness and includes a **deadlock recovery path** when VRF callback is delayed.

## What This Project Demonstrates

- Clone-based lottery deployment with `LottoFactory` + `LottoImplementation` (EIP-1167 style)
- Verifiable winner selection through Chainlink VRF
- ERC-4337 user operation flow (sign + bundler submit)
- Selector-restricted paymaster policy for sponsored actions
- Recovery design for a stuck `CALCULATING` state

## Core Contract Architecture

- `LottoFactory`
  - Deploys lottery instances
  - Tracks valid instance addresses
  - Requests and receives VRF randomness
  - Forwards randomness to each instance
- `LottoImplementation`
  - Handles join/request/finalize/withdraw logic
  - Supports timeout-based refund mode when VRF is stuck
- `LottoPaymaster`
  - Allows only approved selectors on approved targets
  - Used for AA-sponsored operations

## Lotto State Machine

Normal flow:

`OPEN -> FULL -> CALCULATING -> CLOSED`

- `OPEN`: users can join
- `FULL`: users can request winner
- `CALCULATING`: waiting for VRF callback
- `CLOSED`: winner can withdraw prize

Recovery flow (deadlock handling):

`CALCULATING --(timeout + triggerRefundMode)--> REFUNDING`

- `REFUNDING`: participants claim refunds via `claimRefund()`

## Deadlock Recovery (CALCULATING Timeout)

If a lottery stays in `CALCULATING` too long:

1. Anyone calls `triggerRefundMode()` after `CALCULATING_TIMEOUT`
2. State moves to `REFUNDING`
3. Each participant calls `claimRefund()` for their refundable amount

Notes:

- `triggerRefundMode()` reverts before timeout (by design)
- Refunds are tracked per address and support multiple joins from one address

## Frontend Paths

- `/metamask`
  - Standard EOA transaction flow with wallet connection
- `/aa`
  - Web3Auth login + AA account flow
  - UserOp signing and bundler submission

Both detail pages include:

- `requestWinner`
- `triggerRefundMode`
- `withdrawPrize` / `claimRefund` depending on state

## Repository Structure

```text
contracts/
  src/
    Lotto/
    Account/Ethereum/
  script/
    config/
    setup/
    deploy/
  test/
    unit/
    Integration/

frontend/
  src/
    app/
    hooks/
    components/

scripts/
  setup_entrypoint.sh
  setup_vrf.sh
```

## Testing

Run contract tests from repo root:

```bash
forge test --root contracts
```

Focused suites:

```bash
forge test --root contracts --match-path test/unit/LottoImplementation.t.sol
forge test --root contracts --match-path test/Integration/LottoSystem.t.sol
forge test --root contracts --match-path test/Integration/LottoPaymaster.t.sol
```

## Deployment/Operation Notes

- Use testnet/local networks only for demo/testing.
- Keep paymaster funded if using sponsored AA operations.
- Ensure paymaster selector allowlist includes all intended Lotto actions:
  - `joinLotto`
  - `requestWinner`
  - `withdrawPrize`
  - `triggerRefundMode`
  - `claimRefund`

## Current Scope

This repository is intended as a **testnet portfolio project** and technical demonstration.
It is not production-hardened for real-money operation.

