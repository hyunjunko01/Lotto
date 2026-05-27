import { createPublicClient, http } from 'viem';
import { estimateUserOperationGas } from 'viem/account-abstraction';
import type { AALotteryMode } from '@/lib/aa/types';
import {
    adjustPaymasterVerificationGasLimitForAlchemy,
    adjustVerificationGasLimitForAlchemy,
    applyGasBuffer,
} from '@/lib/aa/userop/gas/applyGasBuffer';
import { shouldUsePaymasterForMode } from '@/lib/aa/userop/gas/buildPaymasterSkeleton';
import { encodePaymasterAndData, packAccountGasLimits } from '@/lib/aa/userop/packing';
import type { UserOpGasEstimate } from '@/lib/aa/userop/gas/types';
import { createAaBundlerClient } from '@/lib/server/aa/bundlerClient';
import {
    getAaEntryPointAddress,
    getAaGasBufferBps,
    getAaMinMaxFeePerGas,
    getAaMinMaxPriorityFeePerGas,
    getAaPaymasterAddress,
    getAaRpcUrl,
} from '@/lib/server/aa/config';
import {
    splitInitCodeForV07,
    splitPaymasterAndDataForV07,
    unpackAccountGasLimits,
    unpackGasFees,
} from '@/lib/server/aa/userOpRpc';
import { targetChain } from '@/lib/targetNetwork';

export type EstimateAAUserOpGasInput = {
    mode: AALotteryMode;
    sender: `0x${string}`;
    nonce: bigint;
    initCode: `0x${string}`;
    callData: `0x${string}`;
    paymasterAddress?: string;
    signature: `0x${string}`;
    /** Must match the userOp fields used when `signature` was created. */
    accountGasLimits: `0x${string}`;
    preVerificationGas: bigint;
    gasFees: `0x${string}`;
    paymasterAndData: `0x${string}`;
};

function packGasFees(maxFeePerGas: bigint, maxPriorityFeePerGas: bigint): `0x${string}` {
    const packed = (maxPriorityFeePerGas << BigInt(128)) | maxFeePerGas;
    return `0x${packed.toString(16).padStart(64, '0')}`;
}

type BundlerGasEstimate = {
    preVerificationGas: bigint;
    verificationGasLimit: bigint;
    callGasLimit: bigint;
    paymasterVerificationGasLimit?: bigint;
    paymasterPostOpGasLimit?: bigint;
};

/**
 * Alchemy precheck: (gas used / gas limit) must be >= 25% for verification & paymaster verification.
 * Buffering verification limits lowers efficiency — only buffer execution gas.
 */
function bufferGasEstimate(estimate: BundlerGasEstimate, bufferBps: number): BundlerGasEstimate {
    return {
        preVerificationGas: applyGasBuffer(estimate.preVerificationGas, bufferBps),
        verificationGasLimit: estimate.verificationGasLimit,
        callGasLimit: applyGasBuffer(estimate.callGasLimit, bufferBps),
        paymasterVerificationGasLimit: estimate.paymasterVerificationGasLimit,
        paymasterPostOpGasLimit: estimate.paymasterPostOpGasLimit,
    };
}

function toEstimateRequest(input: EstimateAAUserOpGasInput) {
    const { verificationGasLimit, callGasLimit } = unpackAccountGasLimits(input.accountGasLimits);
    const { maxFeePerGas, maxPriorityFeePerGas } = unpackGasFees(input.gasFees);

    return {
        sender: input.sender,
        nonce: input.nonce,
        callData: input.callData,
        signature: input.signature,
        preVerificationGas: input.preVerificationGas,
        verificationGasLimit,
        callGasLimit,
        maxFeePerGas,
        maxPriorityFeePerGas,
        ...splitInitCodeForV07(input.initCode),
        ...splitPaymasterAndDataForV07(input.paymasterAndData),
    };
}

async function runBundlerGasEstimate(input: EstimateAAUserOpGasInput): Promise<BundlerGasEstimate> {
    const bundlerClient = createAaBundlerClient();
    const entryPointAddress = getAaEntryPointAddress();

    const result = await estimateUserOperationGas(bundlerClient, {
        entryPointAddress,
        ...toEstimateRequest(input),
    });

    return {
        preVerificationGas: result.preVerificationGas,
        verificationGasLimit: result.verificationGasLimit,
        callGasLimit: result.callGasLimit,
        paymasterVerificationGasLimit: result.paymasterVerificationGasLimit,
        paymasterPostOpGasLimit: result.paymasterPostOpGasLimit,
    };
}

/**
 * Alchemy (and some bundlers) return account gas from `eth_estimateUserOperationGas`
 * but omit paymasterVerificationGasLimit / paymasterPostOpGasLimit. Use limits from the
 * estimate request (hash-anchor paymaster fields) when the RPC omits them.
 */
function resolvePaymasterGasLimits(
    estimate: BundlerGasEstimate,
    input: EstimateAAUserOpGasInput
): { paymasterVerificationGasLimit: bigint; paymasterPostOpGasLimit: bigint } {
    if (
        estimate.paymasterVerificationGasLimit !== undefined &&
        estimate.paymasterPostOpGasLimit !== undefined
    ) {
        return {
            paymasterVerificationGasLimit: estimate.paymasterVerificationGasLimit,
            paymasterPostOpGasLimit: estimate.paymasterPostOpGasLimit,
        };
    }

    const fromRequest = splitPaymasterAndDataForV07(input.paymasterAndData);
    if (
        fromRequest.paymasterVerificationGasLimit !== undefined &&
        fromRequest.paymasterPostOpGasLimit !== undefined
    ) {
        return {
            paymasterVerificationGasLimit: fromRequest.paymasterVerificationGasLimit,
            paymasterPostOpGasLimit: fromRequest.paymasterPostOpGasLimit,
        };
    }

    throw new Error(
        'Bundler did not return paymaster gas limits and the estimate request had no paymaster limits.'
    );
}

function buildPaymasterAndDataFromEstimate(
    paymasterAddress: `0x${string}`,
    estimate: BundlerGasEstimate,
    input: EstimateAAUserOpGasInput
): `0x${string}` {
    const limits = resolvePaymasterGasLimits(estimate, input);
    const fromRequest = splitPaymasterAndDataForV07(input.paymasterAndData);
    const requestPmVerificationCap = fromRequest.paymasterVerificationGasLimit ?? BigInt(0);

    const paymasterVerificationGasLimit = adjustPaymasterVerificationGasLimitForAlchemy(
        limits.paymasterVerificationGasLimit,
        requestPmVerificationCap
    );

    return encodePaymasterAndData(
        paymasterAddress,
        paymasterVerificationGasLimit,
        limits.paymasterPostOpGasLimit
    );
}

function buildGasEstimateResult(
    estimate: BundlerGasEstimate,
    paymasterAndData: `0x${string}`,
    maxFeePerGas: bigint,
    maxPriorityFeePerGas: bigint
): UserOpGasEstimate {
    return {
        accountGasLimits: packAccountGasLimits(estimate.verificationGasLimit, estimate.callGasLimit),
        preVerificationGas: estimate.preVerificationGas.toString(),
        gasFees: packGasFees(maxFeePerGas, maxPriorityFeePerGas),
        paymasterAndData,
    };
}

export async function estimateAAUserOpGas(input: EstimateAAUserOpGasInput): Promise<UserOpGasEstimate> {
    const publicClient = createPublicClient({
        chain: targetChain,
        transport: http(getAaRpcUrl()),
    });

    const feeData = await publicClient.estimateFeesPerGas();
    const bufferBps = getAaGasBufferBps();
    // EIP-1559 / bundler replacements need ~10%+ higher fees than a pending UserOp.
    const feeBufferBps = Math.max(bufferBps, 1000);

    const bufferedMaxFeePerGas = applyGasBuffer(
        feeData.maxFeePerGas ?? feeData.gasPrice ?? getAaMinMaxFeePerGas(),
        feeBufferBps
    );
    const bufferedMaxPriorityFeePerGas = applyGasBuffer(
        feeData.maxPriorityFeePerGas ?? getAaMinMaxPriorityFeePerGas(),
        feeBufferBps
    );

    // Network estimate on Base Sepolia can be ~0.007 gwei; Alchemy bundler needs a higher floor to include ops.
    const maxFeePerGas =
        bufferedMaxFeePerGas > getAaMinMaxFeePerGas() ? bufferedMaxFeePerGas : getAaMinMaxFeePerGas();
    const maxPriorityFeePerGas =
        bufferedMaxPriorityFeePerGas > getAaMinMaxPriorityFeePerGas()
            ? bufferedMaxPriorityFeePerGas
            : getAaMinMaxPriorityFeePerGas();

    const paymasterAddress =
        input.paymasterAddress && shouldUsePaymasterForMode(input.mode)
            ? (input.paymasterAddress as `0x${string}`)
            : getAaPaymasterAddress();

    const usePaymaster = Boolean(paymasterAddress && shouldUsePaymasterForMode(input.mode));

    const requestCaps = unpackAccountGasLimits(input.accountGasLimits);
    const rawEstimate = await runBundlerGasEstimate(input);
    const rawEstimateForAlchemy = {
        ...rawEstimate,
        verificationGasLimit: adjustVerificationGasLimitForAlchemy(
            rawEstimate.verificationGasLimit,
            requestCaps.verificationGasLimit
        ),
    };

    const estimate = bufferGasEstimate(rawEstimateForAlchemy, bufferBps);

    const paymasterAndData =
        usePaymaster && paymasterAddress
            ? buildPaymasterAndDataFromEstimate(paymasterAddress, estimate, input)
            : ('0x' as const);

    return buildGasEstimateResult(estimate, paymasterAndData, maxFeePerGas, maxPriorityFeePerGas);
}
