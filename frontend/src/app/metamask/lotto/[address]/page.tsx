'use client';

import { MetamaskLottoDetailActionCardsSection } from '@/components/metamask/lotto-detail/MetamaskLottoDetailActionCardsSection';
import { MetamaskLottoDetailHero } from '@/components/metamask/lotto-detail/MetamaskLottoDetailHero';
import { MetaMaskFlowPage } from '@/components/metamask/layout/MetaMaskFlowPage';
import workspaceStyles from '@/components/metamask/workspace/MetamaskLotteryWorkspace.module.css';
import { useMetamaskUi } from '@/components/metamask/layout/useMetamaskUi';
import { useMetamaskLottoDetailPage } from '@/hooks/metamask/lotto-detail/useMetamaskLottoDetailPage';

export default function LottoInstancePage() {
    const ui = useMetamaskUi();
    const d = useMetamaskLottoDetailPage();

    if (!d.lottoAddress) {
        return (
            <MetaMaskFlowPage backHref="/metamask/join-lottery" backLabel="← Back to instances" hero={<></>}>
                <section className={workspaceStyles.workspace}>
                    <p className={workspaceStyles.subtitle}>Invalid lotto address.</p>
                </section>
            </MetaMaskFlowPage>
        );
    }

    return (
        <MetaMaskFlowPage
            backHref="/metamask/join-lottery"
            backLabel="← Back to instances"
            hero={<MetamaskLottoDetailHero ui={ui} d={d} />}
        >
            <MetamaskLottoDetailActionCardsSection d={d} />
        </MetaMaskFlowPage>
    );
}
