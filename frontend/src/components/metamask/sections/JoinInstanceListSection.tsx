'use client';

import Link from 'next/link';
import { formatEther } from 'viem';
import type { Address } from 'viem';
import { MetamaskSection } from '@/components/metamask/layout/MetamaskSection';
import { lottoStateToLabel } from '@/hooks/metamask/join-lottery/useJoinLotteryInstances';
import type { JoinLottoInstanceSummary } from '@/hooks/metamask/join-lottery/types';
import type { MetamaskUi } from '@/styles/metamask/uiStyles';
import type { MetamaskThemeTokens } from '@/styles/metamask/tokens';

type Props = {
    ui: MetamaskUi;
    t: MetamaskThemeTokens;
    parsedLottoAddresses: Address[];
    isLoadingLottoAddresses: boolean;
    isLottoAddressesError: boolean;
    isLoadingLottoStats: boolean;
    lottoSummaries: Map<Address, JoinLottoInstanceSummary>;
};

export function JoinInstanceListSection({
    ui,
    t,
    parsedLottoAddresses,
    isLoadingLottoAddresses,
    isLottoAddressesError,
    isLoadingLottoStats,
    lottoSummaries,
}: Props) {
    return (
        <MetamaskSection ui={ui}>
            <h2 style={ui.h2InSection}>Available Instances</h2>

            {isLoadingLottoAddresses ? <p style={{ color: t.textMuted }}>Loading lottery instances...</p> : null}
            {isLottoAddressesError ? (
                <p style={{ color: t.warnText }}>Failed to load lottery instances from factory.</p>
            ) : null}

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
                            <Link
                                key={lotto}
                                href={`/metamask/lotto/${lotto}`}
                                style={ui.lottoInstanceLink({ nearFull: isNearFull })}
                            >
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
    );
}
