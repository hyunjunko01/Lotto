'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { type Address, formatEther, isAddress } from 'viem';
import { AAHero } from '@/components/aa/layout/AAHero';
import { AAHeroLotteryAddress } from '@/components/aa/layout/AAHeroLotteryAddress';
import { AASection } from '@/components/aa/layout/AASection';
import { useAAUi } from '@/components/aa/layout/useAAUi';
import heroStyles from '@/components/aa/layout/aaHeroContent.module.css';
import flowLayout from '@/components/aa/layout/aaFlowLayout.module.css';
import { useAALottoInstances } from '@/hooks/aa/workspace/reads/useAALottoInstances';
import { LOTTO_FACTORY_ADDRESS_ENV } from '@/hooks/shared/factory/constants';
import { LottoState, lottoStateToLabel } from '@/hooks/shared/lib/lottoState';
import { shortenAddress } from '@/hooks/shared/lib/shortenAddress';
import styles from './page.module.css';

export default function AAJoinLotteryPage() {
  const ui = useAAUi();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null);
  const configuredFactoryAddress = useMemo(
    () =>
      typeof LOTTO_FACTORY_ADDRESS_ENV === 'string' && isAddress(LOTTO_FACTORY_ADDRESS_ENV)
        ? (LOTTO_FACTORY_ADDRESS_ENV as Address)
        : undefined,
    []
  );

  const { lottoInstances, isLoadingLottoInstances, lottoInstancesError, fetchLottoInstances } = useAALottoInstances(
    configuredFactoryAddress,
    { enabled: Boolean(configuredFactoryAddress), listOnly: true }
  );

  const groupedInstances = useMemo(() => {
    const joinable: typeof lottoInstances = [];
    const fullFlow: typeof lottoInstances = [];
    const noAction: typeof lottoInstances = [];

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
    if (!configuredFactoryAddress || isRefreshing || isLoadingLottoInstances) return;
    setIsRefreshing(true);
    try {
      await fetchLottoInstances();
      setLastRefreshedAt(Date.now());
    } finally {
      setIsRefreshing(false);
    }
  };

  const renderInstanceCard = (summary: (typeof lottoInstances)[number]) => (
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
    <main style={ui.pageMain} className={flowLayout.pageMain}>
      <div style={ui.container} className={flowLayout.container}>
        <div className={flowLayout.heroStack}>
          <Link href="/aa" className={flowLayout.backLink}>
            ← Back to AA Home
          </Link>
          <AAHero ui={ui} pill="Web3Auth AA Join" title="Join Lottery with AA" className={flowLayout.hero}>
            <p className={heroStyles.subtitle}>Pick a lottery, then join on its detail page.</p>
            <AAHeroLotteryAddress address={LOTTO_FACTORY_ADDRESS_ENV} />
          </AAHero>
        </div>

        <AASection ui={ui} className={flowLayout.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Instance list</h2>
            <button
              type="button"
              className={styles.refreshButton}
              onClick={() => void handleRefresh()}
              disabled={!configuredFactoryAddress || isRefreshing || isLoadingLottoInstances}
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          {lastRefreshedAt ? (
            <p className={styles.refreshMeta}>Last refreshed: {new Date(lastRefreshedAt).toLocaleTimeString()}</p>
          ) : null}
          {!configuredFactoryAddress ? (
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
      </div>
    </main>
  );
}
