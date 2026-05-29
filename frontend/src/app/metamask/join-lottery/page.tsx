'use client';

import { MetamaskJoinLotteryInstanceList } from '@/components/metamask/join/MetamaskJoinLotteryInstanceList';
import { MetaMaskFlowPage } from '@/components/metamask/layout/MetaMaskFlowPage';
import { MetamaskHero } from '@/components/metamask/layout/MetamaskHero';
import { MetaMaskHeroLotteryAddress } from '@/components/metamask/layout/MetaMaskHeroLotteryAddress';
import flowLayout from '@/components/metamask/layout/metamaskFlowLayout.module.css';
import heroStyles from '@/components/metamask/layout/metamaskHeroContent.module.css';
import { useMetamaskUi } from '@/components/metamask/layout/useMetamaskUi';
import { LOTTO_FACTORY_ADDRESS } from '@/hooks/shared/factory/constants';

export default function JoinLotteryPage() {
    const ui = useMetamaskUi();

    return (
        <MetaMaskFlowPage
            hero={
                <MetamaskHero ui={ui} pill="MetaMask Join" title="Join Lottery" className={flowLayout.hero}>
                    <p className={heroStyles.subtitle}>Pick a lottery, then join on its detail page.</p>
                    <MetaMaskHeroLotteryAddress address={LOTTO_FACTORY_ADDRESS} />
                </MetamaskHero>
            }
        >
            <MetamaskJoinLotteryInstanceList />
        </MetaMaskFlowPage>
    );
}
