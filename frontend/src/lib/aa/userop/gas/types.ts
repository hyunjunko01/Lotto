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
};

export interface UserOpGasEstimator {
    estimate(params: UserOpGasEstimatorParams): UserOpGasEstimate;
}
