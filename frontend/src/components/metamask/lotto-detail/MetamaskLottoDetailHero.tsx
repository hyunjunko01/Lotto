'use client';

import { formatEther } from 'viem';
import { MetamaskHero } from '@/components/metamask/layout/MetamaskHero';
import { MetaMaskHeroLotteryAddress } from '@/components/metamask/layout/MetaMaskHeroLotteryAddress';
import flowLayout from '@/components/metamask/layout/metamaskFlowLayout.module.css';
import type { useMetamaskLottoDetailPage } from '@/hooks/metamask/lotto-detail/useMetamaskLottoDetailPage';
import type { MetamaskUi } from '@/styles/metamask/uiStyles';
import styles from './metamaskDetail.module.css';

type Detail = ReturnType<typeof useMetamaskLottoDetailPage>;

type Props = {
    ui: MetamaskUi;
    d: Detail;
};

export function MetamaskLottoDetailHero({ ui, d }: Props) {
    const entryFee = d.entryFee !== undefined ? `${formatEther(d.entryFee)} LET` : '—';
    const players =
        d.playerCount !== undefined && d.maxPlayers !== undefined
            ? `${Number(d.playerCount)} / ${Number(d.maxPlayers)}`
            : '—';
    const state = d.stateLabel(d.lottoStateValue);

    return (
        <MetamaskHero ui={ui} pill="MetaMask Instance" title="Join Lottery" className={flowLayout.hero}>
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
            <MetaMaskHeroLotteryAddress address={d.lottoAddress} label="Instance" />
        </MetamaskHero>
    );
}
