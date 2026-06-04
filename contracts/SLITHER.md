# Slither (local)

## Setup

```bash
cd contracts
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
```

## Run

```bash
./tools/slither.sh
# or, with report file:
./tools/slither.sh 2>&1 | tee slither-baseline.txt
```

Exit code `255` means informational findings were reported (normal for this repo).

## Scope

- **In scope:** `src/` (first-party contracts)
- **Out of scope:** `lib/`, `test/`, `script/` (`include_paths` in `slither.config.json`)

Slither reads **`slither.config.json`** (not `.slither.config.json`). Use `--include-paths` to show only matching paths; `--filter-paths` **excludes** matches (opposite).

## Baseline (first-party, 2026-06)

| Severity | Count | Notes |
|----------|-------|--------|
| High | 0 | — |
| Medium | 0 | — |
| Low / Info | see scan output | Mostly ERC-4337 / demo patterns |

### Triage (actionable vs accepted)

| Finding | Contract | Action |
|---------|----------|--------|
| `reentrancy-vulnerabilities-1` on `fulfillRandomWords` | `LottoFactory` | **Fixed** — clear `s_requestIdToLotto` before `finalizeWinner` (CEI) |
| `reentrancy-vulnerabilities-2/3` on `createLotto`, `requestWinnerRandomness`, `requestWinner` | Factory / Implementation | **Accepted** — clone `initialize` has no external calls; VRF is async; lotto clone is not reentrant |
| `unused-return` on `requestWinnerRandomness()` | `LottoImplementation` | **Documented** — `slither-disable-next-line`; clone does not need `requestId` |
| `arbitrary-send-eth` / `return-bomb` on `_payPrefund` | `EthAccount` | **Accepted** — EntryPoint prefund pattern |
| `timestamp` on `claimTestTokens`, `triggerRefundMode` | Entry token / Lotto | **Accepted** — demo faucet cooldown; refund liveness timeout |
| `missing-zero-check` on constructors / `initialize` | Several | **Accepted** — deploy-time configuration; testnet demo |
| `modulo` / fairness | `finalizeWinner` | **Known (L2)** — tracked in `SECURITY.md` §5 |

## Code change from baseline

- `LottoFactory.fulfillRandomWords`: delete VRF request mapping before external `finalizeWinner` call.
