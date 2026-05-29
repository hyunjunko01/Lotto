'use client';

import { useState } from 'react';
import { formatEther } from 'viem';
import { ActionButtonsSection } from '@/components/aa/sections/ActionButtonsSection';
import { AccountStatusSection } from '@/components/aa/sections/AccountStatusSection';
import { UserOpDetailsPanel } from '@/components/aa/workspace/common/UserOpDetailsPanel';
import { getDetailGuidance } from '@/components/aa/lotto-detail/getDetailGuidance';
import {
    getEmptyActionDisplay,
    shouldHideGuidanceSubtitle,
} from '@/components/aa/lotto-detail/getEmptyActionDisplay';
import sharedStyles from '@/components/aa/workspace/aaWorkspaceShared.module.css';
import styles from '@/components/aa/lotto-detail/lottoDetail.module.css';
import workspaceStyles from '@/components/aa/workspace/AALotteryWorkspace.module.css';
import { getJoinActionExecuteLabel } from '@/hooks/aa/lottoDetailConstants';
import { shortenAddress } from '@/hooks/shared/lib/shortenAddress';
import type { AAJoinAction } from '@/lib/aa/types';
import type { useAALottoDetailPage } from '@/hooks/aa/useAALottoDetailPage';
import { AA_FACTORY_ENV_ERROR } from '@/lib/aa/env';

type Detail = ReturnType<typeof useAALottoDetailPage>;

type Props = {
    d: Detail;
};

export function LottoDetailActionCardsSection({ d }: Props) {
    const [isExecutingFlow, setIsExecutingFlow] = useState(false);
    const activeAction: AAJoinAction | null =
        d.nextJoinAction === 'approveEntryFee' ? 'joinLotto' : d.nextJoinAction;
    const showJoinCard = activeAction === 'joinLotto';
    const showActionCard =
        activeAction === 'joinLotto' ||
        activeAction === 'requestWinner' ||
        activeAction === 'triggerRefundMode' ||
        activeAction === 'withdrawPrize' ||
        activeAction === 'claimRefund';

    const actionEstimateError = activeAction ? d.getEstimateErrorForAction(activeAction) : undefined;
    const actionGasReady = activeAction ? d.isGasReadyForAction(activeAction) : false;
    const actionEstimating = activeAction ? d.isEstimatingAction(activeAction) : false;
    const isExpanded = Boolean(activeAction && d.expandedAction === activeAction);
    const isSelected = Boolean(activeAction && d.selectedJoinAction === activeAction);
    const needsAutoApproveBeforeJoin = d.nextJoinAction === 'approveEntryFee' && activeAction === 'joinLotto';

    const blocksInsufficientLet = d.insufficientLetKnown && activeAction === 'joinLotto';
    const blocksWrongState =
        activeAction === 'joinLotto' && !d.canApproveOrJoin
            ? true
            : activeAction === 'requestWinner' && !d.canRequestWinner
              ? true
              : activeAction === 'triggerRefundMode' && !d.canTriggerRefundMode
                ? true
                : activeAction === 'withdrawPrize' && !d.canWithdrawPrize;
    const blocksJoinWithoutAllowance =
        activeAction === 'joinLotto' &&
        d.canApproveOrJoin &&
        !d.hasSufficientJoinAllowance &&
        !needsAutoApproveBeforeJoin;
    const blocksClaimRefund = activeAction === 'claimRefund' && !d.canClaimRefund;

    const executeEnabled =
        showActionCard &&
        d.hasValidConfig &&
        !d.isLoading &&
        !isExecutingFlow &&
        !d.mustRefreshAAAccount &&
        d.AAAccountHydrated &&
        Boolean(d.sessionToken) &&
        !blocksWrongState &&
        !blocksInsufficientLet &&
        !blocksJoinWithoutAllowance &&
        !blocksClaimRefund &&
        !actionEstimating;

    const executeLabel = needsAutoApproveBeforeJoin
        ? 'Approve and Join'
        : activeAction
          ? getJoinActionExecuteLabel(activeAction)
          : 'Execute';

    const preview = activeAction ? d.getPreviewUserOpForJoinAction(activeAction) : d.userOp;
    const emptyDisplay = !showActionCard ? getEmptyActionDisplay(d) : null;

    return (
        <section className={workspaceStyles.workspace}>
            <h2 className={workspaceStyles.title}>Lottery Instance Actions</h2>
            {!shouldHideGuidanceSubtitle(d, showActionCard) ? (
                <p className={workspaceStyles.subtitle}>{getDetailGuidance(d)}</p>
            ) : null}

            {!d.hasValidConfig ? (
                <div className={`${workspaceStyles.warning} ${workspaceStyles.warningError}`}>
                    {AA_FACTORY_ENV_ERROR}
                </div>
            ) : null}

            <AccountStatusSection
                status={d.status}
                email={d.email}
                accountAddress={d.accountAddress}
                accountDeployed={d.accountDeployed}
                letBalance={d.letBalance}
                compact
                showUserOpHashes={false}
            />

            {d.hasWinner && d.selectedSummary?.winner ? (
                <div className={styles.winnerBanner}>
                    <p className={styles.winnerLabel}>Winner</p>
                    <p className={styles.winnerAddress} title={d.selectedSummary.winner}>
                        {shortenAddress(d.selectedSummary.winner)}
                    </p>
                    {d.isAAAccountWinner ? <p className={styles.winnerYou}>You won this lottery</p> : null}
                </div>
            ) : null}

            {d.insufficientLetKnown && d.canApproveOrJoin ? (
                <div className={`${workspaceStyles.warning} ${workspaceStyles.warningError}`}>
                    Not enough LET for this entry fee. Use the AA token faucet first.
                </div>
            ) : null}

            {d.AAAccountHydrated && d.canApproveOrJoin && d.joinEntryFeeWei !== undefined ? (
                <p className={styles.allowanceRow}>
                    LET allowance:{' '}
                    {d.joinEntryAllowance !== null ? formatEther(d.joinEntryAllowance) : '…'} / need{' '}
                    {formatEther(d.joinEntryFeeWei)}
                </p>
            ) : null}

            {!showActionCard && emptyDisplay ? (
                <div
                    className={`${styles.stateNotice} ${
                        emptyDisplay.variant === 'calculating'
                            ? styles.stateNoticeCalculating
                            : emptyDisplay.variant === 'closed'
                              ? styles.stateNoticeClosed
                              : emptyDisplay.variant === 'refunding'
                                ? styles.stateNoticeRefunding
                                : styles.stateNoticeDefault
                    }`}
                >
                    <p className={styles.stateNoticeTitle}>{emptyDisplay.title}</p>
                    <p className={styles.stateNoticeBody}>{emptyDisplay.body}</p>
                </div>
            ) : null}

            {showActionCard ? (
                <div className={sharedStyles.pinkActionCard}>
                    <div className={sharedStyles.actionStack}>
                        <div className={styles.actionCardHeader}>
                            <h3 className={styles.actionCardTitle}>
                                {showJoinCard
                                    ? 'Join Lottery'
                                    : activeAction
                                      ? getJoinActionExecuteLabel(activeAction)
                                      : 'Action'}
                            </h3>
                            {actionGasReady ? <span className={styles.gasReadyBadge}>gas ready</span> : null}
                        </div>
                        <ActionButtonsSection
                            onExecute={() => {
                                void (async () => {
                                    setIsExecutingFlow(true);
                                    try {
                                        if (needsAutoApproveBeforeJoin) {
                                            const approved = await d.handleExecuteUserOp('approveEntryFee');
                                            if (!approved) return;

                                            const joined = await d.handleExecuteUserOp('joinLotto', {
                                                skipJoinAllowanceCheck: true,
                                            });
                                            if (joined) {
                                                await d.fetchSummary();
                                            }
                                            return;
                                        }

                                        const executed = activeAction
                                            ? await d.handleExecuteUserOp(activeAction)
                                            : false;
                                        if (executed) {
                                            await d.fetchSummary();
                                        }
                                    } finally {
                                        setIsExecutingFlow(false);
                                    }
                                })();
                            }}
                            isLoading={(d.isLoading && isSelected) || isExecutingFlow}
                            executeDisabled={!executeEnabled}
                            label={executeLabel.toUpperCase()}
                            tone="neon-green"
                            marginTop={0}
                            compact
                        />
                        <button
                            type="button"
                            onClick={() => {
                                if (!activeAction) return;
                                d.setExpandedAction((prev) => (prev === activeAction ? null : activeAction));
                            }}
                            className={sharedStyles.toggleButton}
                        >
                            {isExpanded ? '▼ Hide Auto UserOp Values' : '▶ View Auto UserOp Values'}
                        </button>
                    </div>
                    {actionEstimateError ? (
                        <p className={styles.actionError}>Gas estimation failed: {actionEstimateError}</p>
                    ) : null}
                    {isExpanded ? (
                        <UserOpDetailsPanel
                            signResultHash={d.signResultHash}
                            bundlerResultHash={d.bundlerResultHash}
                            userOp={preview}
                            panelClassName={sharedStyles.userOpPanel}
                            textClassName={sharedStyles.userOpText}
                        />
                    ) : null}
                </div>
            ) : null}
        </section>
    );
}
