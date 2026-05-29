'use client';

import { MetamaskActionStatus } from '@/components/metamask/workspace/MetamaskActionStatus';
import { MetamaskCreateModePanel } from '@/components/metamask/workspace/modes/MetamaskCreateModePanel';
import { useCreateLotto } from '@/hooks/metamask/create-lottery/useCreateLotto';
import sharedStyles from './metamaskWorkspaceShared.module.css';
import styles from './MetamaskLotteryWorkspace.module.css';

export function MetamaskCreateLotteryWorkspace() {
    const {
        targetNetworkLabel,
        hasValidEntryToken,
        isConnected,
        isWrongNetwork,
        switchToTargetNetwork,
        entryFeeEth,
        setEntryFeeEth,
        maxPlayers,
        setMaxPlayers,
        actionError,
        createLotto,
        isCreateLottoPending,
        isCreateLottoConfirming,
        isCreateLottoConfirmed,
        canCreate,
    } = useCreateLotto();

    const isCreating = isCreateLottoPending || isCreateLottoConfirming;
    const executeDisabled = !canCreate || isWrongNetwork;

    return (
        <section className={styles.workspace}>
            <h2 className={styles.title}>Create Lottery Action</h2>
            <p className={styles.subtitle}>
                When your wallet is connected on the target network, set values and create the lottery instance.
            </p>

            {!isConnected ? (
                <div className={`${styles.warning} ${styles.warningInfo}`}>
                    Connect MetaMask from the header before creating a lottery.
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

            {isCreateLottoConfirmed ? (
                <MetamaskActionStatus status="Lottery instance created successfully." />
            ) : null}
            {actionError && !isCreateLottoConfirmed ? (
                <MetamaskActionStatus status={actionError} forceError />
            ) : null}

            <MetamaskCreateModePanel
                entryFeeEth={entryFeeEth}
                setEntryFeeEth={setEntryFeeEth}
                maxPlayers={maxPlayers}
                setMaxPlayers={setMaxPlayers}
                onExecute={() => void createLotto()}
                isLoading={isCreating}
                executeDisabled={executeDisabled}
                executeLabel={isCreating ? 'Creating...' : 'Create Lottery'}
            />
        </section>
    );
}
