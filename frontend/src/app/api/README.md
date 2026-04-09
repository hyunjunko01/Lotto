# AA Backend API (Google + ERC-4337)

This API layer is implemented with Next.js route handlers.

## Required env vars

Set these in frontend/.env.local:

- AA_SESSION_SECRET=replace-with-random-secret
- NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-oauth-client-id
- AA_RPC_URL=http://127.0.0.1:8545
- AA_BUNDLER_URL=http://127.0.0.1:4337
- AA_ENTRYPOINT_ADDRESS=0x...
- NEXT_PUBLIC_ACCOUNT_FACTORY_ADDRESS=0x...
- AA_RELAYER_PRIVATE_KEY=0x...

Notes:
- User mappings are saved to frontend/.aa-data/users.json.
- This is for local development and portfolio demo usage.

## Endpoints

### 1) POST /api/auth/google

Body:

```json
{
  "idToken": "<google id token>"
}
```

Response:

```json
{
  "ok": true,
  "sessionToken": "<bearer token>",
  "user": {
    "googleSub": "...",
    "email": "..."
  }
}
```

### 2) GET /api/aa/account?createIfMissing=true

Headers:
- Authorization: Bearer <sessionToken>

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

### 3) POST /api/aa/userop/sign

Headers:
- Authorization: Bearer <sessionToken>

Body:

```json
{
  "userOp": {
    "sender": "0x...",
    "nonce": "0",
    "initCode": "0x",
    "callData": "0x...",
    "accountGasLimits": "0x...",
    "preVerificationGas": "100000",
    "gasFees": "0x...",
    "paymasterAndData": "0x",
    "signature": "0x"
  }
}
```

Response:

```json
{
  "ok": true,
  "userOpHash": "0x...",
  "signature": "0x...",
  "signedUserOp": {
    "sender": "0x...",
    "nonce": "0",
    "initCode": "0x",
    "callData": "0x...",
    "accountGasLimits": "0x...",
    "preVerificationGas": "100000",
    "gasFees": "0x...",
    "paymasterAndData": "0x",
    "signature": "0x..."
  }
}
```

### 4) POST /api/aa/userop/send

Headers:
- Authorization: Bearer <sessionToken>

Body:

```json
{
  "userOp": {
    "sender": "0x...",
    "nonce": "0",
    "initCode": "0x",
    "callData": "0x...",
    "accountGasLimits": "0x...",
    "preVerificationGas": "100000",
    "gasFees": "0x...",
    "paymasterAndData": "0x",
    "signature": "0x..."
  }
}
```

Response:

```json
{
  "ok": true,
  "userOpHash": "0x..."
}
```
