import type { AAJoinAction } from '@/lib/aa/types';

const EXECUTE_LABELS: Record<AAJoinAction, string> = {
    approveEntryFee: 'Approve Entry Fee',
    joinLotto: 'Join Lottery',
    requestWinner: 'Request Winner',
    triggerRefundMode: 'Trigger Refund',
    withdrawPrize: 'Withdraw Prize',
    claimRefund: 'Claim Refund',
};

export function getJoinActionExecuteLabel(action: AAJoinAction): string {
    return EXECUTE_LABELS[action];
}
