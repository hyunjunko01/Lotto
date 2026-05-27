'use client';

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import {
    createWalletClient,
    custom,
    hashMessage,
    isAddress,
    recoverAddress,
    type Hex,
} from 'viem';
import type { IProvider } from '@web3auth/base';
import { buildJoinActionCallData } from '@/lib/aa/call-data';
import { joinActionAllowedByState } from '@/lib/aa/join/actionGuards';
import { findLottoSummary } from '@/lib/aa/join/lottoSummary';
import type {
    AAJoinAction,
    AALotteryMode,
    AALottoSummary,
    AASendUserOpResponse,
    AAWorkflowStatus,
    UserOpFields,
} from '@/lib/aa/types';
import { fetchUserOpGasEstimate } from '@/lib/aa/userop/gas/fetchUserOpGasEstimate';
import { createEstimateRequestGas } from '@/lib/aa/userop/gas/hashAnchorGas';
import { signUserOpHashForEstimate } from '@/lib/aa/userop/gas/signEstimateUserOp';
import type { UserOpGasEstimate } from '@/lib/aa/userop/gas/types';
import { waitForUserOpReceipt } from '@/lib/aa/userop/waitForUserOpReceipt';
import { targetChain } from '@/lib/targetNetwork';

type UseAAUserOpSignSendParams = {
    workflow: AAWorkflowStatus;
    gasEstimateReady: boolean;
    /** When set (join manual mode), Sign checks readiness per action instead of global gasEstimateReady. */
    isGasEstimateReadyForAction?: (action: AAJoinAction) => boolean;
    mode: AALotteryMode;
    sessionToken: string;
    web3Provider: IProvider | null;
    ownerAddress: string;
    accountAddress: string;
    userOp: UserOpFields;
    setUserOp: Dispatch<SetStateAction<UserOpFields>>;
    setAccountNonce: Dispatch<SetStateAction<bigint>>;
    fetchAccountNonce: (sender: string) => Promise<bigint>;
    selectedJoinAction: AAJoinAction;
    setSelectedJoinAction: (action: AAJoinAction) => void;
    joinTargetAddress: string;
    selectedJoinEntryFee: bigint;
    selectedJoinEntryToken: string;
    letBalance: bigint | null;
    joinEntryAllowance: bigint | null;
    lottoInstances: AALottoSummary[];
    fetchLetBalance: () => Promise<void>;
    fetchJoinAllowance: () => Promise<void>;
    fetchLottoInstances?: () => Promise<void>;
};

export function useAAUserOpSignSend({
    workflow,
    gasEstimateReady,
    isGasEstimateReadyForAction,
    mode,
    sessionToken,
    web3Provider,
    ownerAddress,
    accountAddress,
    userOp,
    setUserOp,
    setAccountNonce,
    fetchAccountNonce,
    selectedJoinAction,
    setSelectedJoinAction,
    joinTargetAddress,
    selectedJoinEntryFee,
    selectedJoinEntryToken,
    letBalance,
    joinEntryAllowance,
    lottoInstances,
    fetchLetBalance,
    fetchJoinAllowance,
    fetchLottoInstances,
}: UseAAUserOpSignSendParams) {
    const { setStatus, setIsLoading } = workflow;
    const [signResultHash, setSignResultHash] = useState('');
    const [bundlerResultHash, setBundlerResultHash] = useState('');

    useEffect(() => {
        if (!userOp.signature || userOp.signature === '0x') {
            setSignResultHash('');
        }
    }, [userOp.signature]);

    const refreshGasFields = useCallback(
        async (draft: UserOpFields, action: AAJoinAction): Promise<UserOpGasEstimate> => {
            if (!web3Provider || !ownerAddress || !isAddress(ownerAddress)) {
                throw new Error('Connect Web3Auth and wait for bundler gas estimation before signing.');
            }

            if (!gasEstimateReady) {
                throw new Error('Bundler gas estimate is not ready. Fix estimation errors, then try again.');
            }

            try {
                const estimateRequestGas = createEstimateRequestGas(
                    mode,
                    process.env.NEXT_PUBLIC_PAYMASTER_ADDRESS,
                    action
                );
                const signature = await signUserOpHashForEstimate(
                    web3Provider,
                    ownerAddress as `0x${string}`,
                    {
                        sender: draft.sender,
                        nonce: draft.nonce,
                        initCode: draft.initCode as `0x${string}`,
                        callData: draft.callData,
                        gas: estimateRequestGas,
                    }
                );

                return await fetchUserOpGasEstimate({
                    mode,
                    selectedJoinAction: action,
                    paymasterAddress: process.env.NEXT_PUBLIC_PAYMASTER_ADDRESS,
                    sender: draft.sender,
                    nonce: draft.nonce,
                    initCode: draft.initCode as `0x${string}`,
                    callData: draft.callData,
                    signature,
                    hashAnchorGas: estimateRequestGas,
                });
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : 'Failed to re-estimate UserOp gas before signing.';
                throw new Error(message);
            }
        },
        [gasEstimateReady, mode, ownerAddress, web3Provider]
    );

    const signUserOperationLocally = useCallback(
        async (nextUserOp: UserOpFields): Promise<{ signedUserOp: UserOpFields; userOpHash: string }> => {
            if (!web3Provider || !ownerAddress || !isAddress(ownerAddress)) {
                throw new Error('Connect Web3Auth first.');
            }

            const hashResponse = await fetch('/api/aa/userop/hash', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    userOp: {
                        sender: nextUserOp.sender,
                        nonce: nextUserOp.nonce,
                        initCode: nextUserOp.initCode,
                        callData: nextUserOp.callData,
                        accountGasLimits: nextUserOp.accountGasLimits,
                        preVerificationGas: nextUserOp.preVerificationGas,
                        gasFees: nextUserOp.gasFees,
                        paymasterAndData: nextUserOp.paymasterAndData,
                        signature: '0x',
                    },
                }),
            });
            const hashJson = (await hashResponse.json()) as { ok?: boolean; userOpHash?: string; error?: string };
            if (!hashResponse.ok || !hashJson.ok || !hashJson.userOpHash) {
                throw new Error(hashJson.error ?? 'Failed to compute userOp hash (server).');
            }
            const userOpHash = hashJson.userOpHash as Hex;

            const walletClient = createWalletClient({
                chain: targetChain,
                transport: custom(web3Provider),
                account: ownerAddress as `0x${string}`,
            });

            const signature = await walletClient.signMessage({
                account: ownerAddress as `0x${string}`,
                message: { raw: userOpHash },
            });

            const eip191Digest = hashMessage({ raw: userOpHash });
            const recovered = await recoverAddress({ hash: eip191Digest, signature });
            if (recovered.toLowerCase() !== ownerAddress.toLowerCase()) {
                throw new Error(
                    `Signature does not match AA owner (recovered ${recovered}, owner ${ownerAddress}). Reconnect Web3Auth and try again.`
                );
            }

            return {
                userOpHash,
                signedUserOp: {
                    ...nextUserOp,
                    signature,
                },
            };
        },
        [ownerAddress, web3Provider]
    );

    const validateJoinSign = useCallback(
        (action: AAJoinAction): boolean => {
            const needsLet = action === 'approveEntryFee' || action === 'joinLotto';
            if (
                needsLet &&
                letBalance !== null &&
                selectedJoinEntryFee > BigInt(0) &&
                letBalance < selectedJoinEntryFee
            ) {
                setStatus('Not enough LET balance for this entry fee. Use the AA token faucet page first.');
                return false;
            }

            const joinSummary = findLottoSummary(lottoInstances, joinTargetAddress);
            const stateGate = joinActionAllowedByState(action, joinSummary, accountAddress);
            if (!stateGate.ok) {
                setStatus(stateGate.message);
                return false;
            }

            if (
                action === 'joinLotto' &&
                selectedJoinEntryFee > BigInt(0) &&
                (joinEntryAllowance === null || joinEntryAllowance < selectedJoinEntryFee)
            ) {
                setStatus('Approve entry fee first: sign and send approveEntryFee, then try joinLotto again.');
                return false;
            }

            return true;
        },
        [
            accountAddress,
            joinEntryAllowance,
            joinTargetAddress,
            letBalance,
            lottoInstances,
            selectedJoinEntryFee,
            setStatus,
        ]
    );

    const handleSignUserOp = useCallback(async () => {
        if (!sessionToken) {
            setStatus('Please log in with Web3Auth first.');
            return;
        }

        if (!userOp.sender) {
            setStatus('The sender address is required.');
            return;
        }

        if (!gasEstimateReady) {
            setStatus('Bundler gas estimate is required before signing. Wait for estimation or fix errors above.');
            return;
        }

        if (mode === 'join' && !validateJoinSign(selectedJoinAction)) {
            return;
        }

        try {
            setIsLoading(true);
            setStatus('Requesting UserOperation signature...');
            setBundlerResultHash('');
            const latestNonce = await fetchAccountNonce(userOp.sender);
            const gas = await refreshGasFields(
                { ...userOp, nonce: latestNonce.toString() },
                selectedJoinAction
            );
            const userOpToSign = {
                ...userOp,
                nonce: latestNonce.toString(),
                ...gas,
            };
            setUserOp(userOpToSign);

            const signed = await signUserOperationLocally(userOpToSign);
            setUserOp(signed.signedUserOp);
            setSignResultHash(signed.userOpHash);
            setStatus('UserOperation signature completed.');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to sign user operation.';
            setStatus(`Error: ${message}`);
        } finally {
            setIsLoading(false);
        }
    }, [
        fetchAccountNonce,
        gasEstimateReady,
        mode,
        refreshGasFields,
        selectedJoinAction,
        sessionToken,
        setIsLoading,
        setStatus,
        setUserOp,
        signUserOperationLocally,
        userOp,
        validateJoinSign,
    ]);

    const handleSendUserOp = useCallback(async () => {
        if (!sessionToken) {
            setStatus('Please log in with Web3Auth first.');
            return;
        }

        if (!userOp.signature || userOp.signature === '0x') {
            setStatus('Please sign the UserOperation first.');
            return;
        }

        const sendGasReady = isGasEstimateReadyForAction
            ? isGasEstimateReadyForAction(selectedJoinAction)
            : gasEstimateReady;
        if (!sendGasReady) {
            setStatus(
                isGasEstimateReadyForAction
                    ? 'Estimate gas for this action before sending.'
                    : 'Bundler gas estimate is required before sending. Re-sign after estimation succeeds.'
            );
            return;
        }

        if (userOp.accountGasLimits === '0x0000000000000000000000000000000000000000000000000000000000000000') {
            setStatus('UserOp gas limits are missing. Wait for bundler gas estimation, then sign again.');
            return;
        }

        try {
            setIsLoading(true);
            setStatus('Sending UserOperation to the bundler...');

            const latestNonce = await fetchAccountNonce(userOp.sender);
            if (latestNonce !== BigInt(userOp.nonce)) {
                setStatus(
                    `On-chain nonce changed (${userOp.nonce} -> ${latestNonce}). Re-sign the UserOperation, then send again.`
                );
                return;
            }

            const response = await fetch('/api/aa/userop/send', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    userOp,
                    ...(signResultHash && /^0x[0-9a-fA-F]{64}$/i.test(signResultHash)
                        ? { clientUserOpHash: signResultHash }
                        : {}),
                }),
            });

            const json = (await response.json()) as AASendUserOpResponse;
            if (!response.ok || !json.ok || !json.userOpHash) {
                const detail =
                    json.serverUserOpHash && json.clientUserOpHash
                        ? ` (client ${json.clientUserOpHash.slice(0, 12)}… vs server ${json.serverUserOpHash.slice(0, 12)}…)`
                        : '';
                throw new Error((json.error ?? 'Failed to send user operation.') + detail);
            }

            setBundlerResultHash(json.userOpHash);
            setStatus('Bundler accepted the UserOperation. Waiting for on-chain inclusion...');

            const receipt = await waitForUserOpReceipt(json.userOpHash);

            if (receipt.status === 'failed') {
                throw new Error(
                    receipt.reason
                        ? `UserOperation reverted on-chain: ${receipt.reason}`
                        : 'UserOperation failed on-chain.'
                );
            }

            if (receipt.status === 'rpc-error') {
                throw new Error(receipt.reason ?? 'Failed to confirm UserOperation on-chain.');
            }

            if (receipt.status === 'pending') {
                setStatus(
                    `Bundler accepted (userOpHash ${json.userOpHash.slice(0, 10)}…) but it is still pending. ` +
                        'Nonce and factory state update only after inclusion. Check again in a minute or on the block explorer.'
                );
                return;
            }

            await fetchAccountNonce(userOp.sender);

            if (mode === 'create' && fetchLottoInstances) {
                await fetchLottoInstances();
            }

            const txHint = receipt.transactionHash
                ? ` Tx: ${receipt.transactionHash.slice(0, 10)}…`
                : '';
            setStatus(`UserOperation included on-chain.${txHint}`);
            await fetchLetBalance();
            if (mode === 'join') {
                await fetchJoinAllowance();
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to send user operation.';
            setStatus(`Error: ${message}`);
        } finally {
            setIsLoading(false);
        }
    }, [
        fetchAccountNonce,
        fetchJoinAllowance,
        fetchLetBalance,
        fetchLottoInstances,
        gasEstimateReady,
        isGasEstimateReadyForAction,
        mode,
        sessionToken,
        setAccountNonce,
        setIsLoading,
        setStatus,
        signResultHash,
        userOp,
    ]);

    const handleSignUserOpForJoinAction = useCallback(
        async (action: AAJoinAction) => {
            setSelectedJoinAction(action);
            const preparedUserOp = {
                ...userOp,
                callData:
                    buildJoinActionCallData({
                        action,
                        joinTargetAddress,
                        selectedJoinEntryFee,
                        selectedJoinEntryToken,
                    }) || '0x',
                signature: '0x',
            };
            setUserOp(preparedUserOp);

            if (!sessionToken) {
                setStatus('Please log in with Web3Auth first.');
                return;
            }

            if (!preparedUserOp.sender) {
                setStatus('The sender address is required.');
                return;
            }

            const gasReady = isGasEstimateReadyForAction
                ? isGasEstimateReadyForAction(action)
                : gasEstimateReady;
            if (!gasReady) {
                setStatus(
                    'Estimate gas for this action first (Estimate Gas), then sign. Fix any estimation errors shown on the card.'
                );
                return;
            }

            if (!validateJoinSign(action)) {
                return;
            }

            try {
                setIsLoading(true);
                setStatus('Requesting UserOperation signature...');
                setBundlerResultHash('');
                const latestNonce = await fetchAccountNonce(preparedUserOp.sender);
                const gas = await refreshGasFields(
                    { ...preparedUserOp, nonce: latestNonce.toString() },
                    action
                );
                const userOpToSign = {
                    ...preparedUserOp,
                    nonce: latestNonce.toString(),
                    ...gas,
                };
                setUserOp(userOpToSign);
                const signed = await signUserOperationLocally(userOpToSign);
                setUserOp(signed.signedUserOp);
                setSignResultHash(signed.userOpHash);
                setStatus('UserOperation signature completed.');
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to sign user operation.';
                setStatus(`Error: ${message}`);
            } finally {
                setIsLoading(false);
            }
        },
        [
            fetchAccountNonce,
            gasEstimateReady,
            isGasEstimateReadyForAction,
            joinTargetAddress,
            refreshGasFields,
            selectedJoinEntryFee,
            selectedJoinEntryToken,
            sessionToken,
            setIsLoading,
            setSelectedJoinAction,
            setStatus,
            setUserOp,
            signUserOperationLocally,
            userOp,
            validateJoinSign,
        ]
    );

    const resetSignSend = useCallback(() => {
        setSignResultHash('');
        setBundlerResultHash('');
    }, []);

    return {
        signResultHash,
        bundlerResultHash,
        handleSignUserOp,
        handleSendUserOp,
        handleSignUserOpForJoinAction,
        resetSignSend,
    };
}
