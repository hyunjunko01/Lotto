'use client';

import { useState } from 'react';
import type { AAGasEstimateMode, AALotteryMode } from '@/lib/aa/types';
import { useAALottery } from '@/hooks/aa/workspace/useAALottery';
import { AccountStatusSection } from '@/components/aa/sections/AccountStatusSection';
import { LottoParamsSection } from '@/components/aa/sections/LottoParamsSection';
import { ActionButtonsSection } from '@/components/aa/sections/ActionButtonsSection';
import { JoinInstanceListSection } from '@/components/aa/sections/JoinInstanceListSection';
import styles from './AALotteryWorkspace.module.css';

type Props = {
    mode: AALotteryMode;
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
        selectedJoinEntryFee,
        selectedJoinAction,
        lottoInstances,
        isLoadingLottoInstances,
        lottoInstancesError,
        fetchLottoInstances,
        handleSelectJoinTarget,
        handleExecuteUserOp,
    } = useAALottery({ mode, lottoFactoryAddress, accountFactoryAddress, entryTokenAddress, gasEstimateMode });

    const mustRefreshAAAccount =
        Boolean(sessionToken) && !AAAccountHydrated && !isLoading;
    const createNeedsAccountRefreshWarning = mode === 'create' && mustRefreshAAAccount;

    const insufficientLetForJoin =
        mode === 'join' &&
        AAAccountHydrated &&
        letBalance !== null &&
        selectedJoinEntryFee > BigInt(0) &&
        letBalance < selectedJoinEntryFee;
    const joinLetBlocksSign =
        insufficientLetForJoin &&
        (selectedJoinAction === 'approveEntryFee' || selectedJoinAction === 'joinLotto');

    const gasBlocksSignSend =
        Boolean(sessionToken) &&
        AAAccountHydrated &&
        (!gasEstimateReady || isEstimatingGas || Boolean(gasEstimateError));
    const executeDisabled =
        mustRefreshAAAccount ||
        joinLetBlocksSign ||
        !joinSignStateOk ||
        (mode !== 'faucet' && isEstimatingGas) ||
        !sessionToken ||
        !AAAccountHydrated;
    const executeLabel =
        mode === 'create'
            ? 'Create Lottery'
            : mode === 'join'
              ? 'Execute Join Action'
              : 'Request Faucet Tokens';
    const actionCardTitle = mode === 'create' ? 'Create Lottery Action' : 'Token Faucet Action';
    const actionCardDescription =
        mode === 'create'
            ? 'Execute this action to estimate gas, sign, and send a create-lottery UserOp with current inputs.'
            : 'Execute this action to estimate gas, sign, and send a faucet UserOp from your AA account.';

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
                compact={mode === 'create'}
                showUserOpHashes={mode !== 'create'}
            />

            {createNeedsAccountRefreshWarning ? (
                <div className={`${styles.warning} ${styles.warningError}`}>
                    You have a saved session, but the AA account has not been loaded yet. Click{' '}
                    <strong className={styles.warningStrong}>Refresh Account State</strong> above before
                    signing or sending a UserOp to create a lottery. That loads your smart account address and nonce
                    from the server.
                </div>
            ) : null}

            {insufficientLetForJoin ? (
                <div className={`${styles.warning} ${styles.warningError}`}>
                    Not enough LET on your AA account for this instance entry fee. Use the AA token faucet
                    page first, then approve and join (same idea as MetaMask mode).
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

            {mode === 'join' ? (
                <JoinInstanceListSection
                    lottoInstances={lottoInstances}
                    isLoading={isLoadingLottoInstances}
                    error={lottoInstancesError}
                    selectedAddress={joinTargetAddress}
                    onRefresh={() => void fetchLottoInstances()}
                    onSelect={handleSelectJoinTarget}
                />
            ) : null}

            {mode === 'create' || mode === 'join' ? (
                <LottoParamsSection
                    mode={mode}
                    entryFeeEth={entryFeeEth}
                    setEntryFeeEth={setEntryFeeEth}
                    maxPlayers={maxPlayers}
                    setMaxPlayers={setMaxPlayers}
                    joinTargetAddress={joinTargetAddress}
                    setJoinTargetAddress={setJoinTargetAddress}
                    joinValueEth={joinValueEth}
                    setJoinValueEth={setJoinValueEth}
                />
            ) : null}

            <div className={styles.actionCard}>
                <h3 className={styles.actionCardTitle}>{actionCardTitle}</h3>
                <p className={styles.actionCardDescription}>{actionCardDescription}</p>
                <ActionButtonsSection
                    onExecute={() => void handleExecuteUserOp()}
                    isLoading={isLoading}
                    executeDisabled={executeDisabled}
                    label={executeLabel}
                />
                <button
                    type="button"
                    onClick={() => setShowUserOpSettings((prev) => !prev)}
                    className={styles.toggleButton}
                >
                    {showUserOpSettings ? '▼ Hide Auto UserOp Values' : '▶ View Auto UserOp Values'}
                </button>

                {showUserOpSettings ? (
                    <div className={styles.userOpPanel}>
                        <p className={styles.userOpText}>
                            <strong>sign userOpHash:</strong> {signResultHash || '-'}
                        </p>
                        <p className={styles.userOpText}>
                            <strong>send userOpHash:</strong> {bundlerResultHash || '-'}
                        </p>
                        <p className={styles.userOpText}>
                            <strong>sender:</strong> {userOp.sender || '-'}
                        </p>
                        <p className={styles.userOpText}>
                            <strong>nonce:</strong> {userOp.nonce}
                        </p>
                        <p className={styles.userOpText}>
                            <strong>initCode:</strong> {userOp.initCode}
                        </p>
                        <p className={styles.userOpText}>
                            <strong>callData:</strong> {userOp.callData}
                        </p>
                        <p className={styles.userOpText}>
                            <strong>accountGasLimits:</strong> {userOp.accountGasLimits}
                        </p>
                        <p className={styles.userOpText}>
                            <strong>preVerificationGas:</strong> {userOp.preVerificationGas}
                        </p>
                        <p className={styles.userOpText}>
                            <strong>gasFees:</strong> {userOp.gasFees}
                        </p>
                        <p className={styles.userOpText}>
                            <strong>paymasterAndData:</strong> {userOp.paymasterAndData}
                        </p>
                    </div>
                ) : null}

            </div>
        </section>
    );
}
