'use client';

import { MetamaskCreateLotteryWorkspace } from '@/components/metamask/workspace/MetamaskCreateLotteryWorkspace';
import { MetaMaskFlowPage } from '@/components/metamask/layout/MetaMaskFlowPage';
import { MetamaskHero } from '@/components/metamask/layout/MetamaskHero';
import { MetaMaskHeroLotteryAddress } from '@/components/metamask/layout/MetaMaskHeroLotteryAddress';
import flowLayout from '@/components/metamask/layout/metamaskFlowLayout.module.css';
import heroStyles from '@/components/metamask/layout/metamaskHeroContent.module.css';
import { useMetamaskUi } from '@/components/metamask/layout/useMetamaskUi';
import { LOTTO_FACTORY_ADDRESS } from '@/hooks/shared/factory/constants';

export default function CreateLotteryPage() {
    const ui = useMetamaskUi();

    return (
        <MetaMaskFlowPage
            hero={
                <MetamaskHero ui={ui} pill="MetaMask Create" title="Create Lottery" className={flowLayout.hero}>
                    <p className={heroStyles.subtitle}>Set lottery values and create in one flow.</p>
                    <MetaMaskHeroLotteryAddress address={LOTTO_FACTORY_ADDRESS} />
                </MetamaskHero>
            }
        >
            <MetamaskCreateLotteryWorkspace />
        </MetaMaskFlowPage>
    );
}
