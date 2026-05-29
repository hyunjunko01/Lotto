'use client';

import { MetamaskActionStatus } from '@/components/metamask/workspace/MetamaskActionStatus';
import { MetamaskFaucetModePanel } from '@/components/metamask/workspace/modes/MetamaskFaucetModePanel';
import { useEntryTokenFaucet } from '@/hooks/metamask/faucet/useEntryTokenFaucet';
import sharedStyles from './metamaskWorkspaceShared.module.css';
import styles from './MetamaskLotteryWorkspace.module.css';

export function MetamaskFaucetWorkspace() {
    const {
        entryTokenAddress,
        walletAddress,
        isWrongNetwork,
        switchToTargetNetwork,
        targetNetworkLabel,
        claim,
        isClaimPending,
        isClaimConfirming,
        isClaimConfirmed,
        canClaim,
        actionError,
    } = useEntryTokenFaucet();

    const isClaiming = isClaimPending || isClaimConfirming;
    const isConnected = Boolean(walletAddress);
    const hasValidEntryToken = Boolean(entryTokenAddress);
    const executeDisabled = !canClaim || isWrongNetwork;

    return (
        <section className={styles.workspace}>
            <h2 className={styles.title}>Request Tokens</h2>
            <p className={styles.subtitle}>When your wallet is connected on the target network, request test LET.</p>

            {!isConnected ? (
                <div className={`${styles.warning} ${styles.warningInfo}`}>
                    Connect MetaMask from the header before requesting tokens.
                </div>
            ) : null}

            {isConnected && !hasValidEntryToken ? (
                <div className={`${styles.warning} ${styles.warningError}`}>
                    NEXT_PUBLIC_ENTRY_TOKEN_ADDRESS is missing or invalid.
                </div>
            ) : null}

            {isWrongNetwork ? (
                <div className={`${styles.warning} ${styles.warningError}`}>
                    Wrong network detected. Please switch to {targetNetworkLabel}.
                    <button type="button" onClick={switchToTargetNetwork} className={sharedStyles.networkSwitchButton}>
                        Switch to {targetNetworkLabel}
                    </button>
                </div>
            ) : null}

            {isClaimConfirmed ? <MetamaskActionStatus status="Test tokens claimed successfully." /> : null}
            {actionError && !isClaimConfirmed ? (
                <MetamaskActionStatus status={actionError} forceError />
            ) : null}

            <MetamaskFaucetModePanel
                onExecute={() => void claim()}
                isLoading={isClaiming}
                executeDisabled={executeDisabled}
                executeLabel={isClaiming ? 'Requesting...' : 'Request Tokens'}
            />
        </section>
    );
}
