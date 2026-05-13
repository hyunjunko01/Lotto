export type AALotteryMode = 'create' | 'join' | 'faucet';
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

export type AccountResponse = {
    ok: boolean;
    account?: {
        ownerAddress: string;
        accountAddress: string;
        salt: string;
    };
    error?: string;
};

export type SendUserOpResponse = {
    ok?: boolean;
    userOpHash?: string;
    serverUserOpHash?: string;
    clientUserOpHash?: string;
    error?: string;
};

export type NonceResponse = {
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
}
