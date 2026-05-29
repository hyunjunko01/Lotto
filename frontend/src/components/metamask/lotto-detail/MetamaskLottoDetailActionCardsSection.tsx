'use client';

import { useState } from 'react';
import { formatEther } from 'viem';
import { ActionButtonsSection } from '@/components/aa/sections/ActionButtonsSection';
import aaSharedStyles from '@/components/aa/workspace/aaWorkspaceShared.module.css';
import {
    getMetamaskActionLabel,
    getMetamaskDetailAction,
    isMetamaskActionEnabled,
    shouldHideMetamaskGuidanceSubtitle,
} from '@/components/metamask/lotto-detail/getMetamaskDetailAction';
import { getMetamaskDetailGuidance } from '@/components/metamask/lotto-detail/getMetamaskDetailGuidance';
import { getMetamaskEmptyActionDisplay } from '@/components/metamask/lotto-detail/getMetamaskEmptyActionDisplay';
import { MetamaskActionStatus } from '@/components/metamask/workspace/MetamaskActionStatus';
import sharedStyles from '@/components/metamask/workspace/metamaskWorkspaceShared.module.css';
import workspaceStyles from '@/components/metamask/workspace/MetamaskLotteryWorkspace.module.css';
import { ZERO_LOTTO_WINNER } from '@/hooks/metamask/lib/abis';
import { shortenAddress } from '@/hooks/shared/lib/shortenAddress';
import type { useMetamaskLottoDetailPage } from '@/hooks/metamask/lotto-detail/useMetamaskLottoDetailPage';
import styles from './metamaskDetail.module.css';

type Detail = ReturnType<typeof useMetamaskLottoDetailPage>;

type Props = {
    d: Detail;
};

export function MetamaskLottoDetailActionCardsSection({ d }: Props) {
    const [isExecutingFlow, setIsExecutingFlow] = useState(false);

    const activeAction = getMetamaskDetailAction(d);
    const showActionCard = activeAction !== null;
    const emptyDisplay = !showActionCard ? getMetamaskEmptyActionDisplay(d) : null;

    const hasWinner = Boolean(d.winner && d.winner !== ZERO_LOTTO_WINNER);

    const executeEnabled =
        showActionCard &&
        activeAction !== null &&
        !d.isActionPending &&
        !d.isActionConfirming &&
        !isExecutingFlow &&
        isMetamaskActionEnabled(d, activeAction);

    const isActionLoading =
        showActionCard &&
        (d.isActionPending || d.isActionConfirming || isExecutingFlow);

    return (
        <section className={workspaceStyles.workspace}>
            <h2 className={workspaceStyles.title}>Lottery Instance Actions</h2>
            {!shouldHideMetamaskGuidanceSubtitle(d, showActionCard) ? (
                <p className={workspaceStyles.subtitle}>{getMetamaskDetailGuidance(d)}</p>
            ) : null}

            {!d.isConnected ? (
                <div className={`${workspaceStyles.warning} ${workspaceStyles.warningInfo}`}>
                    Connect MetaMask from the header before running an action.
                </div>
            ) : null}

            {d.isConnected && d.isWrongNetwork ? (
                <div className={`${workspaceStyles.warning} ${workspaceStyles.warningError}`}>
                    Wrong network detected. Please switch to {d.targetNetworkLabel}.
                    <button type="button" onClick={d.switchToTargetNetwork} className={sharedStyles.networkSwitchButton}>
                        Switch to {d.targetNetworkLabel}
                    </button>
                </div>
            ) : null}

            {hasWinner && d.winner ? (
                <div className={styles.winnerBanner}>
                    <p className={styles.winnerLabel}>Winner</p>
                    <p className={styles.winnerAddress} title={d.winner}>
                        {shortenAddress(d.winner)}
                    </p>
                    {d.isConnectedWinner ? <p className={styles.winnerYou}>You won this lottery</p> : null}
                </div>
            ) : null}

            {d.insufficientLetKnown && d.canJoin ? (
                <div className={`${workspaceStyles.warning} ${workspaceStyles.warningError}`}>
                    Not enough LET for this entry fee. Use the MetaMask token faucet first.
                </div>
            ) : null}

            {d.actionError && !isExecutingFlow ? <MetamaskActionStatus status={d.actionError} forceError /> : null}

            {d.isConnected && d.canJoin && d.entryFee !== undefined ? (
                <p className={styles.allowanceRow}>
                    LET allowance:{' '}
                    {d.currentAllowance !== undefined ? formatEther(d.currentAllowance) : '…'} / need{' '}
                    {formatEther(d.entryFee)}
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

            {showActionCard && activeAction ? (
                <div className={sharedStyles.pinkActionCard}>
                    <div className={aaSharedStyles.actionStack}>
                        <div className={styles.actionCardHeader}>
                            <h3 className={styles.actionCardTitle}>{getMetamaskActionLabel(activeAction)}</h3>
                        </div>
                        <ActionButtonsSection
                            onExecute={() => {
                                void (async () => {
                                    setIsExecutingFlow(true);
                                    try {
                                        const executed = await d.executeDetailAction(activeAction);
                                        if (executed) {
                                            await d.refetchAfterAction();
                                        }
                                    } finally {
                                        setIsExecutingFlow(false);
                                    }
                                })();
                            }}
                            isLoading={isActionLoading}
                            executeDisabled={!executeEnabled}
                            label={getMetamaskActionLabel(activeAction).toUpperCase()}
                            tone="neon-green"
                            marginTop={0}
                            compact
                        />
                    </div>
                </div>
            ) : null}
        </section>
    );
}
