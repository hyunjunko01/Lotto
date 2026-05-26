'use client';

import { MetamaskSection } from '@/components/metamask/layout/MetamaskSection';
import type { useMetamaskLottoDetailPage } from '@/hooks/metamask/lotto-detail/useMetamaskLottoDetailPage';
import type { MetamaskUi } from '@/styles/metamask/uiStyles';

type Detail = ReturnType<typeof useMetamaskLottoDetailPage>;

type Props = {
    ui: MetamaskUi;
    d: Detail;
};

export function LottoWinnerSection({ ui, d }: Props) {
    return (
        <MetamaskSection ui={ui}>
            <h2 style={ui.h2InSection}>Winner</h2>
            <p style={{ margin: 0, ...ui.bodyMuted, wordBreak: 'break-all' }}>{d.winnerDisplay}</p>
        </MetamaskSection>
    );
}
