import { LottoState } from '@/hooks/shared/lib/lottoState';
import type { useAALottoDetailPage } from '@/hooks/aa/useAALottoDetailPage';

type Detail = ReturnType<typeof useAALottoDetailPage>;

export function getDetailGuidance(d: Detail): string {
    if (!d.hasValidConfig) {
        return 'This page cannot load lottery actions until app configuration is fixed.';
    }

    if (!d.sessionToken || !d.AAAccountHydrated) {
        return 'When your AA account is ready, you can run the action below.';
    }

    if (d.insufficientLetKnown && d.canApproveOrJoin) {
        return 'Get LET from the faucet, then come back to join.';
    }

    if (d.statusNumber === LottoState.OPEN) {
        if (d.nextJoinAction === 'approveEntryFee') {
            return 'Approve the entry fee, then join this lottery.';
        }
        if (!d.hasSufficientJoinAllowance) {
            return 'Approve the entry fee before you join.';
        }
        return 'You can join this open lottery now.';
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
        if (d.canWithdrawPrize) {
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
