import { LottoState } from '@/hooks/shared/lib/lottoState';
import type { useMetamaskLottoDetailPage } from '@/hooks/metamask/lotto-detail/useMetamaskLottoDetailPage';

type Detail = ReturnType<typeof useMetamaskLottoDetailPage>;

export function getMetamaskDetailGuidance(d: Detail): string {
    if (!d.isConnected) {
        return 'Connect MetaMask from the header, then run the action below.';
    }

    if (d.isWrongNetwork) {
        return `Switch your wallet to ${d.targetNetworkLabel}, then continue.`;
    }

    if (d.insufficientLetKnown && d.canJoin) {
        return 'Get LET from the faucet, then approve and join.';
    }

    if (d.statusNumber === LottoState.OPEN) {
        if (!d.hasSufficientAllowance) {
            return 'Approve the entry fee first. The join step appears after approval confirms.';
        }
        return 'Entry fee is approved. Join this lottery when you are ready.';
    }

    if (d.statusNumber === LottoState.FULL) {
        return 'This lottery is full. You can request a winner when ready.';
    }

    if (d.statusNumber === LottoState.CALCULATING) {
        if (d.canTriggerRefundMode) {
            return 'Winner selection is taking too long. You can trigger refund mode.';
        }
        return 'Winner selection is in progress. Check back soon.';
    }

    if (d.statusNumber === LottoState.CLOSED) {
        if (d.canWithdraw) {
            return 'You won this lottery. Withdraw your prize below.';
        }
        return 'This lottery is closed.';
    }

    if (d.statusNumber === LottoState.REFUNDING) {
        if (d.canClaimRefund) {
            return 'Refund mode is on. Claim your entry back below.';
        }
        return 'This lottery is in refund mode.';
    }

    return 'See below for what you can do on this lottery right now.';
}
