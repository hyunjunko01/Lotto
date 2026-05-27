export type AALotteryMode = 'create' | 'join' | 'faucet';

/** `auto`: estimate on draft changes. `manual`: user clicks Estimate for the currently selected flow/action. */
export type AAGasEstimateMode = 'auto' | 'manual';

export type AAJoinAction =
    | 'approveEntryFee'
    | 'joinLotto'
    | 'requestWinner'
    | 'withdrawPrize'
    | 'triggerRefundMode'
    | 'claimRefund';

export type AALottoSummary = {
    address: string;
    playerCount?: bigint;
    maxPlayers?: bigint;
    entryFee?: bigint;
    entryToken?: string;
    lottoState?: bigint;
    winner?: string;
    isPrizeWithdrawn?: boolean;
    randomnessRequestedAt?: bigint;
    calculatingTimeout?: bigint;
};

export type AAAccountResponse = {
    ok: boolean;
    account?: {
        ownerAddress: string;
        accountAddress: string;
        salt: string;
    };
    error?: string;
};

export type AASendUserOpResponse = {
    ok?: boolean;
    userOpHash?: string;
    serverUserOpHash?: string;
    clientUserOpHash?: string;
    error?: string;
};

export type AANonceResponse = {
    ok?: boolean;
    nonce?: string;
    error?: string;
};

export interface UseAALotteryProps {
    mode: AALotteryMode;
    lottoFactoryAddress: string;
    accountFactoryAddress: string;
    entryTokenAddress?: string;
    initialJoinTargetAddress?: string;
    gasEstimateMode?: AAGasEstimateMode;
    loadJoinInstances?: boolean;
    joinSummaryOverride?: AALottoSummary;
}

export type UserOpFields = {
    sender: string;
    nonce: string;
    initCode: string;
    callData: string;
    accountGasLimits: string;
    preVerificationGas: string;
    gasFees: string;
    paymasterAndData: string;
    signature: string;
};

export type AAWorkflowStatus = {
    status: string;
    setStatus: (status: string) => void;
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
};
