'use client';

import { MetamaskFaucetWorkspace } from '@/components/metamask/workspace/MetamaskFaucetWorkspace';
import { MetaMaskFlowPage } from '@/components/metamask/layout/MetaMaskFlowPage';
import { MetamaskHero } from '@/components/metamask/layout/MetamaskHero';
import { MetaMaskHeroLotteryAddress } from '@/components/metamask/layout/MetaMaskHeroLotteryAddress';
import flowLayout from '@/components/metamask/layout/metamaskFlowLayout.module.css';
import heroStyles from '@/components/metamask/layout/metamaskHeroContent.module.css';
import { useMetamaskUi } from '@/components/metamask/layout/useMetamaskUi';

const ENTRY_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_ENTRY_TOKEN_ADDRESS;

export default function MetamaskFaucetPage() {
    const ui = useMetamaskUi();

    return (
        <MetaMaskFlowPage
            hero={
                <MetamaskHero ui={ui} pill="MetaMask Faucet" title="Get Entry Tokens" className={flowLayout.hero}>
                    <p className={heroStyles.subtitle}>Add LET to your wallet so you can join lotteries.</p>
                    <MetaMaskHeroLotteryAddress
                        address={ENTRY_TOKEN_ADDRESS}
                        label="Entry Token"
                        missingLabel="(missing NEXT_PUBLIC_ENTRY_TOKEN_ADDRESS)"
                    />
                </MetamaskHero>
            }
        >
            <MetamaskFaucetWorkspace />
        </MetaMaskFlowPage>
    );
}
