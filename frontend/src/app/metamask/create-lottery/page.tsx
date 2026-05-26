'use client';

import { MetamaskCreateLotteryWorkspace } from '@/components/metamask/workspace/MetamaskCreateLotteryWorkspace';
import { useMetamaskUi } from '@/components/metamask/layout/useMetamaskUi';
import { getMetamaskTokens } from '@/styles/metamask/tokens';

export default function CreateLotteryPage() {
    const ui = useMetamaskUi('teal');
    const t = getMetamaskTokens('teal');

    return (
        <main style={ui.pageMain}>
            <div style={ui.container}>
                <MetamaskCreateLotteryWorkspace ui={ui} t={t} />
            </div>
        </main>
    );
}
