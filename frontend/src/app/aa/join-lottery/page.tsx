'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { type Address, formatEther, isAddress } from 'viem';
import { AAHero } from '@/components/aa/layout/AAHero';
import { AASection } from '@/components/aa/layout/AASection';
import { useAAUi } from '@/components/aa/layout/useAAUi';
import { useAALottoInstances } from '@/hooks/aa/workspace/reads/useAALottoInstances';
import { LOTTO_FACTORY_ADDRESS_ENV } from '@/hooks/shared/factory/constants';
import { lottoStateToLabel } from '@/hooks/shared/lib/lottoState';

export default function AAJoinLotteryPage() {
  const ui = useAAUi();

  const configuredFactoryAddress = useMemo(
    () =>
      typeof LOTTO_FACTORY_ADDRESS_ENV === 'string' && isAddress(LOTTO_FACTORY_ADDRESS_ENV)
        ? (LOTTO_FACTORY_ADDRESS_ENV as Address)
        : undefined,
    []
  );

  const { lottoInstances, isLoadingLottoInstances, lottoInstancesError } = useAALottoInstances(
    configuredFactoryAddress,
    { enabled: Boolean(configuredFactoryAddress), refetchIntervalMs: 5000 }
  );

  const lottoFactoryAddressText = LOTTO_FACTORY_ADDRESS_ENV ?? '(missing NEXT_PUBLIC_LOTTO_FACTORY_ADDRESS)';

  return (
    <main style={ui.pageMain}>
      <div style={ui.container}>
        <Link
          href="/aa"
          style={{
            display: 'inline-flex',
            marginBottom: 14,
            color: '#8fe8ff',
            textDecoration: 'underline',
            fontWeight: 700,
          }}
        >
          ← Back to AA Home
        </Link>
        <AAHero ui={ui} pill="Web3Auth AA Join" title="Join Lottery with AA">
          <p style={ui.subtitle}>Select an instance, then build and send UserOps from the detail page.</p>
          <p style={{ marginTop: 10, color: '#d4eaee', wordBreak: 'break-all' }}>Target LottoFactory: {lottoFactoryAddressText}</p>
        </AAHero>

        <AASection ui={ui}>
          <h2 style={{ marginTop: 0 }}>Available Instances</h2>
          {!configuredFactoryAddress ? (
            <p style={ui.warningText}>`NEXT_PUBLIC_LOTTO_FACTORY_ADDRESS` is missing or invalid.</p>
          ) : null}
          {isLoadingLottoInstances && lottoInstances.length === 0 ? (
            <p style={{ color: '#c6dfe2' }}>Loading lottery instances...</p>
          ) : null}
          {lottoInstancesError ? <p style={ui.warningText}>{lottoInstancesError}</p> : null}
          {!isLoadingLottoInstances && lottoInstances.length === 0 && !lottoInstancesError ? (
            <p style={{ color: '#c6dfe2' }}>No instances found yet.</p>
          ) : null}

          {lottoInstances.length > 0 ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {lottoInstances.map((summary) => (
                <Link
                  key={summary.address}
                  href={`/aa/lotto/${summary.address}`}
                  style={{
                    display: 'block',
                    border: '1px solid #31525b',
                    borderRadius: 10,
                    padding: '12px 14px',
                    color: '#8fe8ff',
                    textDecoration: 'none',
                    wordBreak: 'break-all',
                    background: 'rgba(8, 22, 30, 0.7)',
                  }}
                >
                  <p style={{ margin: 0, textDecoration: 'underline' }}>{summary.address}</p>
                  <p style={{ margin: '8px 0 0', color: '#d4eaee' }}>Status: {lottoStateToLabel(summary.lottoState)}</p>
                  <p style={{ margin: '4px 0 0', color: '#d4eaee' }}>
                    Entry Fee: {summary.entryFee !== undefined ? formatEther(summary.entryFee) : '-'} LET
                  </p>
                  <p style={{ margin: '4px 0 0', color: '#d4eaee' }}>
                    Players: {summary.playerCount !== undefined ? Number(summary.playerCount) : '-'} /{' '}
                    {summary.maxPlayers !== undefined ? Number(summary.maxPlayers) : '-'}
                  </p>
                </Link>
              ))}
            </div>
          ) : null}
        </AASection>
      </div>
    </main>
  );
}
