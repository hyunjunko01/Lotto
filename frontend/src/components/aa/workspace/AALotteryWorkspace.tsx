'use client';

import { useMemo, useState } from 'react';
import type { AALotteryMode } from '@/lib/aa/types';
import { useAALottery } from '@/hooks/aa/workspace/useAALottery';
import { Web3AuthSection } from '@/components/aa/sections/Web3AuthSection';
import { AccountStatusSection } from '@/components/aa/sections/AccountStatusSection';
import { LottoParamsSection } from '@/components/aa/sections/LottoParamsSection';
import { UserOpDisplaySection } from '@/components/aa/sections/UserOpDisplaySection';
import { AdvancedSettingsSection } from '@/components/aa/sections/AdvancedSettingsSection';
import { ActionButtonsSection } from '@/components/aa/sections/ActionButtonsSection';
import { JoinInstanceListSection } from '@/components/aa/sections/JoinInstanceListSection';

type Props = {
    mode: AALotteryMode;
    title: string;
    subtitle: string;
    lottoFactoryAddress: string;
    accountFactoryAddress: string;
    entryTokenAddress?: string;
};

export function AALotteryWorkspace({ mode, title, subtitle, lottoFactoryAddress, accountFactoryAddress, entryTokenAddress }: Props) {
    const clientId = process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID;
    const isReady = useMemo(() => Boolean(clientId), [clientId]);

    const [showAdvanced, setShowAdvanced] = useState(false);

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
        handleUserOpFieldChange,
        handleSignUserOp,
        handleSendUserOp,
        handleWeb3AuthLogin,
        handleRefresh,
        handleLogout,
    } = useAALottery({ mode, lottoFactoryAddress, accountFactoryAddress, entryTokenAddress });

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

            {gasBlocksSignSend && !gasEstimateError && AAAccountHydrated && sessionToken ? (
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
                        : 'Waiting for bundler gas estimate before Sign / Send.'}
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

            <UserOpDisplaySection userOp={userOp} />

            <div style={{ marginTop: 16 }}>
                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: 10,
                        border: '1px solid #5d7980',
                        background: showAdvanced ? '#1a3a42' : '#13242a',
                        color: showAdvanced ? '#ffd700' : '#d9eef1',
                        cursor: 'pointer',
                        fontWeight: 500,
                        fontSize: '1rem',
                        transition: 'all 0.3s ease',
                    }}
                >
                    {showAdvanced ? '▼ Hide Advanced Settings' : '▶ Show Advanced Settings'}
                </button>
            </div>

            {showAdvanced && <AdvancedSettingsSection userOp={userOp} onFieldChange={handleUserOpFieldChange} />}

            <ActionButtonsSection
                onSign={handleSignUserOp}
                onSend={handleSendUserOp}
                isLoading={isLoading}
                signDisabled={mustRefreshAAAccount || joinLetBlocksSign || !joinSignStateOk || gasBlocksSignSend}
                sendDisabled={
                    mustRefreshAAAccount ||
                    joinLetBlocksSign ||
                    !joinSignStateOk ||
                    gasBlocksSignSend ||
                    !userOp.signature ||
                    userOp.signature === '0x'
                }
            />
        </section>
    );
}
