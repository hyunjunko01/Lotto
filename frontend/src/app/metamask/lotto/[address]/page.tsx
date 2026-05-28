'use client';

import Link from 'next/link';
import { LottoCallableActionsSection } from '@/components/metamask/sections/LottoCallableActionsSection';
import { LottoDetailHeaderSection } from '@/components/metamask/sections/LottoDetailHeaderSection';
import { LottoInstanceInfoSection } from '@/components/metamask/sections/LottoInstanceInfoSection';
import { LottoWinnerSection } from '@/components/metamask/sections/LottoWinnerSection';
import { useMetamaskUi } from '@/components/metamask/layout/useMetamaskUi';
import { useMetamaskLottoDetailPage } from '@/hooks/metamask/lotto-detail/useMetamaskLottoDetailPage';
import { getMetamaskTokens } from '@/styles/metamask/tokens';

export default function LottoInstancePage() {
    const ui = useMetamaskUi('teal');
    const t = getMetamaskTokens('teal');
    const d = useMetamaskLottoDetailPage();

    if (!d.lottoAddress) {
        return (
            <main style={ui.pageMain}>
                <div style={ui.container}>
                    <Link
                        href="/metamask/join-lottery"
                        style={{ display: 'inline-flex', color: '#8fe8ff', textDecoration: 'underline', fontWeight: 700 }}
                    >
                        ← Back to instances
                    </Link>
                    <p style={{ marginTop: 16, ...ui.errorBox }}>Invalid lotto address.</p>
                </div>
            </main>
        );
    }

    return (
        <main style={ui.pageMain}>
            <div style={ui.container}>
                <Link
                    href="/metamask/join-lottery"
                    style={{
                        display: 'inline-flex',
                        marginBottom: 14,
                        color: '#8fe8ff',
                        textDecoration: 'underline',
                        fontWeight: 700,
                    }}
                >
                    ← Back to instances
                </Link>

                <LottoDetailHeaderSection ui={ui} t={t} d={d} />
                <LottoWinnerSection ui={ui} d={d} />
                <LottoInstanceInfoSection ui={ui} d={d} />
                <LottoCallableActionsSection ui={ui} t={t} d={d} />
            </div>
        </main>
    );
}
