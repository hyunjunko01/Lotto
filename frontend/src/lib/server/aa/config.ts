import { isAddress } from 'viem';

export function getAaRpcUrl(): string {
    const value = process.env.AA_RPC_URL;
    if (!value) {
        throw new Error('AA_RPC_URL is required.');
    }
    return value;
}

export function getAaBundlerUrl(): string {
    const value = process.env.AA_BUNDLER_URL;
    if (!value) {
        throw new Error('AA_BUNDLER_URL is required.');
    }
    return value;
}

export function getAaEntryPointAddress(): `0x${string}` {
    const value = process.env.AA_ENTRYPOINT_ADDRESS;
    if (!value || !isAddress(value)) {
        throw new Error('AA_ENTRYPOINT_ADDRESS is required and must be a valid address.');
    }
    return value;
}

export function getAaPaymasterAddress(): `0x${string}` | undefined {
    const value = process.env.AA_PAYMASTER_ADDRESS ?? process.env.NEXT_PUBLIC_PAYMASTER_ADDRESS;
    if (!value || !isAddress(value)) {
        return undefined;
    }
    return value;
}

/** Defaults match legacy static estimator (reliable Alchemy bundler inclusion on Base Sepolia). */
const DEFAULT_MIN_MAX_FEE_PER_GAS = BigInt(2_000_000_000);
const DEFAULT_MIN_MAX_PRIORITY_FEE_PER_GAS = BigInt(1_000_000_000);

function parsePositiveWeiEnv(name: string, fallback: bigint): bigint {
    const raw = process.env[name];
    if (!raw) {
        return fallback;
    }
    try {
        const value = BigInt(raw);
        return value > BigInt(0) ? value : fallback;
    } catch {
        return fallback;
    }
}

/**
 * Floor for maxFeePerGas after network estimate + buffer.
 * L2 RPC quotes can be far below what Alchemy bundler actually bundles.
 */
export function getAaMinMaxFeePerGas(): bigint {
    return parsePositiveWeiEnv('AA_MIN_MAX_FEE_PER_GAS', DEFAULT_MIN_MAX_FEE_PER_GAS);
}

export function getAaMinMaxPriorityFeePerGas(): bigint {
    return parsePositiveWeiEnv('AA_MIN_MAX_PRIORITY_FEE_PER_GAS', DEFAULT_MIN_MAX_PRIORITY_FEE_PER_GAS);
}

/** Small buffer on bundler estimates; large buffers break Alchemy gas-limit efficiency checks. */
export function getAaGasBufferBps(): number {
    const raw = process.env.AA_GAS_BUFFER_BPS;
    if (!raw) {
        return 500;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 10_000) {
        return 500;
    }
    return Math.floor(parsed);
}
