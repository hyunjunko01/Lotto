# AA Backend API (Web3Auth + ERC-4337)

Next.js route handlers. Signing is **client-side only** (Web3Auth / user wallet). The server relays `eth_sendUserOperation` to the bundler.

## Required env vars

Set these in `frontend/.env.local`:

- `NEXT_PUBLIC_WEB3AUTH_CLIENT_ID` — Web3Auth client id
- `AA_RPC_URL` — e.g. `http://127.0.0.1:8545`
- `AA_BUNDLER_URL` — e.g. `http://127.0.0.1:4337/rpc`
- `AA_ENTRYPOINT_ADDRESS` — EntryPoint v0.7
- `NEXT_PUBLIC_ENTRYPOINT_ADDRESS` — same, for the browser `getUserOpHash` call
- `NEXT_PUBLIC_ACCOUNT_FACTORY_ADDRESS`

Notes:

- No server-side user key store; no `users.json`.
- Local bundler: `make bundler-start` from the repo root.
- `send` and `hash` validate userOp schema on the server (`zod`) before touching RPC/bundler.
- `send` has in-memory rate limiting (Phase 1): IP (30/min), sender (15/min). For production, replace with shared storage (e.g., Redis/Upstash).

## Endpoints

### 1) `GET /api/aa/account?ownerAddress=0x…&salt=…`

Query:

- `ownerAddress` — Web3Auth EOA
- `salt` — decimal string; client uses `keccak256(lowercase owner)` → bigint string (see `useAALottery` / `deriveSaltFromOwnerAddress`)

Response:

```json
{
  "ok": true,
  "account": {
    "ownerAddress": "0x...",
    "accountAddress": "0x...",
    "salt": "..."
  }
}
```

### 2) `POST /api/aa/userop/send`

Body:

- `userOp` — packed UserOperation **with** `signature`
- `clientUserOpHash` (optional) — `bytes32` from the browser’s `getUserOpHash` at sign time. If present, the server recomputes `EntryPoint.getUserOpHash` on `AA_RPC_URL` with `signature: 0x` and returns **409** when they differ (debugging AA24 / stale fields).

Success JSON includes `serverUserOpHash` (always) and bundler `userOpHash` as `userOpHash`.

Errors:

- `400`: invalid userOp payload (schema validation failed)
- `409`: `clientUserOpHash` mismatch
- `429`: rate limit exceeded (`Retry-After` header)

### 3) `POST /api/aa/userop/hash`

Body: `userOp` (packed fields; `signature` ignored, treated as `0x`).

Returns `{ ok: true, userOpHash }` using `AA_RPC_URL` + `AA_ENTRYPOINT_ADDRESS` — same as send-route verification. The browser should use this for signing so the hash matches the server.

### 4) `POST /api/aa/userop/estimate`

Body:

- `mode` — `create` | `join` | `faucet`
- `sender`, `nonce`, `initCode`, `callData`
- `selectedJoinAction` (optional, join flows)
- `paymasterAddress` (optional; defaults to `AA_PAYMASTER_ADDRESS` / `NEXT_PUBLIC_PAYMASTER_ADDRESS`)

Returns `{ ok: true, gas }` with packed fields: `accountGasLimits`, `preVerificationGas`, `gasFees`, `paymasterAndData`.

Uses `eth_estimateUserOperationGas` on `AA_BUNDLER_URL` (Alto locally, Alchemy on testnet) via viem/account-abstraction. Optional `AA_GAS_BUFFER_BPS` (default `500` = 5%).

### 5) `GET /api/aa/userop/nonce?sender=0x…`

Returns the EntryPoint nonce for the AA `sender`.

### 6) `GET /api/aa/userop/receipt?userOpHash=0x…`

Bundler trace / receipt lookup (no auth; suitable for local dev).

Response fields include `status`: `pending` | `included` | `failed` | `rpc-error`, plus `transactionHash`, `reason`, etc. when available.
