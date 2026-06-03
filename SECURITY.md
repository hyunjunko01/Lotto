# Lotto Security

**Posture:** Testnet / portfolio demo — **not audited** for production funds.  
Use this doc before v2 contract changes, audits, or mainnet decisions.

**Related:** [README.md](./README.md) · [frontend API](./frontend/src/app/api/README.md)

---

## 1. Scope & posture

| | |
|---|---|
| **In scope** | On-chain lotto (factory + clones), demo entry token, ERC-4337 paymaster allowlist, AA relay API |
| **Out of scope (today)** | Production mainnet, real-money economics, external audit |
| **Audit** | Self-review only; no third-party audit report |

Deployments: Base Sepolia demo — see [README § Base Sepolia](./README.md#base-sepolia-demo-deployment).  
Do not reuse demo token / paymaster addresses on mainnet.

---

## 2. Goals & non-goals (Lotto v2)

| Goal | v1 (demo) | v2 target |
|------|-----------|-----------|
| Player funds safe in contract | Partial (test token, known gaps) | `[TODO]` |
| Fair winner selection | No (multi-join weighting, modulo bias) | `[TODO]` |
| Liveness if VRF stalls | Yes (`REFUNDING` path) | Maintain |
| AA / paymaster abuse resistance | Partial (selector allowlist) | `[TODO]` |
| Production readiness | No | `[TODO]` |

**Non-goals (candidates):** `[TODO — e.g. permissionless lotto on testnet only]`

---

## 3. Trust boundaries

```text
[User EOA / Web3Auth] ──sign──► [EthAccount] ──UserOp──► [EntryPoint] ──► [Lotto / Factory / Token]
                                      ▲
                                      │ sponsor (allowlisted calls)
                               [LottoPaymaster]

[Chainlink VRF] ──callback──► [LottoFactory] ──finalizeWinner──► [Lotto clone]

[Next.js API] ──relay only──► [Bundler]   (no server-side user keys)
```

| Boundary | Trusted | Untrusted |
|----------|---------|-----------|
| On-chain core | Chainlink VRF, EntryPoint, allowlisted ERC-20 | Any `msg.sender` |
| Factory | Deployer VRF config; owner sets `isAllowedEntryToken` | Arbitrary `entryToken` (blocked if not allowlisted) |
| Paymaster | Owner allowlist | Arbitrary UserOps (must fail validation) |
| Frontend API | Server env (RPC, bundler) | HTTP clients, UserOp payloads |
| Client | User wallet / Web3Auth | Browser |

**Sensitive paths (review first):**

- `LottoImplementation.finalizeWinner` — `randomness % maxPlayers`
- `LottoFactory.fulfillRandomWords` → `finalizeWinner`
- `triggerRefundMode` / `claimRefund` / `withdrawPrize`
- `LottoPaymaster._validatePaymasterUserOp`
- `frontend/src/app/api/aa/userop/send/route.ts`

**Access control (summary):**

| Function | Who can call |
|----------|----------------|
| `initialize` | Once per clone (via factory) |
| `finalizeWinner` | Factory only |
| `joinLotto` | Anyone while `OPEN` |
| `triggerRefundMode` | Anyone after `CALCULATING_TIMEOUT` |
| `requestWinnerRandomness` | Registered lotto instance |
| `setAllowedEntryToken` | Factory owner |
| `setAllowed*Selector` (paymaster) | Paymaster owner |

Off-chain (v1): UserOp `zod` validation, in-memory rate limits — details in [API README](./frontend/src/app/api/README.md).  
External deps: OpenZeppelin, Chainlink VRF v2 Plus, EntryPoint v0.7 — pin via `contracts/foundry.toml` / lockfiles.

---

## 4. Invariants & test coverage

**State machine:** `OPEN` → `FULL` → `CALCULATING` → `CLOSED` · recovery: `CALCULATING` → `REFUNDING`

| ID | Property | Status |
|----|----------|--------|
| I1 | No double payout (prize vs full refund) | **Implemented** (invariant + cross-path unit tests in `LottoImplementation.t.sol`) |
| I2 | Pool solvency: `balance >= obligations` | **Implemented** (single + multi-instance) |
| I3 | At most one VRF request per instance | **Implemented** (`isRandomnessRequested`) |
| I4 | Only factory may finalize winner | **Implemented** |
| I5 | Refund path and finalize cannot both settle same stake | **Implemented** (state + phase invariants) |
| I6 | Fair ticket odds | **Not in v1** — see §5 (L1, L2) |

**Run tests:**

```bash
forge test --root contracts
forge test --root contracts --match-contract LottoPoolSolvencyInvariant
forge test --root contracts --match-contract LottoNoDoublePayoutInvariant
```

**Files:**

- `contracts/test/invariant/LottoInvariantSetup.sol` (shared handler harness)
- `contracts/test/invariant/LottoPoolSolvencyInvariant.t.sol` (I2)
- `contracts/test/invariant/LottoNoDoublePayoutInvariant.t.sol` (I1)
- `contracts/test/invariant/LottoHandler.sol`
- `contracts/test/helpers/LottoPoolSolvency.sol`
- `contracts/test/helpers/LottoPoolStateProperties.sol`
- `contracts/test/helpers/LottoNoDoublePayout.sol`

**Not yet:** Slither in CI, production API rate-limit backend.

---

## 5. Known risks & v2 backlog

From [README limitations](./README.md#scope-and-limitations). Link PR/issue when closed.

| ID | Issue | Risk | Status |
|----|-------|------|--------|
| L1 | Same address may join multiple times | Fairness | Open |
| L2 | `randomness % maxPlayers` (modulo bias) | Fairness | Open |
| L3 | Open `createLotto` params | Spam / economics | **Partial** — entry-token allowlist in factory; `entryFee` / `maxPlayers` policy TBD |
| L4 | Demo token + `claimTestTokens` | Not prod economics | Open |
| L5 | No external audit | Unknown vulns | Open |
| L6 | Paymaster owner centralization | Policy / drain | Open |
| L7 | `joinLotto` external call surface | Reentrancy class | **Partial** — `nonReentrant` on `joinLotto`; allowlist reduces malicious token risk |

**Factory allowlist (ops):** After deploy, owner must call `setAllowedEntryToken(token, true)` before `createLotto` works for that token. Tests do this in `setUp`; production deploy is manual unless scripted.

**Paymaster (v2 checks):** arbitrary `execute` targets blocked; deposit monitoring; remove demo selectors on prod; owner key policy `[TODO]`.

---

## 6. Responsible disclosure

**Do not** open public GitHub issues for exploitable vulnerabilities.

| | |
|---|---|
| **Report to** | `[TODO: security@example.com]` |
| **Ack** | `[TODO: e.g. 72h]` |
| **In scope** | `[TODO: e.g. contracts/src/, production API routes]` |
| **Out of scope** | `[TODO: e.g. third-party bundler, social engineering]` |

Change history: use `git log` — this file tracks **current** posture and backlog, not a changelog.
