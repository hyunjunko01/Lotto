import type { AALotteryMode, AAJoinAction } from '@/lib/aa/types';

export type UserOpGasEstimate = {
    accountGasLimits: `0x${string}`;
    preVerificationGas: string;
    gasFees: `0x${string}`;
    paymasterAndData: `0x${string}`;
};

export type UserOpGasEstimatorParams = {
    mode: AALotteryMode;
    selectedJoinAction: AAJoinAction;
    paymasterAddress?: string;
    sender?: string;
    nonce?: string | bigint;
    initCode?: `0x${string}`;
    callData?: string;
    signature?: `0x${string}`;
    hashAnchorGas?: UserOpGasEstimate;
};

export interface UserOpGasEstimator {
    estimate(params: UserOpGasEstimatorParams): Promise<UserOpGasEstimate>;
}

export const EMPTY_USER_OP_GAS: UserOpGasEstimate = {
    accountGasLimits: '0x0000000000000000000000000000000000000000000000000000000000000000',
    preVerificationGas: '0',
    gasFees: '0x0000000000000000000000000000000000000000000000000000000000000000',
    paymasterAndData: '0x',
};
