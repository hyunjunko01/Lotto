'use client';

import { formatEther } from 'viem';
import { MetamaskHero } from '@/components/metamask/layout/MetamaskHero';
import { MetamaskSection } from '@/components/metamask/layout/MetamaskSection';
import { NetworkWarningBanner } from '@/components/metamask/sections/NetworkWarningBanner';
import { useEntryTokenFaucet } from '@/hooks/metamask/faucet/useEntryTokenFaucet';
import type { MetamaskUi } from '@/styles/metamask/uiStyles';
import type { MetamaskThemeTokens } from '@/styles/metamask/tokens';

type Props = {
    ui: MetamaskUi;
    t: MetamaskThemeTokens;
};

export function MetamaskFaucetWorkspace({ ui, t }: Props) {
    const {
        entryTokenAddress,
        walletAddress,
        isWrongNetwork,
        switchToTargetNetwork,
        targetNetworkLabel,
        claim,
        claimHash,
        isClaimPending,
        isClaimConfirming,
        isClaimConfirmed,
        canClaim,
        actionError,
        currentLetBalance,
        resetTransaction,
    } = useEntryTokenFaucet();

    const isClaiming = isClaimPending || isClaimConfirming;

    return (
        <>
            <MetamaskHero ui={ui} pill="MetaMask Faucet" title="Charge Entry Tokens (EOA)">
                <p style={ui.subtitle}>Call `claimTestTokens()` directly from your connected wallet.</p>
                <p style={{ ...ui.bodyMuted, marginTop: 10, wordBreak: 'break-all' }}>
                    Entry Token: {entryTokenAddress ?? '(missing NEXT_PUBLIC_ENTRY_TOKEN_ADDRESS)'}
                </p>
                <p style={{ ...ui.bodyMuted, marginTop: 8, wordBreak: 'break-all' }}>
                    Wallet: {walletAddress ?? '(not connected)'}
                </p>
                <p style={{ ...ui.bodyMuted, marginTop: 8 }}>
                    Current LET Balance: {typeof currentLetBalance === 'bigint' ? formatEther(currentLetBalance) : '-'}
                </p>
                <p style={{ ...ui.bodyMuted, marginTop: 6 }}>
                    Note: `createLotto` does not change your LET balance. Balance changes when you claim faucet or join
                    lotto.
                </p>
            </MetamaskHero>

            {isWrongNetwork ? (
                <NetworkWarningBanner
                    ui={ui}
                    t={t}
                    targetNetworkLabel={targetNetworkLabel}
                    onSwitchNetwork={switchToTargetNetwork}
                />
            ) : null}

            <MetamaskSection
                ui={ui}
                style={{
                    border: '1px solid #5b4832',
                    background: 'rgba(35, 21, 8, 0.5)',
                }}
            >
                <button
                    type="button"
                    onClick={() => void claim()}
                    disabled={!canClaim}
                    style={canClaim ? ui.primaryButton : ui.primaryButtonDisabled}
                >
                    {isClaiming ? 'Claiming...' : 'Claim faucet tokens'}
                </button>

                {claimHash ? <p style={ui.monoInline}>Claim tx: {claimHash}</p> : null}
                {isClaimConfirmed ? <p style={{ marginTop: 12, color: t.successText }}>Faucet claim confirmed.</p> : null}
                {actionError ? <p style={ui.errorBox}>{actionError}</p> : null}

                {isClaimConfirmed ? (
                    <button type="button" onClick={() => resetTransaction()} style={ui.secondaryButton}>
                        Clear transaction state
                    </button>
                ) : null}
            </MetamaskSection>
        </>
    );
}
