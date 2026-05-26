'use client';

import { MetamaskSection } from '@/components/metamask/layout/MetamaskSection';
import { NetworkWarningBanner } from '@/components/metamask/sections/NetworkWarningBanner';
import type { useMetamaskLottoDetailPage } from '@/hooks/metamask/lotto-detail/useMetamaskLottoDetailPage';
import type { MetamaskUi } from '@/styles/metamask/uiStyles';
import type { MetamaskThemeTokens } from '@/styles/metamask/tokens';

type Detail = ReturnType<typeof useMetamaskLottoDetailPage>;

type Props = {
    ui: MetamaskUi;
    t: MetamaskThemeTokens;
    d: Detail;
};

export function LottoDetailHeaderSection({ ui, t, d }: Props) {
    return (
        <MetamaskSection ui={ui} first>
            <h1 style={ui.h1Flat}>Lotto Instance</h1>
            <p style={{ ...ui.bodyMuted, wordBreak: 'break-all' }}>
                Address: {d.lottoAddress ?? String(d.rawAddress ?? '')}
            </p>
            {d.isWrongNetwork ? (
                <NetworkWarningBanner
                    ui={ui}
                    t={t}
                    targetNetworkLabel={d.targetNetworkLabel}
                    onSwitchNetwork={d.switchToTargetNetwork}
                    inline
                />
            ) : null}
        </MetamaskSection>
    );
}
