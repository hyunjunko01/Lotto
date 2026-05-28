'use client';

import Link from 'next/link';
import { useAAUi } from '@/components/aa/layout/useAAUi';
import { LottoDetailAccountSection } from '@/components/aa/sections/LottoDetailAccountSection';
import { LottoDetailActionCardsSection } from '@/components/aa/sections/LottoDetailActionCardsSection';
import { LottoDetailHeaderSection } from '@/components/aa/sections/LottoDetailHeaderSection';
import { useAALottoDetailPage } from '@/hooks/aa/useAALottoDetailPage';

export default function AALottoJoinDetailPage() {
    const ui = useAAUi();
    const d = useAALottoDetailPage();

    if (!d.lottoAddress) {
        return (
            <main style={ui.pageMain}>
                <div style={ui.container}>
                    <Link href="/aa/join-lottery" style={{ display: 'inline-flex', color: '#8fe8ff', textDecoration: 'underline', fontWeight: 700 }}>
                        ← Back to instances
                    </Link>
                    <p style={{ marginTop: 16, ...ui.warningText }}>Invalid lotto address.</p>
                </div>
            </main>
        );
    }

    return (
        <main style={ui.pageMain}>
            <div style={ui.container}>
                <Link
                    href="/aa/join-lottery"
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

                <LottoDetailHeaderSection ui={ui} d={d} />
                <LottoDetailAccountSection ui={ui} d={d} />
                <LottoDetailActionCardsSection ui={ui} d={d} />
            </div>
        </main>
    );
}
