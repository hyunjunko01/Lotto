'use client';

import { AALotteryWorkspace } from '@/components/aa/workspace/AALotteryWorkspace';
import { AAConfigErrorSection } from '@/components/aa/layout/AAConfigErrorSection';
import { AAFlowPage } from '@/components/aa/layout/AAFlowPage';
import { AAHero } from '@/components/aa/layout/AAHero';
import { AAHeroLotteryAddress } from '@/components/aa/layout/AAHeroLotteryAddress';
import { useAAUi } from '@/components/aa/layout/useAAUi';
import heroStyles from '@/components/aa/layout/aaHeroContent.module.css';
import flowLayout from '@/components/aa/layout/aaFlowLayout.module.css';
import { AA_FACTORY_ENV_ERROR, readAAFactoryEnv } from '@/lib/aa/env';

export default function AACreateLotteryPage() {
  const ui = useAAUi();
  const factoryEnv = readAAFactoryEnv();

  return (
    <AAFlowPage
      hero={
        <AAHero ui={ui} pill="AA Create" title="Create Lottery" className={flowLayout.hero}>
          <p className={heroStyles.subtitle}>Set lottery values and create in one flow.</p>
          <AAHeroLotteryAddress address={factoryEnv?.lottoFactoryAddress} />
        </AAHero>
      }
    >
      {!factoryEnv ? (
        <AAConfigErrorSection ui={ui} message={AA_FACTORY_ENV_ERROR} />
      ) : (
        <AALotteryWorkspace
          mode="create"
          gasEstimateMode="manual"
          title="Create Lottery Action"
          subtitle="When your AA account is ready, execute create."
          lottoFactoryAddress={factoryEnv.lottoFactoryAddress}
          accountFactoryAddress={factoryEnv.accountFactoryAddress}
          entryTokenAddress={factoryEnv.entryTokenAddress}
        />
      )}
    </AAFlowPage>
  );
}
