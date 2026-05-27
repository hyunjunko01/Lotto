'use client';

import { useMemo, useState } from 'react';
import type { AAGasEstimateMode, AALotteryMode } from '@/lib/aa/types';
import { useAALottery } from '@/hooks/aa/workspace/useAALottery';
import { Web3AuthSection } from '@/components/aa/sections/Web3AuthSection';
import { AccountStatusSection } from '@/components/aa/sections/AccountStatusSection';
import { LottoParamsSection } from '@/components/aa/sections/LottoParamsSection';
import { ActionButtonsSection } from '@/components/aa/sections/ActionButtonsSection';
import { JoinInstanceListSection } from '@/components/aa/sections/JoinInstanceListSection';

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
    const clientId = process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID;
    const isReady = useMemo(() => Boolean(clientId), [clientId]);

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
        handleWeb3AuthLogin,
        handleRefresh,
        handleLogout,
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
        <section
            style={{
                marginTop: 16,
                padding: 20,
                border: '1px solid #2d3f45',
                borderRadius: 14,
                background: 'rgba(7, 19, 24, 0.72)',
            }}
        >
            <h2 style={{ margin: '0 0 10px' }}>{title}</h2>
            <p style={{ marginTop: 0, color: '#c6dfe2', lineHeight: 1.5 }}>{subtitle}</p>

            <Web3AuthSection
                onLogin={handleWeb3AuthLogin}
                isReady={isReady}
                isLoading={isLoading}
                onRefresh={handleRefresh}
                onLogout={handleLogout}
            />

            <AccountStatusSection
                status={status}
                email={email}
                accountAddress={accountAddress}
                accountDeployed={accountDeployed}
                letBalance={letBalance}
                signResultHash={signResultHash}
                bundlerResultHash={bundlerResultHash}
            />

            {createNeedsAccountRefreshWarning ? (
                <div
                    style={{
                        marginTop: 14,
                        padding: '12px 14px',
                        borderRadius: 10,
                        border: '1px solid #924747',
                        background: 'rgba(127, 39, 39, 0.26)',
                        color: '#ffd3cb',
                        lineHeight: 1.55,
                    }}
                >
                    You have a saved session, but the AA account has not been loaded yet. Click{' '}
                    <strong style={{ color: '#ffe8e0' }}>Refresh Account State</strong> above before
                    signing or sending a UserOp to create a lottery. That loads your smart account address and nonce
                    from the server.
                </div>
            ) : null}

            {insufficientLetForJoin ? (
                <div
                    style={{
                        marginTop: 14,
                        padding: '12px 14px',
                        borderRadius: 10,
                        border: '1px solid #924747',
                        background: 'rgba(127, 39, 39, 0.26)',
                        color: '#ffd3cb',
                        lineHeight: 1.55,
                    }}
                >
                    Not enough LET on your AA account for this instance entry fee. Use the AA token faucet
                    page first, then approve and join (same idea as MetaMask mode).
                </div>
            ) : null}

            {gasEstimateError ? (
                <div
                    style={{
                        marginTop: 14,
                        padding: '12px 14px',
                        borderRadius: 10,
                        border: '1px solid #924747',
                        background: 'rgba(127, 39, 39, 0.26)',
                        color: '#ffd3cb',
                        lineHeight: 1.55,
                    }}
                >
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
                <div
                    style={{
                        marginTop: 14,
                        padding: '12px 14px',
                        borderRadius: 10,
                        border: '1px solid #5d6f45',
                        background: 'rgba(60, 80, 40, 0.22)',
                        color: '#d8e8c8',
                        lineHeight: 1.55,
                    }}
                >
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

            <div
                style={{
                    marginTop: 16,
                    border: '1px solid #76b4be',
                    borderRadius: 12,
                    padding: 14,
                    background: 'rgba(15, 60, 70, 0.55)',
                }}
            >
                <h3 style={{ margin: 0 }}>{actionCardTitle}</h3>
                <p style={{ margin: '8px 0 0', color: '#c6dfe2', lineHeight: 1.5 }}>{actionCardDescription}</p>
                <ActionButtonsSection
                    onExecute={() => void handleExecuteUserOp()}
                    isLoading={isLoading}
                    executeDisabled={executeDisabled}
                    label={executeLabel}
                />
                <button
                    type="button"
                    onClick={() => setShowUserOpSettings((prev) => !prev)}
                    style={{
                        marginTop: 10,
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 10,
                        border: '1px solid #5d7980',
                        background: '#13242a',
                        color: '#d9eef1',
                        cursor: 'pointer',
                        textAlign: 'left',
                    }}
                >
                    {showUserOpSettings ? '▼ Hide Auto UserOp Values' : '▶ View Auto UserOp Values'}
                </button>

                {showUserOpSettings ? (
                    <div
                        style={{
                            marginTop: 10,
                            border: '1px solid #2d3f45',
                            borderRadius: 10,
                            padding: 10,
                            background: 'rgba(7, 19, 24, 0.72)',
                            display: 'grid',
                            gap: 6,
                            fontFamily: 'ui-monospace, Menlo, monospace',
                            fontSize: '0.82rem',
                            color: '#d4eaee',
                        }}
                    >
                        <p style={{ margin: 0, wordBreak: 'break-all' }}>
                            <strong>sender:</strong> {userOp.sender || '-'}
                        </p>
                        <p style={{ margin: 0, wordBreak: 'break-all' }}>
                            <strong>nonce:</strong> {userOp.nonce}
                        </p>
                        <p style={{ margin: 0, wordBreak: 'break-all' }}>
                            <strong>initCode:</strong> {userOp.initCode}
                        </p>
                        <p style={{ margin: 0, wordBreak: 'break-all' }}>
                            <strong>callData:</strong> {userOp.callData}
                        </p>
                        <p style={{ margin: 0, wordBreak: 'break-all' }}>
                            <strong>accountGasLimits:</strong> {userOp.accountGasLimits}
                        </p>
                        <p style={{ margin: 0, wordBreak: 'break-all' }}>
                            <strong>preVerificationGas:</strong> {userOp.preVerificationGas}
                        </p>
                        <p style={{ margin: 0, wordBreak: 'break-all' }}>
                            <strong>gasFees:</strong> {userOp.gasFees}
                        </p>
                        <p style={{ margin: 0, wordBreak: 'break-all' }}>
                            <strong>paymasterAndData:</strong> {userOp.paymasterAndData}
                        </p>
                    </div>
                ) : null}

            </div>
        </section>
    );
}
