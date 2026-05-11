'use client';

import { formatEther } from 'viem';
import { MetamaskHero } from '@/components/metamask/MetamaskHero';
import { MetamaskSection } from '@/components/metamask/MetamaskSection';
import { useMetamaskUi } from '@/components/metamask/useMetamaskUi';
import { useEntryTokenFaucet } from '@/hooks/useEntryTokenFaucet';
import { getMetamaskTokens } from '@/styles/metamask/tokens';

export default function MetamaskFaucetPage() {
    const ui = useMetamaskUi('warm');
    const t = getMetamaskTokens('warm');

    const {
        entryTokenAddress,
        walletAddress,
        isWrongNetwork,
        switchToAnvil,
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
        <main style={ui.pageMain}>
            <div style={ui.container}>
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
                        Note: `createLotto` does not change your LET balance. Balance changes when you claim faucet or join lotto.
                    </p>
                </MetamaskHero>

                {isWrongNetwork ? (
                    <section style={ui.networkBannerSection}>
                        <p style={{ color: t.warnText }}>Wrong network detected. Please switch to Anvil (31337).</p>
                        <button type="button" onClick={switchToAnvil} style={{ ...ui.primaryButtonSm, marginTop: 12 }}>
                            Switch to Anvil
                        </button>
                    </section>
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
            </div>
        </main>
    );
}
