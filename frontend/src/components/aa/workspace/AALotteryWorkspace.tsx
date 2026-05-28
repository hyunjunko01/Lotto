'use client';

import { useState } from 'react';
import type { AAGasEstimateMode } from '@/lib/aa/types';
import { useAALottery } from '@/hooks/aa/workspace/useAALottery';
import { AccountStatusSection } from '@/components/aa/sections/AccountStatusSection';
import { CreateModePanel } from '@/components/aa/workspace/modes/CreateModePanel';
import { FaucetModePanel } from '@/components/aa/workspace/modes/FaucetModePanel';
import styles from './AALotteryWorkspace.module.css';

type WorkspaceMode = 'create' | 'faucet';

type Props = {
    mode: WorkspaceMode;
    gasEstimateMode?: AAGasEstimateMode;
    title: string;
    subtitle: string;
    lottoFactoryAddress: string;
    accountFactoryAddress: string;
    entryTokenAddress?: string;
};

export function AALotteryWorkspace({
    mode,
    gasEstimateMode = 'auto',
    title,
    subtitle,
    lottoFactoryAddress,
    accountFactoryAddress,
    entryTokenAddress,
}: Props) {
    const [showUserOpSettings, setShowUserOpSettings] = useState(false);

    const {
        sessionToken,
        AAAccountHydrated,
        joinSignStateOk,
        email,
        accountAddress,
        status,
        isLoading,
        isEstimatingGas,
        gasEstimateReady,
        gasEstimateError,
        accountDeployed,
        signResultHash,
        bundlerResultHash,
        letBalance,
        userOp,
        entryFeeEth,
        setEntryFeeEth,
        maxPlayers,
        setMaxPlayers,
        joinValueEth,
        setJoinValueEth,
        joinTargetAddress,
        setJoinTargetAddress,
        handleExecuteUserOp,
    } = useAALottery({ mode, lottoFactoryAddress, accountFactoryAddress, entryTokenAddress, gasEstimateMode });

    const mustRefreshAAAccount = Boolean(sessionToken) && !AAAccountHydrated && !isLoading;
    const createNeedsAccountRefreshWarning = mode === 'create' && mustRefreshAAAccount;

    const gasBlocksSignSend =
        Boolean(sessionToken) &&
        AAAccountHydrated &&
        (!gasEstimateReady || isEstimatingGas || Boolean(gasEstimateError));
    const executeDisabled =
        mustRefreshAAAccount ||
        !joinSignStateOk ||
        (mode !== 'faucet' && isEstimatingGas) ||
        !sessionToken ||
        !AAAccountHydrated;
    const executeLabel = mode === 'create' ? 'Create Lottery' : 'Request Tokens';

    return (
        <section className={styles.workspace}>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.subtitle}>{subtitle}</p>

            <AccountStatusSection
                status={status}
                email={email}
                accountAddress={accountAddress}
                accountDeployed={accountDeployed}
                letBalance={letBalance}
                signResultHash={signResultHash}
                bundlerResultHash={bundlerResultHash}
                compact
                showUserOpHashes={false}
            />

            {createNeedsAccountRefreshWarning ? (
                <div className={`${styles.warning} ${styles.warningError}`}>
                    You have a saved session, but the AA account has not been loaded yet. Click{' '}
                    <strong className={styles.warningStrong}>Refresh Account State</strong> above before
                    signing or sending a UserOp to create a lottery. That loads your smart account address and nonce
                    from the server.
                </div>
            ) : null}

            {gasEstimateError ? (
                <div className={`${styles.warning} ${styles.warningError}`}>
                    Bundler gas estimation failed: {gasEstimateError}. Sign and Send are disabled until estimation
                    succeeds (check bundler URL, paymaster, and Web3Auth session).
                </div>
            ) : null}

            {mode !== 'faucet' &&
                gasEstimateMode !== 'manual' &&
                gasBlocksSignSend &&
                !gasEstimateError &&
                AAAccountHydrated &&
                sessionToken ? (
                <div className={`${styles.warning} ${styles.warningInfo}`}>
                    {isEstimatingGas
                        ? 'Estimating UserOp gas from the bundler…'
                        : 'Waiting for bundler gas estimate before executing UserOp.'}
                </div>
            ) : null}

            {mode === 'create' ? (
                <CreateModePanel
                    entryFeeEth={entryFeeEth}
                    setEntryFeeEth={setEntryFeeEth}
                    maxPlayers={maxPlayers}
                    setMaxPlayers={setMaxPlayers}
                    joinTargetAddress={joinTargetAddress}
                    setJoinTargetAddress={setJoinTargetAddress}
                    joinValueEth={joinValueEth}
                    setJoinValueEth={setJoinValueEth}
                    onExecute={() => void handleExecuteUserOp()}
                    isLoading={isLoading}
                    executeDisabled={executeDisabled}
                    executeLabel={executeLabel}
                    showUserOpSettings={showUserOpSettings}
                    onToggleUserOpSettings={() => setShowUserOpSettings((prev) => !prev)}
                    signResultHash={signResultHash}
                    bundlerResultHash={bundlerResultHash}
                    userOp={userOp}
                />
            ) : (
                <FaucetModePanel
                    onExecute={() => void handleExecuteUserOp()}
                    isLoading={isLoading}
                    executeDisabled={executeDisabled}
                    executeLabel={executeLabel}
                    showUserOpSettings={showUserOpSettings}
                    onToggleUserOpSettings={() => setShowUserOpSettings((prev) => !prev)}
                    signResultHash={signResultHash}
                    bundlerResultHash={bundlerResultHash}
                    userOp={userOp}
                />
            )}
        </section>
    );
}
