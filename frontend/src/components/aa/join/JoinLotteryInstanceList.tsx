'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { type Address, formatEther } from 'viem';
import { AASection } from '@/components/aa/layout/AASection';
import { useAAUi } from '@/components/aa/layout/useAAUi';
import flowLayout from '@/components/aa/layout/aaFlowLayout.module.css';
import { useAALottoInstances } from '@/hooks/aa/workspace/reads/useAALottoInstances';
import { LottoState, lottoStateToLabel } from '@/hooks/shared/lib/lottoState';
import { shortenAddress } from '@/hooks/shared/lib/shortenAddress';
import type { AALottoSummary } from '@/lib/aa/types';
import styles from './JoinLotteryInstanceList.module.css';

type Props = {
    factoryAddress?: Address;
};

export function JoinLotteryInstanceList({ factoryAddress }: Props) {
    const ui = useAAUi();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null);

    const { lottoInstances, isLoadingLottoInstances, lottoInstancesError, fetchLottoInstances } = useAALottoInstances(
        factoryAddress,
        { enabled: Boolean(factoryAddress), listOnly: true }
    );

    const groupedInstances = useMemo(() => {
        const joinable: AALottoSummary[] = [];
        const fullFlow: AALottoSummary[] = [];
        const noAction: AALottoSummary[] = [];

        for (const summary of lottoInstances) {
            const state = Number(summary.lottoState ?? -1);
            const isClosed = state === LottoState.CLOSED;

            if (state === LottoState.OPEN) {
                joinable.push(summary);
                continue;
            }

            if (state === LottoState.FULL || state === LottoState.CALCULATING || state === LottoState.REFUNDING) {
                fullFlow.push(summary);
                continue;
            }

            if (isClosed && summary.isPrizeWithdrawn) {
                noAction.push(summary);
                continue;
            }

            if (isClosed && !summary.isPrizeWithdrawn) {
                fullFlow.push(summary);
            }
        }

        return { joinable, fullFlow, noAction };
    }, [lottoInstances]);

    const handleRefresh = async () => {
        if (!factoryAddress || isRefreshing || isLoadingLottoInstances) return;
        setIsRefreshing(true);
        try {
            await fetchLottoInstances();
            setLastRefreshedAt(Date.now());
        } finally {
            setIsRefreshing(false);
        }
    };

    const renderInstanceCard = (summary: AALottoSummary) => (
        <Link
            key={summary.address}
            href={`/aa/lotto/${summary.address}`}
            className={styles.instanceCard}
            title={summary.address}
        >
            <span className={styles.cardAddress}>{shortenAddress(summary.address)}</span>
            <span className={styles.cardMeta}>
                {lottoStateToLabel(summary.lottoState)} ·{' '}
                {summary.playerCount !== undefined && summary.maxPlayers !== undefined
                    ? `${Number(summary.playerCount)} / ${Number(summary.maxPlayers)} players`
                    : 'Players —'}{' '}
                · {summary.entryFee !== undefined ? `${formatEther(summary.entryFee)} LET` : '—'}
            </span>
        </Link>
    );

    return (
        <AASection ui={ui} className={flowLayout.section}>
            <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Instance list</h2>
                <button
                    type="button"
                    className={styles.refreshButton}
                    onClick={() => void handleRefresh()}
                    disabled={!factoryAddress || isRefreshing || isLoadingLottoInstances}
                >
                    {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>
            {lastRefreshedAt ? (
                <p className={styles.refreshMeta}>Last refreshed: {new Date(lastRefreshedAt).toLocaleTimeString()}</p>
            ) : null}
            {!factoryAddress ? (
                <p style={ui.warningText}>`NEXT_PUBLIC_LOTTO_FACTORY_ADDRESS` is missing or invalid.</p>
            ) : null}
            {isLoadingLottoInstances && lottoInstances.length === 0 ? (
                <p className={styles.statusText}>Loading instances…</p>
            ) : null}
            {lottoInstancesError ? <p style={ui.warningText}>{lottoInstancesError}</p> : null}
            {!isLoadingLottoInstances && lottoInstances.length === 0 && !lottoInstancesError ? (
                <p className={styles.statusText}>No instances found yet.</p>
            ) : null}

            {lottoInstances.length > 0 ? (
                <div className={styles.groupStack}>
                    <div className={styles.groupColumn}>
                        <h3 className={styles.groupTitle}>Joinable</h3>
                        {groupedInstances.joinable.length > 0 ? (
                            <div className={styles.list}>{groupedInstances.joinable.map(renderInstanceCard)}</div>
                        ) : (
                            <p className={styles.emptyText}>No instances</p>
                        )}
                    </div>

                    <div className={styles.groupColumn}>
                        <h3 className={styles.groupTitle}>In progress</h3>
                        {groupedInstances.fullFlow.length > 0 ? (
                            <div className={styles.list}>{groupedInstances.fullFlow.map(renderInstanceCard)}</div>
                        ) : (
                            <p className={styles.emptyText}>No instances</p>
                        )}
                    </div>

                    <div className={styles.groupColumn}>
                        <h3 className={styles.groupTitle}>Completed</h3>
                        {groupedInstances.noAction.length > 0 ? (
                            <div className={styles.list}>{groupedInstances.noAction.map(renderInstanceCard)}</div>
                        ) : (
                            <p className={styles.emptyText}>No instances</p>
                        )}
                    </div>
                </div>
            ) : null}
        </AASection>
    );
}
