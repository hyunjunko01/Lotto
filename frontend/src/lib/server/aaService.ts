import {
    createPublicClient,
    encodeFunctionData,
    Hex,
    http,
    isAddress,
    parseAbi,
} from 'viem';
import accountFactoryAbi from '@/contracts/AccountFactory.json';
import { targetChain } from '@/lib/targetNetwork';

type PackedUserOperation = {
    sender: `0x${string}`;
    nonce: bigint;
    initCode: `0x${string}`;
    callData: `0x${string}`;
    accountGasLimits: `0x${string}`;
    preVerificationGas: bigint;
    gasFees: `0x${string}`;
    paymasterAndData: `0x${string}`;
    signature: `0x${string}`;
};

type BundlerRpcError = {
    code?: number;
    message?: string;
    data?: unknown;
};

type BundlerUserOpByHash = {
    userOperation?: Record<string, unknown>;
    entryPoint?: string;
    transactionHash?: string;
};

type BundlerUserOpReceipt = {
    userOpHash?: string;
    sender?: string;
    nonce?: string;
    paymaster?: string;
    actualGasCost?: string;
    actualGasUsed?: string;
    success?: boolean;
    reason?: string;
    logs?: unknown[];
    receipt?: Record<string, unknown>;
};

type AAUserOpTrace = {
    status: 'pending' | 'included' | 'failed' | 'rpc-error';
    userOpHash: string;
    transactionHash?: string;
    success?: boolean;
    reason?: string;
    actualGasCost?: string;
    actualGasUsed?: string;
    receipt?: Record<string, unknown>;
    bundlerLookup?: BundlerUserOpByHash | null;
    rpcErrors?: {
        receipt?: BundlerRpcError;
        byHash?: BundlerRpcError;
    };
};

const ENTRY_POINT_ABI = parseAbi([
    'function getUserOpHash((address sender,uint256 nonce,bytes initCode,bytes callData,bytes32 accountGasLimits,uint256 preVerificationGas,bytes32 gasFees,bytes paymasterAndData,bytes signature) userOp) view returns (bytes32)',
    'function getNonce(address sender, uint192 key) view returns (uint256)',
]);

const FACTORY_INTERFACE_ABI = accountFactoryAbi;

function getRpcUrl(): string {
    return process.env.AA_RPC_URL ?? 'http://127.0.0.1:8545';
}

function getBundlerUrl(): string {
    return process.env.AA_BUNDLER_URL ?? 'http://127.0.0.1:4337/rpc';
}

function toRpcHex(value: bigint): `0x${string}` {
    return `0x${value.toString(16)}`;
}

function unpackAccountGasLimits(accountGasLimits: `0x${string}`): {
    verificationGasLimit: bigint;
    callGasLimit: bigint;
} {
    const packed = BigInt(accountGasLimits);
    const low128Mask = (BigInt(1) << BigInt(128)) - BigInt(1);

    return {
        verificationGasLimit: packed >> BigInt(128),
        callGasLimit: packed & low128Mask,
    };
}

function unpackGasFees(gasFees: `0x${string}`): {
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
} {
    const packed = BigInt(gasFees);
    const low128Mask = (BigInt(1) << BigInt(128)) - BigInt(1);

    return {
        // EntryPoint v0.7 packing order: high128=maxPriorityFeePerGas, low128=maxFeePerGas
        maxFeePerGas: packed & low128Mask,
        maxPriorityFeePerGas: packed >> BigInt(128),
    };
}

function splitInitCode(initCode: `0x${string}`): { factory?: `0x${string}`; factoryData?: `0x${string}` } {
    if (initCode === '0x') {
        return {};
    }

    if (initCode.length < 42) {
        throw new Error('Invalid initCode: expected at least factory address bytes.');
    }

    const factory = `0x${initCode.slice(2, 42)}` as `0x${string}`;
    const factoryDataBody = initCode.slice(42);
    const factoryData = (`0x${factoryDataBody}` as `0x${string}`) || '0x';
    return { factory, factoryData };
}

function splitPaymasterAndData(paymasterAndData: `0x${string}`): {
    paymaster?: `0x${string}`;
    paymasterVerificationGasLimit?: `0x${string}`;
    paymasterPostOpGasLimit?: `0x${string}`;
    paymasterData?: `0x${string}`;
} {
    if (paymasterAndData === '0x') {
        return {};
    }

    if (paymasterAndData.length < 42) {
        throw new Error('Invalid paymasterAndData: expected paymaster address prefix.');
    }

    const paymaster = `0x${paymasterAndData.slice(2, 42)}` as `0x${string}`;
    const body = paymasterAndData.slice(42);

    // v0.7 unpacked layout: paymaster(20) + verificationGas(16) + postOpGas(16) + paymasterData
    if (body.length >= 64) {
        const verificationPart = body.slice(0, 32);
        const postOpPart = body.slice(32, 64);
        const paymasterDataBody = body.slice(64);

        return {
            paymaster,
            paymasterVerificationGasLimit: toRpcHex(BigInt(`0x${verificationPart || '0'}`)),
            paymasterPostOpGasLimit: toRpcHex(BigInt(`0x${postOpPart || '0'}`)),
            paymasterData: (`0x${paymasterDataBody}` as `0x${string}`) || '0x',
        };
    }

    // fallback for legacy simple paymasterAndData layout: paymaster + opaque data
    return {
        paymaster,
        paymasterData: (`0x${body}` as `0x${string}`) || '0x',
    };
}

async function callBundlerRpc(method: string, params: unknown[]): Promise<{ result?: unknown; error?: BundlerRpcError }> {
    const response = await fetch(getBundlerUrl(), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method,
            params,
        }),
    });

    const json = (await response.json()) as { result?: unknown; error?: BundlerRpcError };

    if (!response.ok && !json.error) {
        return {
            error: {
                message: `${method} failed with HTTP ${response.status}`,
            },
        };
    }

    return json;
}

function getAccountFactoryAddress(): `0x${string}` {
    const value = process.env.NEXT_PUBLIC_ACCOUNT_FACTORY_ADDRESS;
    if (!value || !isAddress(value)) {
        throw new Error('NEXT_PUBLIC_ACCOUNT_FACTORY_ADDRESS is required and must be a valid address.');
    }
    return value;
}

function getEntryPointAddress(): `0x${string}` {
    const value = process.env.AA_ENTRYPOINT_ADDRESS;
    if (!value || !isAddress(value)) {
        throw new Error('AA_ENTRYPOINT_ADDRESS is required and must be a valid address.');
    }
    return value;
}

function getPublicClient() {
    return createPublicClient({
        chain: targetChain,
        transport: http(getRpcUrl()),
    });
}

export async function getAAIdentityFromOwner(ownerAddress: `0x${string}`, salt: string) {
    const publicClient = getPublicClient();
    const factory = getAccountFactoryAddress();

    const accountAddress = (await publicClient.readContract({
        address: factory,
        abi: FACTORY_INTERFACE_ABI,
        functionName: 'getAddress',
        args: [ownerAddress, BigInt(salt)],
    })) as `0x${string}`;

    return {
        ownerAddress,
        salt,
        accountAddress,
    };
}

export async function buildCreateAAAccountInitCode(ownerAddress: `0x${string}`, salt: string): Promise<Hex> {
    const factory = getAccountFactoryAddress();
    const data = encodeFunctionData({
        abi: FACTORY_INTERFACE_ABI,
        functionName: 'createAccount',
        args: [ownerAddress, BigInt(salt)],
    });
    return `${factory}${data.slice(2)}` as Hex;
}

export async function sendAAUserOperationToBundler(userOp: PackedUserOperation): Promise<{ userOpHash: string }> {
    const entryPoint = getEntryPointAddress();
    const { verificationGasLimit, callGasLimit } = unpackAccountGasLimits(userOp.accountGasLimits);
    const { maxFeePerGas, maxPriorityFeePerGas } = unpackGasFees(userOp.gasFees);
    const factoryParts = splitInitCode(userOp.initCode);
    const paymasterParts = splitPaymasterAndData(userOp.paymasterAndData);

    // Matches `EntryPoint.getUserOpHash` input (v0.7 packed). Send this first so the bundler does not
    // repack gas fields differently from the client-signed op (avoids simulation AA24).
    const packedV07Payload = {
        sender: userOp.sender,
        nonce: toRpcHex(userOp.nonce),
        initCode: userOp.initCode,
        callData: userOp.callData,
        accountGasLimits: userOp.accountGasLimits,
        preVerificationGas: toRpcHex(userOp.preVerificationGas),
        gasFees: userOp.gasFees,
        paymasterAndData: userOp.paymasterAndData,
        signature: userOp.signature,
    };

    const unpackedPayload = {
        sender: userOp.sender,
        nonce: toRpcHex(userOp.nonce),
        callData: userOp.callData,
        preVerificationGas: toRpcHex(userOp.preVerificationGas),
        verificationGasLimit: toRpcHex(verificationGasLimit),
        callGasLimit: toRpcHex(callGasLimit),
        maxFeePerGas: toRpcHex(maxFeePerGas),
        maxPriorityFeePerGas: toRpcHex(maxPriorityFeePerGas),
        ...factoryParts,
        ...paymasterParts,
        signature: userOp.signature,
    };

    let json = await callBundlerRpc('eth_sendUserOperation', [packedV07Payload, entryPoint]);

    if (!json.error && typeof json.result === 'string') {
        return { userOpHash: json.result };
    }

    const packedMessage = json.error?.message ?? '';

    // Fallback: some tooling expects decomposed gas / factory / paymaster fields.
    json = await callBundlerRpc('eth_sendUserOperation', [unpackedPayload, entryPoint]);

    if (!json.error && typeof json.result === 'string') {
        return { userOpHash: json.result };
    }

    const unpackedMessage = json.error?.message ?? '';
    const finalErrorMessage =
        unpackedMessage || packedMessage || 'Bundler eth_sendUserOperation failed (packed and unpacked attempts).';

    if (/preVerificationGas too low/i.test(finalErrorMessage)) {
        throw new Error(`${finalErrorMessage} Re-sign UserOperation after increasing preVerificationGas.`);
    }

    throw new Error(finalErrorMessage);
}

/** Same hash the account uses for validation (`signature` must be empty for hashing). */
export async function computeAAUserOpHash(userOp: PackedUserOperation): Promise<Hex> {
    const publicClient = getPublicClient();
    const entryPoint = getEntryPointAddress();

    return (await publicClient.readContract({
        address: entryPoint,
        abi: ENTRY_POINT_ABI,
        functionName: 'getUserOpHash',
        args: [
            {
                sender: userOp.sender,
                nonce: userOp.nonce,
                initCode: userOp.initCode,
                callData: userOp.callData,
                accountGasLimits: userOp.accountGasLimits,
                preVerificationGas: userOp.preVerificationGas,
                gasFees: userOp.gasFees,
                paymasterAndData: userOp.paymasterAndData,
                signature: '0x',
            },
        ],
    })) as Hex;
}

export async function getAAAccountNonce(sender: `0x${string}`): Promise<bigint> {
    if (!isAddress(sender)) {
        throw new Error('Invalid sender address.');
    }

    const publicClient = getPublicClient();
    const entryPoint = getEntryPointAddress();

    const nonce = (await publicClient.readContract({
        address: entryPoint,
        abi: ENTRY_POINT_ABI,
        functionName: 'getNonce',
        args: [sender, BigInt(0)],
    })) as bigint;

    return nonce;
}

export async function traceAAUserOperation(userOpHash: Hex): Promise<AAUserOpTrace> {
    const [receiptResponse, byHashResponse] = await Promise.all([
        callBundlerRpc('eth_getUserOperationReceipt', [userOpHash]),
        callBundlerRpc('eth_getUserOperationByHash', [userOpHash]),
    ]);

    const rpcErrors: AAUserOpTrace['rpcErrors'] = {};
    if (receiptResponse.error) {
        rpcErrors.receipt = receiptResponse.error;
    }
    if (byHashResponse.error) {
        rpcErrors.byHash = byHashResponse.error;
    }

    const bundlerLookup = (byHashResponse.result as BundlerUserOpByHash | null | undefined) ?? null;
    const receiptResult = (receiptResponse.result as BundlerUserOpReceipt | null | undefined) ?? null;

    if (!receiptResult) {
        return {
            status: receiptResponse.error ? 'rpc-error' : 'pending',
            userOpHash,
            transactionHash: bundlerLookup?.transactionHash,
            bundlerLookup,
            rpcErrors: Object.keys(rpcErrors).length > 0 ? rpcErrors : undefined,
        };
    }

    const receipt = receiptResult.receipt;
    const txHashFromReceipt = receipt?.transactionHash;
    const txHash = typeof txHashFromReceipt === 'string' ? txHashFromReceipt : bundlerLookup?.transactionHash;
    const statusHex = typeof receipt?.status === 'string' ? receipt.status.toLowerCase() : undefined;
    const successFromReceipt = statusHex === '0x1' || statusHex === '0x01';
    const success = typeof receiptResult.success === 'boolean' ? receiptResult.success : successFromReceipt;
    const reason =
        typeof receiptResult.reason === 'string'
            ? receiptResult.reason
            : typeof receipt?.revertReason === 'string'
                ? receipt.revertReason
                : undefined;

    return {
        status: success ? 'included' : 'failed',
        userOpHash,
        transactionHash: txHash,
        success,
        reason,
        actualGasCost: receiptResult.actualGasCost,
        actualGasUsed: receiptResult.actualGasUsed,
        receipt,
        bundlerLookup,
        rpcErrors: Object.keys(rpcErrors).length > 0 ? rpcErrors : undefined,
    };
}

export type { PackedUserOperation };
