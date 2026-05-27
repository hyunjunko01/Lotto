/**
 * Applies a basis-points buffer to bundler gas estimates (Alto / Alchemy variance).
 */
export function applyGasBuffer(value: bigint, bufferBps: number): bigint {
    if (bufferBps <= 0) {
        return value;
    }
    return (value * BigInt(10_000 + bufferBps)) / BigInt(10_000);
}

/** Alchemy send precheck: `verificationGasUsed / verificationGasLimit >= 0.25`. */
export const ALCHEMY_MIN_VERIFICATION_EFFICIENCY_BPS = 2500;

/**
 * When estimate echoes the request cap, shrink so send precheck passes (~25k used @ 120k cap → 0.208 efficiency).
 */
export function adjustVerificationGasLimitForAlchemy(
    estimatedLimit: bigint,
    requestVerificationCap: bigint
): bigint {
    if (requestVerificationCap === BigInt(0) || estimatedLimit < requestVerificationCap) {
        return estimatedLimit;
    }

    const shrunk = (estimatedLimit * BigInt(83_500)) / BigInt(100_000);
    return shrunk > BigInt(0) ? shrunk : estimatedLimit;
}

export function adjustPaymasterVerificationGasLimitForAlchemy(
    estimatedLimit: bigint,
    requestCap: bigint
): bigint {
    return adjustVerificationGasLimitForAlchemy(estimatedLimit, requestCap);
}
