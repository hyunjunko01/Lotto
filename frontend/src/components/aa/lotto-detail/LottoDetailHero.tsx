'use client';

import { formatEther } from 'viem';
import { AAHero } from '@/components/aa/layout/AAHero';
import { AAHeroLotteryAddress } from '@/components/aa/layout/AAHeroLotteryAddress';
import flowLayout from '@/components/aa/layout/aaFlowLayout.module.css';
import type { useAALottoDetailPage } from '@/hooks/aa/useAALottoDetailPage';
import type { AAUi } from '@/styles/aa/uiStyles';
import styles from './lottoDetail.module.css';

type Detail = ReturnType<typeof useAALottoDetailPage>;

type Props = {
    ui: AAUi;
    d: Detail;
};

export function LottoDetailHero({ ui, d }: Props) {
    const entryFee =
        d.selectedSummary?.entryFee !== undefined ? `${formatEther(d.selectedSummary.entryFee)} LET` : '—';
    const players =
        d.selectedSummary?.playerCount !== undefined && d.selectedSummary?.maxPlayers !== undefined
            ? `${Number(d.selectedSummary.playerCount)} / ${Number(d.selectedSummary.maxPlayers)}`
            : '—';
    const state = d.stateLabel(d.selectedSummary?.lottoState);

    return (
        <AAHero ui={ui} pill="AA Instance" title="Join Lottery" className={flowLayout.hero}>
            <ul className={styles.metaList}>
                <li>
                    <strong>Status:</strong> {state}
                </li>
                <li>
                    <strong>Entry fee:</strong> {entryFee}
                </li>
                <li>
                    <strong>Players:</strong> {players}
                </li>
            </ul>
            <AAHeroLotteryAddress address={d.lottoAddress} label="Instance" />
        </AAHero>
    );
}
