# Lotto Security

> **Status:** Skeleton — fill in `[TODO]` sections as Lotto v2 scope is defined.  
> **Current deployment posture:** Testnet / portfolio demo — not audited for production funds.

## Document purpose

This file defines how we think about security for Lotto: what we protect, who we trust, known risks, and how v2 will differ from v1. Use it before code changes, audits, or mainnet decisions.

**Related docs:** [README.md](./README.md) (architecture & known limitations), [frontend/src/app/api/README.md](./frontend/src/app/api/README.md) (AA relay API).

---

## 1. Security goals (Lotto v2)

Define what “secure enough” means for v2. Be explicit about non-goals.

| Goal | v1 (demo) | v2 target `[TODO]` |
|------|-----------|---------------------|
| Player funds safe in contract | Partial (test token, known gaps) | `[TODO]` |
| Fair winner selection | No (multi-join weighting, modulo bias) | `[TODO]` |
| Liveness if VRF stalls | Yes (`REFUNDING` path) | `[TODO]` |
| AA / paymaster abuse resistance | Partial (selector allowlist) | `[TODO]` |
| Production mainnet readiness | No | `[TODO]` |

**Non-goals for v2 (if any):** `[TODO — e.g. permissionless lotto creation on testnet only]`

---

## 2. System overview & trust boundaries

```text
[User EOA / Web3Auth] ──sign──► [EthAccount] ──UserOp──► [EntryPoint] ──► [Lotto / Factory / Token]
                                      ▲
                                      │ sponsor (allowlisted calls)
                               [LottoPaymaster]

[Chainlink VRF Coordinator] ──callback──► [LottoFactory] ──finalizeWinner──► [Lotto clone]

[Next.js API] ──relay only──► [Bundler]     (no server-side user keys)
```

### Trust boundaries

| Boundary | Trusted party | Untrusted input |
|----------|---------------|-----------------|
| On-chain core | Chainlink VRF, EntryPoint, ERC-20 token contract | Any `msg.sender` / external call |
| Factory | Factory deployer config (VRF sub, impl address) | `createLotto` parameters from users `[TODO: restrict?]` |
| Paymaster | Owner allowlist updates | Arbitrary UserOps (must fail validation) |
| Frontend API | Server env (RPC, bundler URLs) | HTTP clients, UserOp payloads |
| Client | User wallet / Web3Auth | Browser, local storage |

---

## 3. Assets at risk

| Asset | Location | Impact if compromised |
|-------|----------|-------------------------|
| ERC-20 in lotto pools | `LottoImplementation` (per clone) | `[TODO]` |
| Prize / refund accounting | `refundableAmount`, `players`, state enum | `[TODO]` |
| Paymaster deposit (ETH) | `LottoPaymaster` | `[TODO]` |
| VRF subscription / LINK | Chainlink (factory consumer) | `[TODO]` |
| Owner / admin keys | Paymaster owner, entry token owner, deployer | `[TODO]` |
| User signing keys | Client only (Web3Auth / EOA) | `[TODO]` |
| API availability | Vercel / Next.js routes | `[TODO]` |

---

## 4. Adversary model

| Actor | Capability | Primary concerns |
|-------|------------|------------------|
| Malicious player | Join, request winner, claim refund/ prize | Gaming odds, reentrancy, state confusion `[TODO]` |
| Griefer | Spam txs, trigger refund, API flood | DoS, paymaster drain `[TODO]` |
| External caller | Call public/external functions | Unauthorized finalize, init takeover `[TODO]` |
| Compromised paymaster owner | `setAllowed*Selector` | Broaden sponsorship to dangerous calls `[TODO]` |
| Compromised API infra | Relay UserOps | Rate-limit bypass, bundler abuse `[TODO]` |
| Chainlink / infra outage | Delayed VRF | Stuck `CALCULATING` → refund path |

---

## 5. Core contracts (review surface)

| Contract | Path | Security-critical responsibilities |
|----------|------|-----------------------------------|
| `LottoImplementation` | `contracts/src/Lotto/LottoImplementation.sol` | Join, pool custody, winner, withdraw, refund |
| `LottoFactory` | `contracts/src/Lotto/LottoFactory.sol` | Clones, VRF request/fulfill, instance registry |
| `LottoEntryToken` | `contracts/src/Lotto/LottoEntryToken.sol` | Mint / faucet (demo) `[TODO: prod policy]` |
| `LottoPaymaster` | `contracts/src/Account/Ethereum/LottoPaymaster.sol` | Sponsorship allowlist |
| `EthAccount` | `contracts/src/Account/Ethereum/EthAccount.sol` | Signature validation, `execute` |
| `AccountFactory` | `contracts/src/Account/Ethereum/AccountFactory.sol` | Deterministic account deploy |

---

## 6. Access control matrix

Fill one row per sensitive function. Extend as v2 adds roles.

| Contract | Function | Authorized caller | Notes |
|----------|----------|-------------------|-------|
| `LottoImplementation` | `initialize` | Once, via factory on clone | Implementation uses `_disableInitializers` |
| `LottoImplementation` | `finalizeWinner` | `factory` only | |
| `LottoImplementation` | `joinLotto` | Anyone (OPEN) | `[TODO: v2 restrictions]` |
| `LottoImplementation` | `triggerRefundMode` | Anyone after timeout | Liveness feature |
| `LottoFactory` | `requestWinnerRandomness` | Registered lotto instance | |
| `LottoFactory` | `fulfillRandomWords` | VRF coordinator (internal) | |
| `LottoPaymaster` | `setAllowed*Selector` | `onlyOwner` | `[TODO: multisig / timelock]` |
| `LottoEntryToken` | `mint` | `onlyOwner` | Demo only `[TODO]` |

---

## 7. State machine & safety properties

### States (`LottoImplementation`)

`OPEN` → `FULL` → `CALCULATING` → `CLOSED`  
Recovery: `CALCULATING` → `REFUNDING` (after `CALCULATING_TIMEOUT`)

### Invariants (define & test in Foundry)

Mark each: **Implemented** / **Planned v2** / **N/A**

- [ ] **I1 — No double payout:** Prize cannot be withdrawn after full refund settlement. `[TODO: formal statement]`
- [ ] **I2 — Pool solvency:** Token balance ≥ sum of outstanding obligations (refunds + unclaimed prize). `[TODO]`
- [ ] **I3 — Single randomness request:** `requestWinner` at most once per instance. **Implemented** (`isRandomnessRequested`)
- [ ] **I4 — Factory-only finalize:** Only factory sets winner in `CALCULATING`. **Implemented**
- [ ] **I5 — Refund vs finalize:** `finalizeWinner` and `REFUNDING` cannot both pay the same stake. `[TODO: test coverage note]`
- [ ] **I6 — Fair selection:** Each eligible ticket has equal win probability. **Not in v1** — see §8.

---

## 8. Known limitations (v1) → v2 backlog

Track from [README.md](./README.md). Link PR/issue when addressed.

| ID | Issue | Risk | v2 plan | Issue/PR |
|----|-------|------|---------|----------|
| L1 | Same address may join multiple times (weighted odds) | Fairness | `[TODO]` | |
| L2 | `winnerIndex = randomness % maxPlayers` (modulo bias) | Fairness | `[TODO]` | |
| L3 | Permissionless `createLotto` parameters | Economic / spam | `[TODO]` | |
| L4 | Demo token + `claimTestTokens` | Not production economics | `[TODO]` | |
| L5 | Not externally audited | Unknown vulns | `[TODO: audit scope]` | |
| L6 | Paymaster owner centralization | Policy / fund drain | `[TODO]` | |
| L7 | `joinLotto` CEI ordering (effects before transfer) | Reentrancy class | `[TODO: review + test]` | |

---

## 9. ERC-4337 & paymaster

### Allowlisted flow (default)

Factory: `createLotto` · Lotto: `joinLotto`, `requestWinner`, `withdrawPrize`, `triggerRefundMode`, `claimRefund` · Token: `claimTestTokens`, `approve`.

### Checks for v2

- [ ] UserOp `execute` cannot target arbitrary contracts. `[TODO: test reference]`
- [ ] Paymaster deposit monitoring & alerts. `[TODO]`
- [ ] Production deployment removes demo selectors. `[TODO]`
- [ ] Owner key management: `[TODO: multisig, hardware wallet, etc.]`

---

## 10. Off-chain (Next.js AA API)

| Control | v1 | v2 `[TODO]` |
|---------|----|-------------|
| Server holds user private keys | No | No |
| UserOp schema validation (`zod`) | Yes | `[TODO]` |
| Rate limiting | In-memory IP/sender | `[TODO: Redis/Upstash]` |
| `clientUserOpHash` vs server hash | 409 on mismatch | `[TODO]` |
| Secrets in env (`AA_RPC_URL`, bundler) | Server-only | `[TODO: rotation policy]` |

**Abuse scenarios to document:** `[TODO — e.g. UserOp spam, IP rotation, paymaster griefing]`

---

## 11. Dependencies & external trust

| Dependency | Version / source | Trust assumption |
|------------|------------------|------------------|
| OpenZeppelin | `[TODO]` | Battle-tested libs |
| Chainlink VRF v2 Plus | `[TODO]` | Honest randomness, liveness |
| account-abstraction (EntryPoint v0.7) | `[TODO]` | Spec-compliant bundler + EP |
| Foundry / forge-std | `[TODO]` | Dev/test only |

Pin versions in `contracts/foundry.toml` / lockfiles. `[TODO: link]`

---

## 12. Testing & tooling

| Activity | Command / location | v2 target |
|----------|-------------------|-----------|
| Unit / integration tests | `forge test --root contracts` | `[TODO: coverage goals]` |
| Invariant / fuzz tests | `[TODO: path]` | `[TODO]` |
| Static analysis (e.g. Slither) | `[TODO]` | CI gate? `[TODO]` |
| Format / build CI | `.github/workflows` | Keep green |

**Security test checklist:** `[TODO — link to test file list]`

---

## 13. Deployments & environments

| Environment | Chain | Contracts | Notes |
|-------------|-------|-----------|-------|
| Local (Anvil) | `[TODO]` | Mocks for VRF | |
| Base Sepolia (demo) | 84532 | See [README.md](./README.md#base-sepolia-demo-deployment) | Public demo |
| Production v2 | `[TODO]` | `[TODO]` | `[TODO: not before audit]` |

**Env separation:** Never reuse demo entry token / paymaster on mainnet. `[TODO]`

---

## 14. Incident response

| Step | Action |
|------|--------|
| 1 | Pause? `[TODO: upgradable? circuit breaker? or social pause only]` |
| 2 | Contact: `[TODO: maintainer email / Telegram]` |
| 3 | Preserve: tx hashes, block numbers, UserOp hashes |
| 4 | Communicate: `[TODO: status page / GitHub advisory]` |
| 5 | Post-mortem template: `[TODO: link]` |

---

## 15. Responsible disclosure

**Do not** open public GitHub issues for exploitable vulnerabilities.

| | |
|---|---|
| **Report to** | `[TODO: security@example.com]` |
| **Expected response** | `[TODO: e.g. 72 hours ack]` |
| **Scope** | In-scope: `[TODO — e.g. contracts in contracts/src/, production API]` |
| **Out of scope** | `[TODO — e.g. third-party bundler, social engineering]` |
| **Safe harbor** | `[TODO: policy text]` |

---

## 16. Audit & review log

| Date | Type | Scope | Result | Report link |
|------|------|-------|--------|-------------|
| — | Self-review / peer review | v1 demo | Not for production | — |
| `[TODO]` | External audit | `[TODO: contracts list]` | `[TODO]` | `[TODO]` |

**Pre-audit gate:** Threat model complete, invariants tested, v2 backlog triaged, frozen bytecode scope. `[TODO]`

---

## 17. Changelog (security-relevant)

| Date | Change | Author |
|------|--------|--------|
| `[TODO]` | Initial SECURITY.md skeleton | `[TODO]` |

---

## Appendix A — Quick reference: sensitive code paths

- Winner selection: `LottoImplementation.finalizeWinner` — `randomness % maxPlayers`
- VRF callback: `LottoFactory.fulfillRandomWords` → `finalizeWinner`
- Refund liveness: `triggerRefundMode` / `claimRefund`
- Paymaster validation: `LottoPaymaster._validatePaymasterUserOp`
- API relay: `frontend/src/app/api/aa/userop/send/route.ts`

## Appendix B — Glossary

| Term | Meaning |
|------|---------|
| Clone / instance | EIP-1167 proxy delegating to `LottoImplementation` |
| CEI | Checks-Effects-Interactions pattern |
| UserOp | ERC-4337 packed user operation |
