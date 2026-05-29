import { LottoState } from '@/hooks/shared/lib/lottoState';
import type { useAALottoDetailPage } from '@/hooks/aa/useAALottoDetailPage';

type Detail = ReturnType<typeof useAALottoDetailPage>;

export type EmptyActionVariant = 'calculating' | 'closed' | 'refunding' | 'default';

export type EmptyActionDisplay = {
    variant: EmptyActionVariant;
    title: string;
    body: string;
};

export function getEmptyActionDisplay(d: Detail): EmptyActionDisplay {
    if (d.statusNumber === LottoState.CALCULATING && !d.canTriggerRefundMode) {
        return {
            variant: 'calculating',
            title: 'Winner selection in progress',
            body: 'VRF is choosing the winner. There is nothing to do right now — check back soon.',
        };
    }

    if (d.statusNumber === LottoState.CLOSED && !d.canWithdrawPrize) {
        return {
            variant: 'closed',
            title: 'Lottery closed',
            body: 'Only the recorded winner can withdraw the prize.',
        };
    }

    if (d.statusNumber === LottoState.REFUNDING && !d.canClaimRefund) {
        return {
            variant: 'refunding',
            title: 'Refund mode',
            body: 'You are not eligible to claim a refund on this lottery.',
        };
    }

    return {
        variant: 'default',
        title: 'No action available',
        body: 'Nothing to do on this lottery right now.',
    };
}

export function shouldHideGuidanceSubtitle(d: Detail, showActionCard: boolean): boolean {
    return !showActionCard && d.statusNumber === LottoState.CALCULATING && !d.canTriggerRefundMode;
}
