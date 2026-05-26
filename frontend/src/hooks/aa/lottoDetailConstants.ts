import type { AAJoinAction } from '@/lib/aa/types';

export const AA_LOTTO_JOIN_ACTION_CARDS = [
    {
        action: 'approveEntryFee' as const,
        title: 'approveEntryFee',
        description: 'Step 1 — AA account sets ERC20 allowance for this lottery (do this before joinLotto).',
    },
    {
        action: 'joinLotto' as const,
        title: 'joinLotto',
        description: 'Step 2 — After approve confirms and allowance ≥ entry fee, join the lottery.',
    },
    {
        action: 'requestWinner' as const,
        title: 'requestWinner',
        description: 'After the lottery is full, request winner selection through VRF.',
    },
    {
        action: 'triggerRefundMode' as const,
        title: 'triggerRefundMode',
        description: 'If VRF is stuck in CALCULATING past the timeout, switch the instance into REFUNDING mode.',
    },
    {
        action: 'withdrawPrize' as const,
        title: 'withdrawPrize',
        description: 'The recorded winner withdraws the prize.',
    },
    {
        action: 'claimRefund' as const,
        title: 'claimRefund',
        description: 'Claim your refundable entry fees after the instance enters REFUNDING mode.',
    },
] as const satisfies ReadonlyArray<{
    action: AAJoinAction;
    title: string;
    description: string;
}>;
