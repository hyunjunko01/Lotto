'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { type Address, formatEther } from 'viem';
import flowLayout from '@/components/metamask/layout/metamaskFlowLayout.module.css';
import { useMetamaskUi } from '@/components/metamask/layout/useMetamaskUi';
import type { JoinLottoInstanceSummary } from '@/hooks/metamask/join-lottery/types';
import { useJoinLotteryInstances } from '@/hooks/metamask/join-lottery/useJoinLotteryInstances';
import { LottoState, lottoStateToLabel } from '@/hooks/shared/lib/lottoState';
import { shortenAddress } from '@/hooks/shared/lib/shortenAddress';
import styles from './MetamaskJoinLotteryInstanceList.module.css';

type InstanceRow = {
    address: Address;
    summary: JoinLottoInstanceSummary;
};

export function MetamaskJoinLotteryInstanceList() {
    const ui = useMetamaskUi();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null);

    const {
        parsedLottoAddresses,
        isLoadingLottoAddresses,
        isLottoAddressesError,
        isLoadingLottoStats,
        lottoSummaries,
        refreshInstances,
    } = useJoinLotteryInstances();

    const instances = useMemo<InstanceRow[]>(
        () =>
            parsedLottoAddresses.map((address) => ({
                address,
                summary: lottoSummaries.get(address) ?? {},
            })),
        [parsedLottoAddresses, lottoSummaries]
    );

    const groupedInstances = useMemo(() => {
        const joinable: InstanceRow[] = [];
        const fullFlow: InstanceRow[] = [];
        const noAction: InstanceRow[] = [];

        for (const row of instances) {
            const state = Number(row.summary.lottoState ?? -1);
            const isClosed = state === LottoState.CLOSED;

            if (state === LottoState.OPEN) {
                joinable.push(row);
                continue;
            }

            if (state === LottoState.FULL || state === LottoState.CALCULATING || state === LottoState.REFUNDING) {
                fullFlow.push(row);
                continue;
            }

            if (isClosed && row.summary.isPrizeWithdrawn) {
                noAction.push(row);
                continue;
            }

            if (isClosed && !row.summary.isPrizeWithdrawn) {
                fullFlow.push(row);
            }
        }

        return { joinable, fullFlow, noAction };
    }, [instances]);

    const isLoading = isLoadingLottoAddresses || (parsedLottoAddresses.length > 0 && isLoadingLottoStats);

    const handleRefresh = async () => {
        if (isRefreshing || isLoading) return;
        setIsRefreshing(true);
        try {
            await refreshInstances();
            setLastRefreshedAt(Date.now());
        } finally {
            setIsRefreshing(false);
        }
    };

    const renderInstanceCard = ({ address, summary }: InstanceRow) => (
        <Link
            key={address}
            href={`/metamask/lotto/${address}`}
            className={styles.instanceCard}
            title={address}
        >
            <span className={styles.cardAddress}>{shortenAddress(address)}</span>
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
        <section style={ui.section} className={flowLayout.section}>
            <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Instance list</h2>
                <button
                    type="button"
                    className={styles.refreshButton}
                    onClick={() => void handleRefresh()}
                    disabled={isRefreshing || isLoading}
                >
                    {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>
            {lastRefreshedAt ? (
                <p className={styles.refreshMeta}>Last refreshed: {new Date(lastRefreshedAt).toLocaleTimeString()}</p>
            ) : null}
            {isLoadingLottoAddresses && parsedLottoAddresses.length === 0 ? (
                <p className={styles.statusText}>Loading instances…</p>
            ) : null}
            {isLottoAddressesError ? (
                <p className={styles.warningText}>Failed to load lottery instances from factory.</p>
            ) : null}
            {!isLoadingLottoAddresses && parsedLottoAddresses.length === 0 && !isLottoAddressesError ? (
                <p className={styles.statusText}>No instances found yet.</p>
            ) : null}

            {parsedLottoAddresses.length > 0 ? (
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
        </section>
    );
}
