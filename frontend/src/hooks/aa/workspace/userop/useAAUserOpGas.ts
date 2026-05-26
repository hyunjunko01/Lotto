'use client';

import { useMemo } from 'react';
import type { AALotteryMode, AAJoinAction } from '@/lib/aa/types';
import { getAAGasEstimator } from '@/lib/aa/userop/gas/getAAGasEstimator';

export function useAAUserOpGas(mode: AALotteryMode, selectedJoinAction: AAJoinAction) {
    const paymasterAddress = process.env.NEXT_PUBLIC_PAYMASTER_ADDRESS;

    return useMemo(
        () =>
            getAAGasEstimator().estimate({
                mode,
                selectedJoinAction,
                paymasterAddress,
            }),
        [mode, paymasterAddress, selectedJoinAction]
    );
}
