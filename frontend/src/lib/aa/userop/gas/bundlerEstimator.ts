import { fetchUserOpGasEstimate } from '@/lib/aa/userop/gas/fetchUserOpGasEstimate';
import type { UserOpGasEstimator, UserOpGasEstimatorParams } from '@/lib/aa/userop/gas/types';

async function estimateViaBundler(params: UserOpGasEstimatorParams) {
    const { sender, nonce, initCode, callData, signature, hashAnchorGas } = params;
    if (
        !sender ||
        nonce === undefined ||
        initCode === undefined ||
        callData === undefined ||
        !signature ||
        !hashAnchorGas
    ) {
        throw new Error(
            'Bundler gas estimation requires sender, nonce, initCode, callData, Web3Auth signature, and hash anchor gas.'
        );
    }

    return fetchUserOpGasEstimate({
        mode: params.mode,
        selectedJoinAction: params.selectedJoinAction,
        paymasterAddress: params.paymasterAddress,
        sender,
        nonce,
        initCode,
        callData,
        signature,
        hashAnchorGas,
    });
}

export const bundlerUserOpGasEstimator: UserOpGasEstimator = {
    estimate: estimateViaBundler,
};
