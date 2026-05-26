'use client';

import { formatEther } from 'viem';
import { AASection } from '@/components/aa/layout/AASection';
import type { useAALottoDetailPage } from '@/hooks/aa/useAALottoDetailPage';
import type { AAUi } from '@/styles/aa/uiStyles';

type Detail = ReturnType<typeof useAALottoDetailPage>;

type Props = {
    ui: AAUi;
    d: Detail;
};

export function LottoDetailHeaderSection({ ui, d }: Props) {
    return (
        <AASection ui={ui} first>
            <h1 style={{ margin: 0, fontSize: 'clamp(1.7rem, 3vw, 2.2rem)' }}>AA Lotto Instance</h1>
            <p style={{ marginTop: 10, color: '#c6dfe2', wordBreak: 'break-all' }}>Address: {d.lottoAddress}</p>
            <p style={{ margin: '6px 0 0', color: '#d4eaee', wordBreak: 'break-all' }}>
                Target LottoFactory: {d.lottoFactoryAddressText}
            </p>
            <p style={{ margin: '6px 0 0', color: '#d4eaee' }}>
                Entry Fee: {d.selectedSummary?.entryFee !== undefined ? formatEther(d.selectedSummary.entryFee) : '-'} LET
            </p>
            <p style={{ margin: '4px 0 0', color: '#d4eaee' }}>
                Players: {d.selectedSummary?.playerCount !== undefined ? Number(d.selectedSummary.playerCount) : '-'} /{' '}
                {d.selectedSummary?.maxPlayers !== undefined ? Number(d.selectedSummary.maxPlayers) : '-'}
            </p>
            <p style={{ margin: '6px 0 0', color: '#d4eaee' }}>Status: {d.stateLabel(d.selectedSummary?.lottoState)}</p>
        </AASection>
    );
}
