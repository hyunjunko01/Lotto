import {
    createPublicClient,
    encodeFunctionData,
    Hex,
    http,
    isAddress,
    parseAbi,
} from 'viem';
import accountFactoryAbi from '@/contracts/AccountFactory.json';
import { toEntryPointV07BundlerRpcUserOp } from '@/lib/server/aa/userOpRpc';
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
    const rpcUserOp = toEntryPointV07BundlerRpcUserOp(userOp);

    const json = await callBundlerRpc('eth_sendUserOperation', [rpcUserOp, entryPoint]);

    if (!json.error && typeof json.result === 'string') {
        return { userOpHash: json.result };
    }

    const message = json.error?.message ?? 'Bundler eth_sendUserOperation failed.';

    if (/preVerificationGas too low/i.test(message)) {
        throw new Error(`${message} Re-sign UserOperation after increasing preVerificationGas.`);
    }

    if (/replacement underpriced/i.test(message)) {
        throw new Error(
            `${message} A UserOperation with this nonce is already pending in the bundler mempool with higher or equal fees. ` +
                'Wait ~30s for it to confirm or drop, then Sign again (fresh gas fees) and Send once.'
        );
    }

    throw new Error(message);
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
