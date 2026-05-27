'use client';

import { AASection } from '@/components/aa/layout/AASection';
import { AA_LOTTO_JOIN_ACTION_CARDS } from '@/hooks/aa/lottoDetailConstants';
import type { useAALottoDetailPage } from '@/hooks/aa/useAALottoDetailPage';
import { LottoState } from '@/hooks/shared/lib/lottoState';
import type { AAUi } from '@/styles/aa/uiStyles';

type Detail = ReturnType<typeof useAALottoDetailPage>;

type Props = {
    ui: AAUi;
    d: Detail;
};

export function LottoDetailActionCardsSection({ ui, d }: Props) {
    return (
        <AASection ui={ui}>
            {d.nextJoinAction ? (
                <p style={{ marginTop: 0, color: '#b8e6c4', lineHeight: 1.55 }}>
                    <strong>Recommended next step:</strong> {d.nextJoinAction} — click <strong>Estimate Gas</strong>, then{' '}
                    <strong>Sign</strong>, then <strong>Send</strong>.
                </p>
            ) : (
                <p style={{ marginTop: 0, color: '#c6dfe2', lineHeight: 1.55 }}>
                    No join action is available for the current lottery state. Refresh account state or wait for the
                    instance to change.
                </p>
            )}

            <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
                {AA_LOTTO_JOIN_ACTION_CARDS.map((card) => {
                    const preview = d.getPreviewUserOpForJoinAction(card.action);
                    const isExpanded = d.expandedAction === card.action;
                    const isSelected = d.selectedJoinAction === card.action;
                    const isNextStep = d.nextJoinAction === card.action;
                    const actionEstimateError = d.getEstimateErrorForAction(card.action);
                    const actionGasReady = d.isGasReadyForAction(card.action);
                    const actionEstimating = d.isEstimatingAction(card.action);

                    const blocksInsufficientLet =
                        d.insufficientLetKnown && (card.action === 'approveEntryFee' || card.action === 'joinLotto');
                    const blocksWrongState =
                        (card.action === 'approveEntryFee' || card.action === 'joinLotto') && !d.canApproveOrJoin
                            ? true
                            : card.action === 'requestWinner' && !d.canRequestWinner
                              ? true
                              : card.action === 'triggerRefundMode' && !d.canTriggerRefundMode
                                ? true
                                : card.action === 'withdrawPrize' && !d.canWithdrawPrize;
                    const blocksJoinWithoutAllowance =
                        card.action === 'joinLotto' && d.canApproveOrJoin && !d.hasSufficientJoinAllowance;
                    const blocksClaimRefund = card.action === 'claimRefund' && !d.canClaimRefund;

                    const estimateEnabled =
                        d.hasValidConfig &&
                        !d.isLoading &&
                        !d.mustRefreshAAAccount &&
                        d.AAAccountHydrated &&
                        !blocksWrongState &&
                        !blocksInsufficientLet &&
                        !blocksJoinWithoutAllowance &&
                        !blocksClaimRefund &&
                        !actionEstimating;

                    const signEnabled =
                        estimateEnabled &&
                        actionGasReady &&
                        !actionEstimateError;

                    const sendEnabled =
                        d.hasValidConfig &&
                        !d.isLoading &&
                        isSelected &&
                        actionGasReady &&
                        !actionEstimateError &&
                        d.userOp.signature !== '0x' &&
                        !blocksWrongState &&
                        !blocksJoinWithoutAllowance &&
                        !blocksClaimRefund;

                    return (
                        <div
                            key={card.action}
                            style={{
                                border: isNextStep
                                    ? '1px solid #76b4be'
                                    : isSelected
                                      ? '1px solid #5d8a94'
                                      : '1px solid #32515a',
                                borderRadius: 12,
                                padding: 14,
                                background: isNextStep ? 'rgba(15, 60, 70, 0.55)' : 'rgba(10, 35, 44, 0.6)',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <h3 style={{ margin: 0 }}>{card.title}</h3>
                                {isNextStep ? (
                                    <span
                                        style={{
                                            fontSize: '0.75rem',
                                            padding: '2px 8px',
                                            borderRadius: 999,
                                            background: 'rgba(118, 180, 190, 0.25)',
                                            color: '#b8e6c4',
                                        }}
                                    >
                                        next step
                                    </span>
                                ) : null}
                                {actionGasReady ? (
                                    <span
                                        style={{
                                            fontSize: '0.75rem',
                                            padding: '2px 8px',
                                            borderRadius: 999,
                                            background: 'rgba(60, 120, 80, 0.35)',
                                            color: '#b8e6c4',
                                        }}
                                    >
                                        gas ready
                                    </span>
                                ) : null}
                            </div>
                            <p style={{ margin: '8px 0 0', color: '#c6dfe2' }}>{card.description}</p>

                            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        void d.handleEstimateJoinAction(card.action);
                                    }}
                                    disabled={!estimateEnabled}
                                    style={{
                                        flex: 1,
                                        minWidth: 120,
                                        padding: '10px 12px',
                                        borderRadius: 10,
                                        border: '1px solid #5d7980',
                                        background: '#13242a',
                                        color: '#d9eef1',
                                        cursor: estimateEnabled ? 'pointer' : 'not-allowed',
                                        opacity: estimateEnabled ? 1 : 0.6,
                                    }}
                                >
                                    {actionEstimating ? 'Estimating…' : 'Estimate Gas'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        d.setSelectedJoinAction(card.action);
                                        void d.handleSignUserOpForJoinAction(card.action);
                                    }}
                                    disabled={!signEnabled}
                                    style={{
                                        flex: 1,
                                        minWidth: 100,
                                        padding: '10px 12px',
                                        borderRadius: 10,
                                        border: '1px solid #76b4be',
                                        background: 'linear-gradient(135deg, #0f7f8f, #155a8a)',
                                        color: '#ecf8ff',
                                        cursor: signEnabled ? 'pointer' : 'not-allowed',
                                        opacity: signEnabled ? 1 : 0.6,
                                    }}
                                >
                                    Sign
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        d.setSelectedJoinAction(card.action);
                                        void d.handleSendUserOp();
                                    }}
                                    disabled={!sendEnabled}
                                    style={{
                                        flex: 1,
                                        minWidth: 100,
                                        padding: '10px 12px',
                                        borderRadius: 10,
                                        border: '1px solid #76b4be',
                                        background: 'linear-gradient(135deg, #1f6f58, #2a8b66)',
                                        color: '#ecf8ff',
                                        cursor: sendEnabled ? 'pointer' : 'not-allowed',
                                        opacity: sendEnabled ? 1 : 0.6,
                                    }}
                                >
                                    Send
                                </button>
                            </div>

                            {actionEstimateError ? (
                                <p style={{ marginTop: 10, marginBottom: 0, ...ui.warningText }}>
                                    Gas estimation failed: {actionEstimateError}
                                </p>
                            ) : null}

                            {!actionGasReady && estimateEnabled && !actionEstimateError && !actionEstimating ? (
                                <p style={{ marginTop: 10, marginBottom: 0, color: '#c6dfe2', lineHeight: 1.5 }}>
                                    Run <strong>Estimate Gas</strong> for this action before Sign.
                                </p>
                            ) : null}

                            {(card.action === 'approveEntryFee' || card.action === 'joinLotto') && !d.canApproveOrJoin ? (
                                <p style={{ marginTop: 10, marginBottom: 0, ...ui.warningText }}>
                                    {d.statusNumber === undefined
                                        ? 'Waiting for instance status from the chain. Use Refresh Account State, or go back and reopen this instance.'
                                        : 'Enabled only when lottery status is OPEN.'}
                                </p>
                            ) : null}
                            {card.action === 'joinLotto' && d.canApproveOrJoin && blocksJoinWithoutAllowance ? (
                                <p style={{ marginTop: 10, marginBottom: 0, ...ui.warningText }}>
                                    Complete approveEntryFee first (estimate → sign → send). joinLotto stays disabled until
                                    on-chain allowance is at least the entry fee.
                                </p>
                            ) : null}
                            {card.action === 'requestWinner' && !d.canRequestWinner ? (
                                <p style={{ marginTop: 10, marginBottom: 0, ...ui.warningText }}>
                                    {d.statusNumber === undefined
                                        ? 'Waiting for instance status from the chain. Use Refresh Account State or reload.'
                                        : 'Enabled only when lottery status is FULL.'}
                                </p>
                            ) : null}
                            {card.action === 'triggerRefundMode' && !d.canTriggerRefundMode ? (
                                <p style={{ marginTop: 10, marginBottom: 0, ...ui.warningText }}>
                                    {d.statusNumber === undefined
                                        ? 'Waiting for instance status from the chain. Use Refresh Account State or reload.'
                                        : d.statusNumber === LottoState.CALCULATING
                                          ? 'Enabled only after the CALCULATING timeout has elapsed.'
                                          : 'Enabled only when lottery status is CALCULATING.'}
                                </p>
                            ) : null}
                            {card.action === 'withdrawPrize' && !d.canWithdrawPrize ? (
                                <p style={{ marginTop: 10, marginBottom: 0, ...ui.warningText }}>
                                    {d.statusNumber === LottoState.CLOSED &&
                                    !d.selectedSummary?.isPrizeWithdrawn &&
                                    d.hasWinner &&
                                    !d.isAAAccountWinner
                                        ? 'Only the winner AA account can withdraw the prize.'
                                        : 'Enabled only when status is CLOSED, prize not withdrawn, and your AA account is the winner.'}
                                </p>
                            ) : null}
                            {card.action === 'claimRefund' && !d.canClaimRefund ? (
                                <p style={{ marginTop: 10, marginBottom: 0, ...ui.warningText }}>
                                    {d.statusNumber === undefined
                                        ? 'Waiting for instance status from the chain. Use Refresh Account State or reload.'
                                        : 'Enabled only when lottery status is REFUNDING.'}
                                </p>
                            ) : null}

                            <button
                                type="button"
                                onClick={() => d.setExpandedAction((prev) => (prev === card.action ? null : card.action))}
                                style={{
                                    marginTop: 10,
                                    width: '100%',
                                    padding: '9px 12px',
                                    borderRadius: 10,
                                    border: '1px solid #5d7980',
                                    background: '#13242a',
                                    color: '#d9eef1',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                }}
                            >
                                {isExpanded ? '▼ Hide Auto UserOp Values' : '▶ View Auto UserOp Values'}
                            </button>

                            {isExpanded ? (
                                <div
                                    style={{
                                        marginTop: 10,
                                        border: '1px solid #2d3f45',
                                        borderRadius: 10,
                                        padding: 10,
                                        background: 'rgba(7, 19, 24, 0.72)',
                                        display: 'grid',
                                        gap: 6,
                                        fontFamily: 'ui-monospace, Menlo, monospace',
                                        fontSize: '0.82rem',
                                        color: '#d4eaee',
                                    }}
                                >
                                    <p style={{ margin: 0, wordBreak: 'break-all' }}>
                                        <strong>sender:</strong> {preview.sender || '-'}
                                    </p>
                                    <p style={{ margin: 0, wordBreak: 'break-all' }}>
                                        <strong>nonce:</strong> {preview.nonce}
                                    </p>
                                    <p style={{ margin: 0, wordBreak: 'break-all' }}>
                                        <strong>initCode:</strong> {preview.initCode}
                                    </p>
                                    <p style={{ margin: 0, wordBreak: 'break-all' }}>
                                        <strong>callData:</strong> {preview.callData}
                                    </p>
                                    <p style={{ margin: 0, wordBreak: 'break-all' }}>
                                        <strong>accountGasLimits:</strong> {preview.accountGasLimits}
                                    </p>
                                    <p style={{ margin: 0, wordBreak: 'break-all' }}>
                                        <strong>preVerificationGas:</strong> {preview.preVerificationGas}
                                    </p>
                                    <p style={{ margin: 0, wordBreak: 'break-all' }}>
                                        <strong>gasFees:</strong> {preview.gasFees}
                                    </p>
                                    <p style={{ margin: 0, wordBreak: 'break-all' }}>
                                        <strong>paymasterAndData:</strong> {preview.paymasterAndData}
                                    </p>
                                </div>
                            ) : null}
                        </div>
                    );
                })}
            </div>
        </AASection>
    );
}
