'use client';

import Link from 'next/link';
import { formatEther } from 'viem';
import { AAHero } from '@/components/aa/layout/AAHero';
import { AASection } from '@/components/aa/layout/AASection';
import { useAAUi } from '@/components/aa/layout/useAAUi';
import { aaStateToLabel, useAAJoinLotteryIndex } from '@/hooks/useAAJoinLotteryIndex';

export default function AAJoinLotteryPage() {
  const ui = useAAUi();
  const {
    configuredFactoryAddress,
    parsedLottoAddresses,
    isLoadingLottoAddresses,
    isLottoAddressesError,
    isLoadingLottoStats,
    lottoSummaries,
    lottoFactoryAddressText,
  } = useAAJoinLotteryIndex();

  return (
    <main style={ui.pageMain}>
      <div style={ui.container}>
        <AAHero ui={ui} pill="Web3Auth AA Join" title="Join Lottery with AA">
          <p style={ui.subtitle}>Select an instance, then build and send UserOps from the detail page.</p>
          <p style={{ marginTop: 10, color: '#d4eaee', wordBreak: 'break-all' }}>Target LottoFactory: {lottoFactoryAddressText}</p>
        </AAHero>

        <AASection ui={ui}>
          <h2 style={{ marginTop: 0 }}>Available Instances</h2>
          {!configuredFactoryAddress ? (
            <p style={ui.warningText}>`NEXT_PUBLIC_LOTTO_FACTORY_ADDRESS` is missing or invalid.</p>
          ) : null}
          {isLoadingLottoAddresses ? <p style={{ color: '#c6dfe2' }}>Loading lottery instances...</p> : null}
          {isLottoAddressesError ? <p style={ui.warningText}>Failed to load lottery instances.</p> : null}
          {!isLoadingLottoAddresses && parsedLottoAddresses.length === 0 ? <p style={{ color: '#c6dfe2' }}>No instances found yet.</p> : null}
          {parsedLottoAddresses.length > 0 && isLoadingLottoStats ? <p style={{ color: '#c6dfe2' }}>Loading instance stats...</p> : null}

          {parsedLottoAddresses.length > 0 ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {parsedLottoAddresses.map((lotto) => {
                const summary = lottoSummaries.get(lotto);
                return (
                  <Link
                    key={lotto}
                    href={`/aa/lotto/${lotto}`}
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
                    <p style={{ margin: 0, textDecoration: 'underline' }}>{lotto}</p>
                    <p style={{ margin: '8px 0 0', color: '#d4eaee' }}>Status: {aaStateToLabel(summary?.lottoState)}</p>
                    <p style={{ margin: '4px 0 0', color: '#d4eaee' }}>
                      Entry Fee: {summary?.entryFee !== undefined ? formatEther(summary.entryFee) : '-'} LET
                    </p>
                    <p style={{ margin: '4px 0 0', color: '#d4eaee' }}>
                      Players: {summary?.playerCount !== undefined ? Number(summary.playerCount) : '-'} /{' '}
                      {summary?.maxPlayers !== undefined ? Number(summary.maxPlayers) : '-'}
                    </p>
                  </Link>
                );
              })}
            </div>
          ) : null}
        </AASection>
      </div>
    </main>
  );
}
