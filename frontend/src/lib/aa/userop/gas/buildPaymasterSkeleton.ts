import { isAddress } from 'viem';
import type { AALotteryMode } from '@/lib/aa/types';
import { encodePaymasterAndData } from '@/lib/aa/userop/packing';

/** Fallback only — live flows should use bundler estimate values. */
const DEFAULT_PAYMASTER_VERIFICATION_GAS = BigInt(50_000);
const DEFAULT_PAYMASTER_POST_OP_GAS = BigInt(20_000);

export function shouldUsePaymasterForMode(mode: AALotteryMode): boolean {
    return mode === 'create' || mode === 'faucet' || mode === 'join';
}

export function buildPaymasterSkeleton(
    mode: AALotteryMode,
    paymasterAddress?: string
): `0x${string}` {
    if (!shouldUsePaymasterForMode(mode) || !paymasterAddress || !isAddress(paymasterAddress)) {
        return '0x';
    }

    return encodePaymasterAndData(
        paymasterAddress,
        DEFAULT_PAYMASTER_VERIFICATION_GAS,
        DEFAULT_PAYMASTER_POST_OP_GAS
    );
}

export function unpackPaymasterSkeleton(paymasterAndData: `0x${string}`): {
    paymaster?: `0x${string}`;
    paymasterVerificationGasLimit?: bigint;
    paymasterPostOpGasLimit?: bigint;
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

    if (body.length >= 64) {
        const verificationPart = body.slice(0, 32);
        const postOpPart = body.slice(32, 64);
        const paymasterDataBody = body.slice(64);

        return {
            paymaster,
            paymasterVerificationGasLimit: BigInt(`0x${verificationPart || '0'}`),
            paymasterPostOpGasLimit: BigInt(`0x${postOpPart || '0'}`),
            paymasterData: (`0x${paymasterDataBody}` as `0x${string}`) || '0x',
        };
    }

    return {
        paymaster,
        paymasterVerificationGasLimit: DEFAULT_PAYMASTER_VERIFICATION_GAS,
        paymasterPostOpGasLimit: DEFAULT_PAYMASTER_POST_OP_GAS,
        paymasterData: (`0x${body}` as `0x${string}`) || '0x',
    };
}
