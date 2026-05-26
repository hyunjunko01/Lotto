'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createWalletClient, custom, isAddress } from 'viem';
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
}: UseAALotteryProps) {
    const [status, setStatus] = useState('Log in with Web3Auth to create or load your AA account.');
    const [isLoading, setIsLoading] = useState(false);
    const workflow = useMemo(
        () => ({ status, setStatus, isLoading, setIsLoading }),
        [status, isLoading]
    );

    const session = useAASession();
    const account = useAAAccount();

    const [entryFeeEth, setEntryFeeEth] = useState('0.01');
    const [maxPlayers, setMaxPlayers] = useState('5');
    const [joinValueEth, setJoinValueEth] = useState('0.01');
    const [joinTargetAddress, setJoinTargetAddress] = useState(initialJoinTargetAddress ?? '');
    const [selectedJoinAction, setSelectedJoinAction] = useState<AAJoinAction>('joinLotto');
    const [selectedJoinEntryFee, setSelectedJoinEntryFee] = useState<bigint>(BigInt(0));
    const [selectedJoinEntryToken, setSelectedJoinEntryToken] = useState('');

    const lottoReads = useAALottoInstances(lottoFactoryAddress, { enabled: mode === 'join' });
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

    const gas = useAAUserOpGas(mode, selectedJoinAction);
    const draft = useAAUserOpDraft({
        accountAddress: account.accountAddress,
        accountNonce: account.accountNonce,
        initCode,
        callData,
        gas,
    });

    const signSend = useAAUserOpSignSend({
        workflow,
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
        lottoInstances: lottoReads.lottoInstances,
        fetchLetBalance: tokenReads.fetchLetBalance,
        fetchJoinAllowance: tokenReads.fetchJoinAllowance,
    });

    useEffect(() => {
        if (session.sessionToken && !account.AAAccountHydrated) {
            setStatus('An existing session was found. Use Refresh Account State to load your account.');
        }
    }, [account.AAAccountHydrated, session.sessionToken]);

    useEffect(() => {
        if (!session.sessionToken || !account.accountAddress) return;
        void account.fetchAccountNonce(account.accountAddress).catch((error) => {
            console.error('Failed to refresh account nonce:', error);
        });
    }, [account.accountAddress, account.fetchAccountNonce, session.sessionToken]);

    const handleSelectJoinTarget = useCallback((address: string, entryFeeWei?: bigint, entryToken?: string) => {
        setJoinTargetAddress(address);
        setSelectedJoinEntryFee(entryFeeWei ?? BigInt(0));
        setSelectedJoinEntryToken(entryToken ?? '');
    }, []);

    const hydrateAAAccount = useCallback(
        async (owner: string) => {
            const nextAccountAddress = await account.fetchAAAccount(owner);
            await account.fetchAccountNonce(nextAccountAddress);
            if (mode === 'join') {
                await lottoReads.fetchLottoInstances();
            }
            account.setAAAccountHydrated(true);
        },
        [account, lottoReads, mode]
    );

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
        account.resetAAAccount();
        draft.resetUserOpDraft();
        signSend.resetSignSend();
        tokenReads.resetTokenReads();
        lottoReads.resetLottoInstances();
        setEntryFeeEth('0.01');
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
        return findLottoSummary(lottoReads.lottoInstances, joinTargetAddress);
    }, [joinTargetAddress, lottoReads.lottoInstances, mode]);

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
        (action: AAJoinAction) =>
            draft.getPreviewUserOpForJoinAction(action, {
                joinTargetAddress,
                selectedJoinEntryFee,
                selectedJoinEntryToken,
            }),
        [draft, joinTargetAddress, selectedJoinEntryFee, selectedJoinEntryToken]
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
        handleUserOpFieldChange: draft.handleUserOpFieldChange,
        handleSignUserOp: signSend.handleSignUserOp,
        handleSignUserOpForJoinAction: signSend.handleSignUserOpForJoinAction,
        handleSendUserOp: signSend.handleSendUserOp,
        getPreviewUserOpForJoinAction,
        handleWeb3AuthLogin,
        handleRefresh,
        handleLogout,
    };
}
