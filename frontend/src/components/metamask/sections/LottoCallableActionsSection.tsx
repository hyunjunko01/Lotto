'use client';

import { MetamaskSection } from '@/components/metamask/layout/MetamaskSection';
import type { useMetamaskLottoDetailPage } from '@/hooks/metamask/lotto-detail/useMetamaskLottoDetailPage';
import { LottoState } from '@/hooks/shared/lib/lottoState';
import type { MetamaskUi } from '@/styles/metamask/uiStyles';
import type { MetamaskThemeTokens } from '@/styles/metamask/tokens';

type Detail = ReturnType<typeof useMetamaskLottoDetailPage>;

type Props = {
    ui: MetamaskUi;
    t: MetamaskThemeTokens;
    d: Detail;
};

const actionCardStyle = {
    border: '1px solid #31525b',
    borderRadius: 10,
    padding: '12px 14px',
    marginBottom: 12,
} as const;

export function LottoCallableActionsSection({ ui, t, d }: Props) {
    const approveEnabled =
        d.canExecute &&
        d.lottoAddress &&
        d.entryTokenAddress &&
        d.entryFee !== undefined &&
        d.canJoin &&
        !d.insufficientLetKnown;

    const joinEnabled = d.canExecute && d.canJoin && d.hasSufficientAllowance && d.hasSufficientBalance;

    return (
        <MetamaskSection ui={ui}>
            <h2 style={ui.h2InSection}>Callable Functions</h2>

            <div style={actionCardStyle}>
                <h3 style={{ margin: '0 0 10px 0' }}>joinLotto</h3>
                <p style={{ margin: '0 0 10px', ...ui.bodyMuted }}>
                    `joinLotto` uses ERC20 (LET) allowance, not direct ETH transfer.
                </p>
                <button
                    type="button"
                    onClick={() => void d.handleApproveEntryToken()}
                    disabled={!approveEnabled}
                    style={{
                        ...ui.primaryButton,
                        marginRight: 8,
                        cursor: approveEnabled ? 'pointer' : 'not-allowed',
                        opacity: approveEnabled ? 1 : 0.5,
                    }}
                >
                    Approve Entry Fee
                </button>
                <button
                    type="button"
                    onClick={() => void d.handleJoinLotto()}
                    disabled={!joinEnabled}
                    style={{
                        ...ui.primaryButton,
                        cursor: joinEnabled ? 'pointer' : 'not-allowed',
                        opacity: joinEnabled ? 1 : 0.5,
                    }}
                >
                    Join Lotto
                </button>
                {d.insufficientLetKnown ? (
                    <p style={{ marginTop: 10, color: t.warnText }}>
                        Not enough LET to pay the entry fee. Use the token faucet, then approve and join.
                    </p>
                ) : null}
                {!d.insufficientLetKnown && !d.hasSufficientAllowance ? (
                    <p style={{ marginTop: 10, color: t.warnText }}>Run &quot;Approve Entry Fee&quot; first.</p>
                ) : null}
                {!d.canJoin ? <p style={{ marginTop: 10, ...ui.bodyMuted }}>Enabled only when status is OPEN.</p> : null}
            </div>

            <div style={actionCardStyle}>
                <h3 style={{ margin: '0 0 10px 0' }}>requestWinner</h3>
                <button
                    type="button"
                    onClick={() => void d.handleRequestWinner()}
                    disabled={!d.canExecute || !d.lottoAddress || !d.canRequest}
                    style={{
                        ...ui.primaryButton,
                        cursor: d.canExecute && d.canRequest ? 'pointer' : 'not-allowed',
                        opacity: d.canExecute && d.canRequest ? 1 : 0.5,
                    }}
                >
                    Request Winner
                </button>
                {!d.canRequest ? <p style={{ marginTop: 10, ...ui.bodyMuted }}>Enabled only when status is FULL.</p> : null}
            </div>

            <div style={actionCardStyle}>
                <h3 style={{ margin: '0 0 10px 0' }}>triggerRefundMode</h3>
                <p style={{ margin: '0 0 10px', ...ui.bodyMuted }}>
                    If VRF is stuck, anyone can switch the instance into REFUNDING mode after the timeout.
                </p>
                <button
                    type="button"
                    onClick={() => void d.handleTriggerRefundMode()}
                    disabled={!d.canExecute || !d.lottoAddress || !d.canTriggerRefundMode}
                    style={{
                        ...ui.primaryButton,
                        cursor: d.canExecute && d.canTriggerRefundMode ? 'pointer' : 'not-allowed',
                        opacity: d.canExecute && d.canTriggerRefundMode ? 1 : 0.5,
                    }}
                >
                    Trigger Refund Mode
                </button>
                {!d.canTriggerRefundMode ? (
                    <p style={{ marginTop: 10, ...ui.bodyMuted }}>
                        {d.statusNumber === LottoState.CALCULATING
                            ? 'Enabled only after the CALCULATING timeout has elapsed.'
                            : 'Enabled only when status is CALCULATING.'}
                    </p>
                ) : null}
            </div>

            <div style={actionCardStyle}>
                <h3 style={{ margin: '0 0 10px 0' }}>withdrawPrize</h3>
                <button
                    type="button"
                    onClick={() => void d.handleWithdrawPrize()}
                    disabled={!d.canExecute || !d.lottoAddress || !d.canWithdraw}
                    style={{
                        ...ui.primaryButton,
                        cursor: d.canExecute && d.canWithdraw ? 'pointer' : 'not-allowed',
                        opacity: d.canExecute && d.canWithdraw ? 1 : 0.5,
                    }}
                >
                    Withdraw Prize
                </button>
                {!d.canWithdraw ? (
                    <p style={{ marginTop: 10, ...ui.bodyMuted }}>
                        Enabled only when status is CLOSED and prize is not withdrawn.
                    </p>
                ) : null}
                {d.statusNumber === LottoState.CLOSED &&
                !d.isPrizeWithdrawn &&
                !d.isConnectedWinner ? (
                    <p style={{ marginTop: 10, color: t.warnText }}>Only the winner can withdraw the prize.</p>
                ) : null}
            </div>

            <div style={{ ...actionCardStyle, marginBottom: 0 }}>
                <h3 style={{ margin: '0 0 10px 0' }}>claimRefund</h3>
                <button
                    type="button"
                    onClick={() => void d.handleClaimRefund()}
                    disabled={!d.canExecute || !d.lottoAddress || !d.canClaimRefund}
                    style={{
                        ...ui.primaryButton,
                        cursor: d.canExecute && d.canClaimRefund ? 'pointer' : 'not-allowed',
                        opacity: d.canExecute && d.canClaimRefund ? 1 : 0.5,
                    }}
                >
                    Claim Refund
                </button>
                {!d.canClaimRefund ? (
                    <p style={{ marginTop: 10, ...ui.bodyMuted }}>
                        Enabled only when status is REFUNDING and you have a refundable balance.
                    </p>
                ) : null}
            </div>

            {d.actionTxHash ? <p style={ui.monoInline}>Tx: {d.actionTxHash}</p> : null}
            {d.isActionConfirmed ? <p style={{ marginTop: 12, color: t.successText }}>Transaction confirmed.</p> : null}
            {d.actionError ? <p style={{ ...ui.errorBox, marginTop: 12 }}>{d.actionError}</p> : null}
        </MetamaskSection>
    );
}
