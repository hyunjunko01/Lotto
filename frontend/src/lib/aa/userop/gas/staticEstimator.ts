import { isAddress } from 'viem';
import type { UserOpGasEstimate, UserOpGasEstimator, UserOpGasEstimatorParams } from '@/lib/aa/userop/gas/types';
import { accountGasLimitsForJoinAction, encodePaymasterAndData, packAccountGasLimits } from '@/lib/aa/userop/packing';

export function estimateStaticUserOpGas(params: UserOpGasEstimatorParams): UserOpGasEstimate {
    const { mode, selectedJoinAction, paymasterAddress } = params;

    let accountGasLimits: `0x${string}`;
    if (mode === 'create') {
        accountGasLimits = packAccountGasLimits(BigInt(300000), BigInt(500000));
    } else if (mode === 'join') {
        accountGasLimits = accountGasLimitsForJoinAction(selectedJoinAction);
    } else {
        accountGasLimits = packAccountGasLimits(BigInt(150000), BigInt(200000));
    }

    const maxFeePerGas = BigInt(2e9);
    const maxPriorityFeePerGas = BigInt(1e9);
    const packed = (maxPriorityFeePerGas << BigInt(128)) | maxFeePerGas;
    const gasFees = `0x${packed.toString(16).padStart(64, '0')}` as `0x${string}`;

    let paymasterAndData: `0x${string}` = '0x';
    if (
        (mode === 'create' || mode === 'faucet' || mode === 'join') &&
        paymasterAddress &&
        isAddress(paymasterAddress)
    ) {
        paymasterAndData = encodePaymasterAndData(paymasterAddress, BigInt(120000), BigInt(40000));
    }

    return {
        accountGasLimits,
        preVerificationGas: '60000',
        gasFees,
        paymasterAndData,
    };
}

export const staticUserOpGasEstimator: UserOpGasEstimator = {
    estimate: estimateStaticUserOpGas,
};
