import type { AALotteryMode, AAJoinAction } from '@/lib/aa/types';
import { ESTIMATE_REQUEST_PRE_VERIFICATION_GAS } from '@/lib/aa/userop/gas/hashAnchorGas';
import type { UserOpGasEstimate } from '@/lib/aa/userop/gas/types';

type EstimateApiResponse = {
    ok?: boolean;
    gas?: UserOpGasEstimate;
    error?: string;
};

export type FetchUserOpGasEstimateParams = {
    mode: AALotteryMode;
    selectedJoinAction: AAJoinAction;
    sender: string;
    nonce: bigint | string;
    initCode: `0x${string}`;
    callData: string;
    paymasterAddress?: string;
    signature: `0x${string}`;
    hashAnchorGas: UserOpGasEstimate;
};

/** Calls server bundler estimate (`eth_estimateUserOperationGas` via viem/account-abstraction). */
export async function fetchUserOpGasEstimate(
    params: FetchUserOpGasEstimateParams
): Promise<UserOpGasEstimate> {
    const response = await fetch('/api/aa/userop/estimate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            mode: params.mode,
            selectedJoinAction: params.selectedJoinAction,
            sender: params.sender,
            nonce: params.nonce.toString(),
            initCode: params.initCode,
            callData: params.callData,
            paymasterAddress: params.paymasterAddress,
            signature: params.signature,
            accountGasLimits: params.hashAnchorGas.accountGasLimits,
            preVerificationGas: ESTIMATE_REQUEST_PRE_VERIFICATION_GAS,
            gasFees: params.hashAnchorGas.gasFees,
            paymasterAndData: params.hashAnchorGas.paymasterAndData,
        }),
    });

    const json = (await response.json()) as EstimateApiResponse;
    if (!response.ok || !json.ok || !json.gas) {
        throw new Error(json.error ?? 'Bundler gas estimation failed.');
    }

    return json.gas;
}
