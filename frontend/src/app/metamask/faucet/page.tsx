'use client';

import { MetamaskFaucetWorkspace } from '@/components/metamask/workspace/MetamaskFaucetWorkspace';
import { useMetamaskUi } from '@/components/metamask/layout/useMetamaskUi';
import { getMetamaskTokens } from '@/styles/metamask/tokens';

export default function MetamaskFaucetPage() {
    const ui = useMetamaskUi('warm');
    const t = getMetamaskTokens('warm');

    return (
        <main style={ui.pageMain}>
            <div style={ui.container}>
                <MetamaskFaucetWorkspace ui={ui} t={t} />
            </div>
        </main>
    );
}
