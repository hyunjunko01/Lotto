import type { AAJoinAction, AALottoSummary } from '@/lib/aa/types';
import { isRefundTimeoutElapsed } from '@/lib/aa/join/lottoSummary';

/** Matches MetaMask lotto page: OPEN=approve/join, FULL=requestWinner, CLOSED+winner+AA=withdraw */
export function joinActionAllowedByState(
    action: AAJoinAction,
    summary: AALottoSummary | undefined,
    AAAccountAddress: string
): { ok: true } | { ok: false; message: string } {
    const st =
        summary?.lottoState !== undefined && summary.lottoState !== null ? Number(summary.lottoState) : undefined;

    if (action === 'approveEntryFee' || action === 'joinLotto') {
        if (st !== 0) {
            return {
                ok: false,
                message:
                    st === undefined
                        ? 'Lottery state could not be read. Use Refresh Account State or reload instances, then try again.'
                        : 'approve and join are only available while lottery status is OPEN.',
            };
        }
        return { ok: true };
    }

    if (action === 'requestWinner') {
        if (st !== 1) {
            return {
                ok: false,
                message:
                    st === undefined
                        ? 'Lottery state could not be read. Use Refresh Account State or reload instances, then try again.'
                        : 'requestWinner is only available while lottery status is FULL.',
            };
        }
        return { ok: true };
    }

    if (action === 'triggerRefundMode') {
        if (st !== 2) {
            return {
                ok: false,
                message:
                    st === undefined
                        ? 'Lottery state could not be read. Use Refresh Account State or reload instances, then try again.'
                        : 'triggerRefundMode is only available while lottery status is CALCULATING.',
            };
        }
        if (!isRefundTimeoutElapsed(summary)) {
            return {
                ok: false,
                message: 'triggerRefundMode is only available after the CALCULATING timeout has elapsed.',
            };
        }
        return { ok: true };
    }

    if (action === 'claimRefund') {
        if (st !== 4) {
            return {
                ok: false,
                message:
                    st === undefined
                        ? 'Lottery state could not be read. Use Refresh Account State or reload instances, then try again.'
                        : 'claimRefund is only available while lottery status is REFUNDING.',
            };
        }
        return { ok: true };
    }

    const winnerAddr = summary?.winner;
    const isAAWinner =
        Boolean(AAAccountAddress && winnerAddr) && AAAccountAddress.toLowerCase() === winnerAddr!.toLowerCase();
    if (st !== 3 || summary?.isPrizeWithdrawn || !isAAWinner) {
        return {
            ok: false,
            message:
                'withdrawPrize is only available when status is CLOSED, the prize was not withdrawn yet, and your AA account is the recorded winner.',
        };
    }
    return { ok: true };
}
