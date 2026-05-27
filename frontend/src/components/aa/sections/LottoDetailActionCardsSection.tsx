'use client';

import { AASection } from '@/components/aa/layout/AASection';
import { AA_LOTTO_JOIN_ACTION_CARDS } from '@/hooks/aa/lottoDetailConstants';
import type { useAALottoDetailPage } from '@/hooks/aa/useAALottoDetailPage';
import type { AAUi } from '@/styles/aa/uiStyles';

type Detail = ReturnType<typeof useAALottoDetailPage>;

type Props = {
    ui: AAUi;
    d: Detail;
};

export function LottoDetailActionCardsSection({ ui, d }: Props) {
    const visibleAction = d.nextJoinAction === 'approveEntryFee' ? 'joinLotto' : d.nextJoinAction;
    const visibleCards = AA_LOTTO_JOIN_ACTION_CARDS.filter((card) => card.action === visibleAction);

    return (
        <AASection ui={ui}>
            {visibleCards.length === 0 ? (
                <p style={{ marginTop: 0, color: '#c6dfe2', lineHeight: 1.55 }}>
                    No available action for current status.
                </p>
            ) : null}

            <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
                {visibleCards.map((card) => {
                    const preview = d.getPreviewUserOpForJoinAction(card.action);
                    const isExpanded = d.expandedAction === card.action;
                    const isSelected = d.selectedJoinAction === card.action;
                    const actionEstimateError = d.getEstimateErrorForAction(card.action);
                    const actionGasReady = d.isGasReadyForAction(card.action);
                    const actionEstimating = d.isEstimatingAction(card.action);
                    const needsAutoApproveBeforeJoin = d.nextJoinAction === 'approveEntryFee' && card.action === 'joinLotto';

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
                        card.action === 'joinLotto' &&
                        d.canApproveOrJoin &&
                        !d.hasSufficientJoinAllowance &&
                        !needsAutoApproveBeforeJoin;
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

                    const executeEnabled =
                        d.hasValidConfig &&
                        !d.isLoading &&
                        !d.mustRefreshAAAccount &&
                        d.AAAccountHydrated &&
                        !blocksWrongState &&
                        !blocksInsufficientLet &&
                        !blocksJoinWithoutAllowance &&
                        !blocksClaimRefund &&
                        !actionEstimating;

                    return (
                        <div
                            key={card.action}
                            style={{
                                border: isSelected ? '1px solid #5d8a94' : '1px solid #76b4be',
                                borderRadius: 12,
                                padding: 14,
                                background: 'rgba(15, 60, 70, 0.55)',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <h3 style={{ margin: 0 }}>{card.title}</h3>
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
                            <p style={{ margin: '8px 0 0', color: '#c6dfe2' }}>
                                {needsAutoApproveBeforeJoin
                                    ? 'Allowance is missing. Execute runs approveEntryFee first, then joinLotto automatically.'
                                    : card.description}
                            </p>

                            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        void (async () => {
                                            if (needsAutoApproveBeforeJoin) {
                                                const approved = await d.handleExecuteUserOp('approveEntryFee');
                                                if (!approved) return;

                                                await d.handleExecuteUserOp('joinLotto', { skipJoinAllowanceCheck: true });
                                                return;
                                            }

                                            await d.handleExecuteUserOp(card.action);
                                        })();
                                    }}
                                    disabled={!executeEnabled}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        borderRadius: 10,
                                        border: '1px solid #76b4be',
                                        background: 'linear-gradient(135deg, #1f6f58, #2a8b66)',
                                        color: '#ecf8ff',
                                        cursor: executeEnabled ? 'pointer' : 'not-allowed',
                                        opacity: executeEnabled ? 1 : 0.6,
                                    }}
                                >
                                    {actionEstimating
                                        ? 'Estimating...'
                                        : d.isLoading && isSelected
                                          ? 'Executing...'
                                          : 'Execute'}
                                </button>
                            </div>

                            {actionEstimateError ? (
                                <p style={{ marginTop: 10, marginBottom: 0, ...ui.warningText }}>
                                    Gas estimation failed: {actionEstimateError}
                                </p>
                            ) : null}

                            {!actionGasReady && estimateEnabled && !actionEstimateError && !actionEstimating ? (
                                <p style={{ marginTop: 10, marginBottom: 0, color: '#c6dfe2', lineHeight: 1.5 }}>
                                    Execute will estimate, sign, and send this action in one flow.
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
