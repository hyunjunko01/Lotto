import { LottoState } from '@/hooks/shared/lib/lottoState';
import type { MetamaskDetailAction } from '@/hooks/metamask/lotto-detail/types';
import type { useMetamaskLottoDetailPage } from '@/hooks/metamask/lotto-detail/useMetamaskLottoDetailPage';

type Detail = ReturnType<typeof useMetamaskLottoDetailPage>;

export type { MetamaskDetailAction };

const ACTION_LABELS: Record<MetamaskDetailAction, string> = {
    approve: 'Approve Entry Fee',
    join: 'Join Lottery',
    requestWinner: 'Request Winner',
    triggerRefundMode: 'Trigger Refund',
    withdrawPrize: 'Withdraw Prize',
    claimRefund: 'Claim Refund',
};

const SUCCESS_LABELS: Record<MetamaskDetailAction, string> = {
    approve: 'Entry fee approved successfully.',
    join: 'Joined lottery successfully.',
    requestWinner: 'Winner request confirmed.',
    triggerRefundMode: 'Refund mode triggered successfully.',
    withdrawPrize: 'Prize withdrawn successfully.',
    claimRefund: 'Refund claimed successfully.',
};

export function getMetamaskDetailAction(d: Detail): MetamaskDetailAction | null {
    if (d.canJoin && !d.insufficientLetKnown) {
        if (!d.hasSufficientAllowance) {
            return 'approve';
        }
        return 'join';
    }
    if (d.canRequest) {
        return 'requestWinner';
    }
    if (d.canTriggerRefundMode) {
        return 'triggerRefundMode';
    }
    if (d.canClaimRefund) {
        return 'claimRefund';
    }
    if (d.canWithdraw) {
        return 'withdrawPrize';
    }
    return null;
}

export function getMetamaskActionLabel(action: MetamaskDetailAction): string {
    return ACTION_LABELS[action];
}

export function getMetamaskActionSuccessMessage(action: MetamaskDetailAction): string {
    return SUCCESS_LABELS[action];
}

export function isMetamaskActionEnabled(d: Detail, action: MetamaskDetailAction): boolean {
    if (!d.canExecute) {
        return false;
    }

    if (action === 'approve') {
        return d.canJoin && d.entryFee !== undefined && !d.insufficientLetKnown && !d.hasSufficientAllowance;
    }

    if (action === 'join') {
        return (
            d.canJoin &&
            d.hasSufficientAllowance &&
            d.hasSufficientBalance &&
            !d.insufficientLetKnown
        );
    }

    if (action === 'requestWinner') {
        return d.canRequest;
    }

    if (action === 'triggerRefundMode') {
        return d.canTriggerRefundMode;
    }

    if (action === 'withdrawPrize') {
        return d.canWithdraw;
    }

    return d.canClaimRefund;
}

export function shouldHideMetamaskGuidanceSubtitle(d: Detail, showActionCard: boolean): boolean {
    return !showActionCard && d.statusNumber === LottoState.CALCULATING && !d.canTriggerRefundMode;
}
