import { isAddress, keccak256, parseEther, toHex } from 'viem';
import type { AAJoinAction } from '@/lib/aa/types';

export function parseEtherOrZero(value: string): bigint {
    try {
        return parseEther(value || '0');
    } catch {
        return BigInt(0);
    }
}

export function parseBigIntOrZero(value: string): bigint {
    try {
        return BigInt(value || '0');
    } catch {
        return BigInt(0);
    }
}

export function packAccountGasLimits(verificationGasLimit: bigint, callGasLimit: bigint): `0x${string}` {
    const packed = (verificationGasLimit << BigInt(128)) | callGasLimit;
    return `0x${packed.toString(16).padStart(64, '0')}`;
}

export function deriveSaltFromOwnerAddress(ownerAddress: `0x${string}`): string {
    const digest = keccak256(toHex(ownerAddress.toLowerCase()));
    return BigInt(digest).toString();
}

export function accountGasLimitsForJoinAction(action: AAJoinAction): `0x${string}` {
    if (action === 'requestWinner') {
        return packAccountGasLimits(BigInt(300000), BigInt(1200000));
    }
    return packAccountGasLimits(BigInt(150000), BigInt(200000));
}

export function encodePaymasterAndData(
    paymasterAddress: `0x${string}`,
    paymasterVerificationGasLimit: bigint,
    paymasterPostOpGasLimit: bigint
): `0x${string}` {
    const addressPart = paymasterAddress.slice(2);
    const verificationGasPart = paymasterVerificationGasLimit.toString(16).padStart(32, '0');
    const postOpGasPart = paymasterPostOpGasLimit.toString(16).padStart(32, '0');
    return `0x${addressPart}${verificationGasPart}${postOpGasPart}` as `0x${string}`;
}

export { isAddress };
