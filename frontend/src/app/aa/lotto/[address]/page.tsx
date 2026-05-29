'use client';

import { LottoDetailActionCardsSection } from '@/components/aa/sections/LottoDetailActionCardsSection';
import { AAFlowPage } from '@/components/aa/layout/AAFlowPage';
import { AAConfigErrorSection } from '@/components/aa/layout/AAConfigErrorSection';
import { LottoDetailHero } from '@/components/aa/lotto-detail/LottoDetailHero';
import { useAAUi } from '@/components/aa/layout/useAAUi';
import { useAALottoDetailPage } from '@/hooks/aa/useAALottoDetailPage';

export default function AALottoJoinDetailPage() {
    const ui = useAAUi();
    const d = useAALottoDetailPage();

    if (!d.lottoAddress) {
        return (
            <AAFlowPage backHref="/aa/join-lottery" backLabel="← Back to instances" hero={<></>}>
                <AAConfigErrorSection ui={ui} message="Invalid lotto address." />
            </AAFlowPage>
        );
    }

    return (
        <AAFlowPage
            backHref="/aa/join-lottery"
            backLabel="← Back to instances"
            hero={<LottoDetailHero ui={ui} d={d} />}
        >
            <LottoDetailActionCardsSection d={d} />
        </AAFlowPage>
    );
}
