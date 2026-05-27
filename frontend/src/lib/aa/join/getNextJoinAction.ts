import type { AAJoinAction } from '@/lib/aa/types';

/** Suggested next UserOp for the join detail flow (matches MetaMask lotto page ordering). */
export function getNextJoinAction(params: {
    canApproveOrJoin: boolean;
    hasSufficientJoinAllowance: boolean;
    canRequestWinner: boolean;
    canTriggerRefundMode: boolean;
    canWithdrawPrize: boolean;
    canClaimRefund: boolean;
}): AAJoinAction | null {
    if (params.canApproveOrJoin) {
        return params.hasSufficientJoinAllowance ? 'joinLotto' : 'approveEntryFee';
    }
    if (params.canRequestWinner) {
        return 'requestWinner';
    }
    if (params.canTriggerRefundMode) {
        return 'triggerRefundMode';
    }
    if (params.canClaimRefund) {
        return 'claimRefund';
    }
    if (params.canWithdrawPrize) {
        return 'withdrawPrize';
    }
    return null;
}
