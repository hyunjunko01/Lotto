'use client';

import type { MetamaskUi } from '@/styles/metamask/uiStyles';
import type { MetamaskThemeTokens } from '@/styles/metamask/tokens';

type Props = {
    ui: MetamaskUi;
    t: MetamaskThemeTokens;
    targetNetworkLabel: string;
    onSwitchNetwork: () => void;
    inline?: boolean;
};

export function NetworkWarningBanner({ ui, t, targetNetworkLabel, onSwitchNetwork, inline }: Props) {
    const content = (
        <>
            <p style={{ color: t.warnText, margin: inline ? 0 : undefined }}>
                Wrong network detected. Please switch to {targetNetworkLabel}.
            </p>
            <button
                type="button"
                onClick={onSwitchNetwork}
                style={inline ? { ...ui.primaryButtonSm, marginTop: 12 } : ui.primaryButtonSm}
            >
                Switch to {targetNetworkLabel}
            </button>
        </>
    );

    if (inline) {
        return <div style={{ marginTop: 14 }}>{content}</div>;
    }

    return <section style={ui.networkBannerSection}>{content}</section>;
}
