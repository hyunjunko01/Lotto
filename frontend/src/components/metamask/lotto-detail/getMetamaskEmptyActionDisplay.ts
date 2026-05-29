import { LottoState } from '@/hooks/shared/lib/lottoState';
import type { useMetamaskLottoDetailPage } from '@/hooks/metamask/lotto-detail/useMetamaskLottoDetailPage';

type Detail = ReturnType<typeof useMetamaskLottoDetailPage>;

export type MetamaskEmptyActionVariant = 'calculating' | 'closed' | 'refunding' | 'default';

export type MetamaskEmptyActionDisplay = {
    variant: MetamaskEmptyActionVariant;
    title: string;
    body: string;
};

export function getMetamaskEmptyActionDisplay(d: Detail): MetamaskEmptyActionDisplay {
    if (d.statusNumber === LottoState.CALCULATING && !d.canTriggerRefundMode) {
        return {
            variant: 'calculating',
            title: 'Winner selection in progress',
            body: 'VRF is choosing the winner. There is nothing to do right now — check back soon.',
        };
    }

    if (d.statusNumber === LottoState.CLOSED && !d.canWithdraw) {
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
