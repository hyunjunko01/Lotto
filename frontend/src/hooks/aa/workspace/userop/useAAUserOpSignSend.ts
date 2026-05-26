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
import { accountGasLimitsForJoinAction } from '@/lib/aa/userop/packing';
import { targetChain } from '@/lib/targetNetwork';

type UseAAUserOpSignSendParams = {
    workflow: AAWorkflowStatus;
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
};

export function useAAUserOpSignSend({
    workflow,
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
}: UseAAUserOpSignSendParams) {
    const { setStatus, setIsLoading } = workflow;
    const [signResultHash, setSignResultHash] = useState('');
    const [bundlerResultHash, setBundlerResultHash] = useState('');

    useEffect(() => {
        if (!userOp.signature || userOp.signature === '0x') {
            setSignResultHash('');
        }
    }, [userOp.signature]);

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

        if (mode === 'join' && !validateJoinSign(selectedJoinAction)) {
            return;
        }

        try {
            setIsLoading(true);
            setStatus('Requesting UserOperation signature...');
            setBundlerResultHash('');
            const latestNonce = await fetchAccountNonce(userOp.sender);
            const userOpToSign = {
                ...userOp,
                nonce: latestNonce.toString(),
                ...(mode === 'join' ? { accountGasLimits: accountGasLimitsForJoinAction(selectedJoinAction) } : {}),
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
        mode,
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
            setAccountNonce((prev) => prev + BigInt(1));
            setStatus('UserOperation sent successfully.');
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
                accountGasLimits: accountGasLimitsForJoinAction(action),
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

            if (!validateJoinSign(action)) {
                return;
            }

            try {
                setIsLoading(true);
                setStatus('Requesting UserOperation signature...');
                setBundlerResultHash('');
                const latestNonce = await fetchAccountNonce(preparedUserOp.sender);
                const userOpToSign = {
                    ...preparedUserOp,
                    nonce: latestNonce.toString(),
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
            joinTargetAddress,
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
