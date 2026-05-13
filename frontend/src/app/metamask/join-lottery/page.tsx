'use client';

import Link from 'next/link';
import { formatEther } from 'viem';
import { MetamaskSection } from '@/components/metamask/MetamaskSection';
import { useMetamaskUi } from '@/components/metamask/useMetamaskUi';
import { lottoStateToLabel, useJoinLotteryInstances } from '@/hooks/useJoinLotteryInstances';
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
                <MetamaskSection ui={ui}>
                    <h1 style={ui.h1Flat}>Join Lottery</h1>
                    <p style={ui.bodyMuted}>
                        Select one of the available lottery instances to view its info and callable functions.
                    </p>
                    {isWrongNetwork ? (
                        <p style={{ marginTop: 10, color: t.warnText }}>Current network is not {targetNetworkLabel}.</p>
                    ) : null}
                </MetamaskSection>

                <MetamaskSection ui={ui}>
                    <h2 style={ui.h2InSection}>Available Instances</h2>

                    {isLoadingLottoAddresses ? <p style={{ color: t.textMuted }}>Loading lottery instances...</p> : null}
                    {isLottoAddressesError ? <p style={{ color: t.warnText }}>Failed to load lottery instances from factory.</p> : null}

                    {!isLoadingLottoAddresses && parsedLottoAddresses.length === 0 ? (
                        <p style={{ color: t.textMuted }}>No instances found yet.</p>
                    ) : null}

                    {parsedLottoAddresses.length > 0 && isLoadingLottoStats ? (
                        <p style={{ color: t.textMuted }}>Loading instance stats...</p>
                    ) : null}

                    {parsedLottoAddresses.length > 0 ? (
                        <div style={{ display: 'grid', gap: 10 }}>
                            {parsedLottoAddresses.map((lotto) => {
                                const summary = lottoSummaries.get(lotto);
                                const playerCount = summary?.playerCount;
                                const maxPlayers = summary?.maxPlayers;
                                const entryFee = summary?.entryFee;
                                const lottoState = summary?.lottoState;

                                const hasCounts = playerCount !== undefined && maxPlayers !== undefined;
                                const remaining = hasCounts ? maxPlayers - playerCount : undefined;
                                const isNearFull =
                                    hasCounts && remaining !== undefined
                                        ? remaining > BigInt(0) && remaining <= BigInt(2)
                                        : false;

                                return (
                                    <Link key={lotto} href={`/metamask/lotto/${lotto}`} style={ui.lottoInstanceLink({ nearFull: isNearFull })}>
                                        <p style={ui.lottoInstanceTitle}>{lotto}</p>
                                        <p style={ui.lottoInstanceLine}>Status: {lottoStateToLabel(lottoState)}</p>
                                        <p style={ui.lottoInstanceLineTight}>
                                            Entry Fee: {entryFee !== undefined ? formatEther(entryFee) : '-'} LET
                                        </p>
                                        <p style={ui.lottoInstanceLineTight}>
                                            Players: {playerCount !== undefined ? Number(playerCount) : '-'} /{' '}
                                            {maxPlayers !== undefined ? Number(maxPlayers) : '-'}
                                        </p>
                                        <p style={ui.lottoInstanceLineTight}>
                                            Remaining Spots: {remaining !== undefined ? Number(remaining) : '-'}
                                        </p>
                                        {isNearFull ? <p style={ui.lottoHighlightNote}>Closing soon: only a few spots left.</p> : null}
                                    </Link>
                                );
                            })}
                        </div>
                    ) : null}
                </MetamaskSection>
            </div>
        </main>
    );
}
