'use client';

import { useMemo } from 'react';
import { type Address } from 'viem';
import { AAFlowPage } from '@/components/aa/layout/AAFlowPage';
import { AAHero } from '@/components/aa/layout/AAHero';
import { AAHeroLotteryAddress } from '@/components/aa/layout/AAHeroLotteryAddress';
import { useAAUi } from '@/components/aa/layout/useAAUi';
import heroStyles from '@/components/aa/layout/aaHeroContent.module.css';
import flowLayout from '@/components/aa/layout/aaFlowLayout.module.css';
import { JoinLotteryInstanceList } from '@/components/aa/join/JoinLotteryInstanceList';
import { readAALottoFactoryAddress } from '@/lib/aa/env';

export default function AAJoinLotteryPage() {
  const ui = useAAUi();
  const factoryAddress = useMemo(() => {
    const address = readAALottoFactoryAddress();
    return address ? (address as Address) : undefined;
  }, []);

  return (
    <AAFlowPage
      hero={
        <AAHero ui={ui} pill="AA Join" title="Join Lottery" className={flowLayout.hero}>
          <p className={heroStyles.subtitle}>Pick a lottery, then join on its detail page.</p>
          <AAHeroLotteryAddress address={factoryAddress} />
        </AAHero>
      }
    >
      <JoinLotteryInstanceList factoryAddress={factoryAddress} />
    </AAFlowPage>
  );
}
