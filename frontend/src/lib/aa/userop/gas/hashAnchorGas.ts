import { isAddress } from 'viem';
import type { AALotteryMode, AAJoinAction } from '@/lib/aa/types';
import { shouldUsePaymasterForMode } from '@/lib/aa/userop/gas/buildPaymasterSkeleton';
import { encodePaymasterAndData, packAccountGasLimits } from '@/lib/aa/userop/packing';
import type { UserOpGasEstimate } from '@/lib/aa/userop/gas/types';

type AnchorLimits = {
    verificationGasLimit: bigint;
    callGasLimit: bigint;
    paymasterVerificationGasLimit: bigint;
    paymasterPostOpGasLimit: bigint;
    preVerificationGas: string;
};

/** AccountFactory.createAccount (~108k) + validateUserOp; bundler sim uses request cap. */
export const DEPLOY_ACCOUNT_VERIFICATION_GAS_LIMIT = BigInt(500_000);

export function needsAccountDeploymentFromInitCode(initCode?: string): boolean {
    return Boolean(initCode && initCode !== '0x');
}

function withDeployAccountVerificationFloor(
    limits: AnchorLimits,
    needsAccountDeployment: boolean
): AnchorLimits {
    if (!needsAccountDeployment || limits.verificationGasLimit >= DEPLOY_ACCOUNT_VERIFICATION_GAS_LIMIT) {
        return limits;
    }

    return {
        ...limits,
        verificationGasLimit: DEPLOY_ACCOUNT_VERIFICATION_GAS_LIMIT,
    };
}

/**
 * Floors for `eth_estimateUserOperationGas` request only (not sent to bundler on Submit).
 * Caps must be high enough that simulation can run `createLotto` / heavy join calls;
 * otherwise Alchemy returns `execution reverted` (-32521) and estimate never returns real limits.
 */
function anchorLimitsForEstimate(mode: AALotteryMode, selectedJoinAction?: AAJoinAction): AnchorLimits {
    if (mode === 'create') {
        return {
            verificationGasLimit: BigInt(96_000),
            callGasLimit: BigInt(900_000),
            paymasterVerificationGasLimit: BigInt(80_000),
            paymasterPostOpGasLimit: BigInt(50_000),
            preVerificationGas: '80000',
        };
    }

    if (mode === 'faucet') {
        return {
            verificationGasLimit: BigInt(80_000),
            callGasLimit: BigInt(200_000),
            paymasterVerificationGasLimit: BigInt(50_000),
            paymasterPostOpGasLimit: BigInt(30_000),
            preVerificationGas: '50000',
        };
    }

    if (selectedJoinAction === 'requestWinner') {
        return {
            verificationGasLimit: BigInt(120_000),
            callGasLimit: BigInt(1_200_000),
            paymasterVerificationGasLimit: BigInt(80_000),
            paymasterPostOpGasLimit: BigInt(50_000),
            preVerificationGas: '80000',
        };
    }

    if (selectedJoinAction === 'approveEntryFee') {
        return {
            verificationGasLimit: BigInt(100_000),
            callGasLimit: BigInt(400_000),
            paymasterVerificationGasLimit: BigInt(80_000),
            paymasterPostOpGasLimit: BigInt(50_000),
            preVerificationGas: '70000',
        };
    }

    return {
        verificationGasLimit: BigInt(100_000),
        callGasLimit: BigInt(350_000),
        paymasterVerificationGasLimit: BigInt(80_000),
        paymasterPostOpGasLimit: BigInt(50_000),
        preVerificationGas: '70000',
    };
}

export function createHashAnchorGas(
    mode: AALotteryMode,
    paymasterAddress?: string,
    selectedJoinAction?: AAJoinAction,
    initCode?: string
): UserOpGasEstimate {
    const limits = withDeployAccountVerificationFloor(
        anchorLimitsForEstimate(mode, selectedJoinAction),
        needsAccountDeploymentFromInitCode(initCode)
    );
    const accountGasLimits = packAccountGasLimits(limits.verificationGasLimit, limits.callGasLimit);

    const maxFeePerGas = BigInt(2e9);
    const maxPriorityFeePerGas = BigInt(1e9);
    const packed = (maxPriorityFeePerGas << BigInt(128)) | maxFeePerGas;
    const gasFees = `0x${packed.toString(16).padStart(64, '0')}` as `0x${string}`;

    let paymasterAndData: `0x${string}` = '0x';
    if (shouldUsePaymasterForMode(mode) && paymasterAddress && isAddress(paymasterAddress)) {
        paymasterAndData = encodePaymasterAndData(
            paymasterAddress,
            limits.paymasterVerificationGasLimit,
            limits.paymasterPostOpGasLimit
        );
    }

    return {
        accountGasLimits,
        preVerificationGas: limits.preVerificationGas,
        gasFees,
        paymasterAndData,
    };
}

/** OP Stack bundlers derive PVG from calldata; do not send anchor PVG on estimate. */
export const ESTIMATE_REQUEST_PRE_VERIFICATION_GAS = '0';

/** Anchor caps for estimate + sign-for-estimate; PVG zero so bundler returns a real quote. */
export function createEstimateRequestGas(
    mode: AALotteryMode,
    paymasterAddress?: string,
    selectedJoinAction?: AAJoinAction,
    initCode?: string
): UserOpGasEstimate {
    return {
        ...createHashAnchorGas(mode, paymasterAddress, selectedJoinAction, initCode),
        preVerificationGas: ESTIMATE_REQUEST_PRE_VERIFICATION_GAS,
    };
}
