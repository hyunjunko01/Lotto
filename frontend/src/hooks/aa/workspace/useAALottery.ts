'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createWalletClient, custom, isAddress } from 'viem';
import { refreshAAHeaderStatus, resetAAHeaderStatus } from '@/hooks/aa/workspace/account/aaHeaderStatus';
import { useAAAccount } from '@/hooks/aa/workspace/account/useAAAccount';
import { useAASession } from '@/hooks/aa/workspace/account/useAASession';
import { useAALottoInstances } from '@/hooks/aa/workspace/reads/useAALottoInstances';
import { useAATokenReads } from '@/hooks/aa/workspace/reads/useAATokenReads';
import { useAAUserOpDraft } from '@/hooks/aa/workspace/userop/useAAUserOpDraft';
import { useAAUserOpGas } from '@/hooks/aa/workspace/userop/useAAUserOpGas';
import { useAAUserOpSignSend } from '@/hooks/aa/workspace/userop/useAAUserOpSignSend';
import { computeCallDataForMode } from '@/lib/aa/call-data';
import { joinActionAllowedByState } from '@/lib/aa/join/actionGuards';
import { findLottoSummary } from '@/lib/aa/join/lottoSummary';
import type { AAJoinAction, UseAALotteryProps } from '@/lib/aa/types';
import { computeInitCode } from '@/lib/aa/userop/initCode';
import { connectWeb3Auth } from '@/lib/web3auth';
import { targetChain } from '@/lib/targetNetwork';

export function useAALottery({
    mode,
    lottoFactoryAddress,
    accountFactoryAddress,
    entryTokenAddress,
    initialJoinTargetAddress,
    gasEstimateMode = 'auto',
    loadJoinInstances = true,
    joinSummaryOverride,
}: UseAALotteryProps) {
    const [status, setStatus] = useState('Log in with Web3Auth to create or load your AA account.');
    const [isLoading, setIsLoading] = useState(false);
    const workflow = useMemo(
        () => ({ status, setStatus, isLoading, setIsLoading }),
        [status, isLoading]
    );

    const session = useAASession();
    const account = useAAAccount();

    const [entryFeeEth, setEntryFeeEth] = useState('10');
    const [maxPlayers, setMaxPlayers] = useState('5');
    const [joinValueEth, setJoinValueEth] = useState('0.01');
    const [joinTargetAddress, setJoinTargetAddress] = useState(initialJoinTargetAddress ?? '');
    const [selectedJoinAction, setSelectedJoinAction] = useState<AAJoinAction>('joinLotto');
    const [selectedJoinEntryFee, setSelectedJoinEntryFee] = useState<bigint>(BigInt(0));
    const [selectedJoinEntryToken, setSelectedJoinEntryToken] = useState('');

    const lottoReads = useAALottoInstances(lottoFactoryAddress, {
        enabled: mode === 'join' ? Boolean(lottoFactoryAddress) && loadJoinInstances : Boolean(lottoFactoryAddress),
    });
    const tokenReads = useAATokenReads({
        mode,
        accountAddress: account.accountAddress,
        entryTokenAddress,
        selectedJoinEntryToken,
        joinTargetAddress,
    });

    const initCode = useMemo(
        () =>
            computeInitCode({
                accountDeployed: account.accountDeployed,
                ownerAddress: account.ownerAddress,
                salt: account.salt,
                accountFactoryAddress,
            }),
        [account.accountDeployed, account.ownerAddress, account.salt, accountFactoryAddress]
    );

    const callData = useMemo(
        () =>
            computeCallDataForMode({
                mode,
                entryFeeEth,
                maxPlayers,
                entryTokenAddress,
                lottoFactoryAddress,
                selectedJoinAction,
                joinTargetAddress,
                selectedJoinEntryFee,
                selectedJoinEntryToken,
            }),
        [
            mode,
            entryFeeEth,
            maxPlayers,
            entryTokenAddress,
            lottoFactoryAddress,
            selectedJoinAction,
            joinTargetAddress,
            selectedJoinEntryFee,
            selectedJoinEntryToken,
        ]
    );

    const userOpGas = useAAUserOpGas({
        mode,
        selectedJoinAction,
        sender: account.accountAddress,
        ownerAddress: account.ownerAddress,
        web3Provider: session.web3Provider,
        nonce: account.accountNonce,
        initCode,
        callData,
        gasEstimateMode,
        joinTargetAddress,
        selectedJoinEntryFee,
        selectedJoinEntryToken,
    });
    const {
        gas,
        gasEstimateReady,
        isEstimating: isEstimatingGas,
        estimateError: gasEstimateError,
        estimateForAction,
        isGasReadyForAction,
        getGasForAction,
        getEstimateErrorForAction,
        isEstimatingAction,
    } = userOpGas;
    const draft = useAAUserOpDraft({
        accountAddress: account.accountAddress,
        accountNonce: account.accountNonce,
        initCode,
        callData,
        gas,
    });

    const signSend = useAAUserOpSignSend({
        workflow,
        gasEstimateReady,
        isGasEstimateReadyForAction: gasEstimateMode === 'manual' ? isGasReadyForAction : undefined,
        mode,
        sessionToken: session.sessionToken,
        web3Provider: session.web3Provider,
        ownerAddress: account.ownerAddress,
        accountAddress: account.accountAddress,
        userOp: draft.userOp,
        setUserOp: draft.setUserOp,
        setAccountNonce: account.setAccountNonce,
        fetchAccountNonce: account.fetchAccountNonce,
        selectedJoinAction,
        setSelectedJoinAction,
        joinTargetAddress,
        selectedJoinEntryFee,
        selectedJoinEntryToken,
        letBalance: tokenReads.letBalance,
        joinEntryAllowance: tokenReads.joinEntryAllowance,
        lottoInstances: joinSummaryOverride ? [joinSummaryOverride] : lottoReads.lottoInstances,
        fetchLetBalance: tokenReads.fetchLetBalance,
        fetchJoinAllowance: tokenReads.fetchJoinAllowance,
        fetchLottoInstances: lottoReads.fetchLottoInstances,
    });
    const fetchAAAccount = account.fetchAAAccount;
    const fetchAccountNonce = account.fetchAccountNonce;
    const setAAAccountHydrated = account.setAAAccountHydrated;
    const fetchLottoInstances = lottoReads.fetchLottoInstances;

    const handleSelectJoinTarget = useCallback((address: string, entryFeeWei?: bigint, entryToken?: string) => {
        setJoinTargetAddress(address);
        setSelectedJoinEntryFee(entryFeeWei ?? BigInt(0));
        setSelectedJoinEntryToken(entryToken ?? '');
    }, []);

    const handleEstimateJoinAction = useCallback(
        async (action: AAJoinAction) => {
            if (gasEstimateMode !== 'manual') {
                return;
            }
            setSelectedJoinAction(action);
            setStatus(`Estimating gas for ${action}...`);
            try {
                await estimateForAction(action);
                setStatus(`Gas estimate ready for ${action}. Sign, then send.`);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to estimate UserOp gas.';
                setStatus(`Error: ${message}`);
            }
        },
        [estimateForAction, gasEstimateMode, setSelectedJoinAction]
    );

    const handleEstimateCurrentUserOp = useCallback(async () => {
        if (gasEstimateMode !== 'manual') {
            return;
        }
        const action = selectedJoinAction;
        const targetLabel = mode === 'join' ? action : mode;
        setStatus(`Estimating gas for ${targetLabel}...`);
        try {
            await estimateForAction(action);
            setStatus(`Gas estimate ready for ${targetLabel}. Sign, then send.`);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to estimate UserOp gas.';
            setStatus(`Error: ${message}`);
        }
    }, [estimateForAction, gasEstimateMode, mode, selectedJoinAction]);

    const hydrateAAAccount = useCallback(
        async (owner: string) => {
            const nextAccountAddress = await fetchAAAccount(owner);
            await fetchAccountNonce(nextAccountAddress);
            if (mode === 'join' && loadJoinInstances) {
                await fetchLottoInstances();
            }
            setAAAccountHydrated(true);
        },
        [fetchAAAccount, fetchAccountNonce, fetchLottoInstances, loadJoinInstances, mode, setAAAccountHydrated]
    );

    const normalizedSessionOwner =
        session.sessionToken && isAddress(session.sessionToken) ? session.sessionToken.toLowerCase() : '';
    const normalizedHydratedOwner =
        account.ownerAddress && isAddress(account.ownerAddress) ? account.ownerAddress.toLowerCase() : '';
    const needsHydration =
        Boolean(normalizedSessionOwner) &&
        (!account.AAAccountHydrated || normalizedHydratedOwner !== normalizedSessionOwner);

    useEffect(() => {
        if (!session.sessionToken || !needsHydration) {
            return;
        }

        let cancelled = false;
        void (async () => {
            try {
                setIsLoading(true);
                setStatus('Loading AA account from your current session...');
                await hydrateAAAccount(session.sessionToken);
                if (!cancelled) {
                    setStatus('AA account is ready.');
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to load AA account.';
                if (!cancelled) {
                    setStatus(`Error: ${message}`);
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [hydrateAAAccount, needsHydration, session.sessionToken]);

    useEffect(() => {
        if (!session.sessionToken) {
            return;
        }
        if (!needsHydration && isLoading) {
            setIsLoading(false);
        }
        if (!needsHydration && status === 'Loading AA account from your current session...') {
            setStatus('AA account is ready.');
        }
    }, [isLoading, needsHydration, session.sessionToken, status]);

    const handleWeb3AuthLogin = useCallback(async () => {
        try {
            setIsLoading(true);
            setStatus('Processing Web3Auth login...');

            const provider = await connectWeb3Auth();
            session.setWeb3Provider(provider);

            const walletClient = createWalletClient({
                chain: targetChain,
                transport: custom(provider),
            });
            const addresses = await walletClient.getAddresses();
            const connectedAddress = addresses[0];
            if (!connectedAddress || !isAddress(connectedAddress)) {
                throw new Error('Failed to read wallet address from Web3Auth provider.');
            }

            session.persistSession(connectedAddress);
            session.setEmail('');

            setStatus('Loading AA account...');
            await hydrateAAAccount(connectedAddress);
            await refreshAAHeaderStatus(connectedAddress);
            setStatus('Web3Auth login and AA account connection completed.');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Web3Auth login failed.';
            setStatus(`Error: ${message}`);
        } finally {
            setIsLoading(false);
        }
    }, [hydrateAAAccount, session]);

    const handleRefresh = useCallback(async () => {
        if (!session.sessionToken) {
            setStatus('Please log in with Web3Auth first.');
            return;
        }

        try {
            setIsLoading(true);
            setStatus('Refreshing AA account state...');
            await hydrateAAAccount(session.sessionToken);
            await refreshAAHeaderStatus(session.sessionToken);
            setStatus('AA account state refreshed.');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to refresh account.';
            setStatus(`Error: ${message}`);
        } finally {
            setIsLoading(false);
        }
    }, [hydrateAAAccount, session.sessionToken]);

    const handleLogout = useCallback(() => {
        session.clearSession();
        resetAAHeaderStatus();
        account.resetAAAccount();
        draft.resetUserOpDraft();
        signSend.resetSignSend();
        tokenReads.resetTokenReads();
        lottoReads.resetLottoInstances();
        setEntryFeeEth('10');
        setMaxPlayers('5');
        setJoinValueEth('0.01');
        setJoinTargetAddress('');
        setSelectedJoinAction('joinLotto');
        setSelectedJoinEntryFee(BigInt(0));
        setSelectedJoinEntryToken('');
        setStatus('Web3Auth session has been reset.');
    }, [account, draft, lottoReads, session, signSend, tokenReads]);

    const joinTargetSummary = useMemo(() => {
        if (mode !== 'join') return undefined;
        if (joinSummaryOverride?.address?.toLowerCase() === joinTargetAddress.toLowerCase()) {
            return joinSummaryOverride;
        }
        return findLottoSummary(lottoReads.lottoInstances, joinTargetAddress);
    }, [joinSummaryOverride, joinTargetAddress, lottoReads.lottoInstances, mode]);

    const hasSufficientJoinAllowance = useMemo(() => {
        if (mode !== 'join') return true;
        if (!(selectedJoinEntryFee > BigInt(0))) return false;
        if (tokenReads.joinEntryAllowance === null) return false;
        return tokenReads.joinEntryAllowance >= selectedJoinEntryFee;
    }, [mode, selectedJoinEntryFee, tokenReads.joinEntryAllowance]);

    const joinSignStateOk = useMemo(() => {
        if (mode !== 'join') return true;
        if (!joinActionAllowedByState(selectedJoinAction, joinTargetSummary, account.accountAddress).ok) {
            return false;
        }
        if (selectedJoinAction === 'joinLotto' && !hasSufficientJoinAllowance) return false;
        return true;
    }, [account.accountAddress, hasSufficientJoinAllowance, joinTargetSummary, mode, selectedJoinAction]);

    const getPreviewUserOpForJoinAction = useCallback(
        (action: AAJoinAction) => {
            const preview = draft.getPreviewUserOpForJoinAction(action, {
                joinTargetAddress,
                selectedJoinEntryFee,
                selectedJoinEntryToken,
            });
            if (gasEstimateMode !== 'manual') {
                return preview;
            }
            const actionGas = getGasForAction(action);
            const hasGas =
                actionGas.accountGasLimits !==
                '0x0000000000000000000000000000000000000000000000000000000000000000';
            return hasGas ? { ...preview, ...actionGas, signature: '0x' } : preview;
        },
        [draft, gasEstimateMode, getGasForAction, joinTargetAddress, selectedJoinEntryFee, selectedJoinEntryToken]
    );

    return {
        sessionToken: session.sessionToken,
        AAAccountHydrated: account.AAAccountHydrated,
        joinSignStateOk,
        email: session.email,
        ownerAddress: account.ownerAddress,
        accountAddress: account.accountAddress,
        salt: account.salt,
        status,
        isLoading,
        isEstimatingGas,
        gasEstimateReady,
        gasEstimateError,
        gasEstimateMode,
        estimateForAction,
        isGasReadyForAction,
        getGasForAction,
        getEstimateErrorForAction,
        isEstimatingAction,
        signResultHash: signSend.signResultHash,
        bundlerResultHash: signSend.bundlerResultHash,
        letBalance: tokenReads.letBalance,
        joinEntryAllowance: tokenReads.joinEntryAllowance,
        hasSufficientJoinAllowance,
        accountDeployed: account.accountDeployed,
        userOp: draft.userOp,
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
        setSelectedJoinAction,
        lottoInstances: lottoReads.lottoInstances,
        isLoadingLottoInstances: lottoReads.isLoadingLottoInstances,
        lottoInstancesError: lottoReads.lottoInstancesError,
        fetchLottoInstances: lottoReads.fetchLottoInstances,
        handleSelectJoinTarget,
        handleEstimateJoinAction,
        handleEstimateCurrentUserOp,
        handleUserOpFieldChange: draft.handleUserOpFieldChange,
        handleSignUserOp: signSend.handleSignUserOp,
        handleSignUserOpForJoinAction: signSend.handleSignUserOpForJoinAction,
        handleSendUserOp: signSend.handleSendUserOp,
        handleExecuteUserOp: signSend.handleExecuteUserOp,
        getPreviewUserOpForJoinAction,
        handleWeb3AuthLogin,
        handleRefresh,
        handleLogout,
    };
}
