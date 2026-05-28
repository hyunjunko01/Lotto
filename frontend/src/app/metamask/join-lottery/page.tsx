'use client';

import Link from 'next/link';
import { MetamaskSection } from '@/components/metamask/layout/MetamaskSection';
import { JoinInstanceListSection } from '@/components/metamask/sections/JoinInstanceListSection';
import { useMetamaskUi } from '@/components/metamask/layout/useMetamaskUi';
import { useJoinLotteryInstances } from '@/hooks/metamask/join-lottery/useJoinLotteryInstances';
import { getMetamaskTokens } from '@/styles/metamask/tokens';

export default function JoinLotteryPage() {
    const ui = useMetamaskUi('teal');
    const t = getMetamaskTokens('teal');

    const {
        isWrongNetwork,
        targetNetworkLabel,
        parsedLottoAddresses,
        isLoadingLottoAddresses,
        isLottoAddressesError,
        isLoadingLottoStats,
        lottoSummaries,
    } = useJoinLotteryInstances();

    return (
        <main style={ui.pageMain}>
            <div style={ui.container}>
                <Link
                    href="/metamask"
                    style={{
                        display: 'inline-flex',
                        marginBottom: 14,
                        color: '#8fe8ff',
                        textDecoration: 'underline',
                        fontWeight: 700,
                    }}
                >
                    ← Back to MetaMask Home
                </Link>
                <MetamaskSection ui={ui} first>
                    <h1 style={ui.h1Flat}>Join Lottery</h1>
                    <p style={ui.bodyMuted}>
                        Select one of the available lottery instances to view its info and callable functions.
                    </p>
                    {isWrongNetwork ? (
                        <p style={{ marginTop: 10, color: t.warnText }}>Current network is not {targetNetworkLabel}.</p>
                    ) : null}
                </MetamaskSection>

                <JoinInstanceListSection
                    ui={ui}
                    t={t}
                    parsedLottoAddresses={parsedLottoAddresses}
                    isLoadingLottoAddresses={isLoadingLottoAddresses}
                    isLottoAddressesError={isLottoAddressesError}
                    isLoadingLottoStats={isLoadingLottoStats}
                    lottoSummaries={lottoSummaries}
                />
            </div>
        </main>
    );
}
