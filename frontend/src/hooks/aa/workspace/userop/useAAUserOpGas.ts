'use client';

import { useCallback, useEffect, useState } from 'react';
import type { IProvider } from '@web3auth/base';
import { isAddress } from 'viem';
import { buildJoinActionCallData } from '@/lib/aa/call-data';
import type { AAGasEstimateMode, AALotteryMode, AAJoinAction } from '@/lib/aa/types';
import { getAAGasEstimator, isStaticGasEstimator } from '@/lib/aa/userop/gas/getAAGasEstimator';
import { createEstimateRequestGas } from '@/lib/aa/userop/gas/hashAnchorGas';
import { signUserOpHashForEstimate } from '@/lib/aa/userop/gas/signEstimateUserOp';
import { EMPTY_USER_OP_GAS, type UserOpGasEstimate } from '@/lib/aa/userop/gas/types';

type UseAAUserOpGasParams = {
    mode: AALotteryMode;
    selectedJoinAction: AAJoinAction;
    sender: string;
    ownerAddress: string;
    web3Provider: IProvider | null;
    nonce: bigint;
    initCode: `0x${string}`;
    callData: string;
    gasEstimateMode?: AAGasEstimateMode;
    joinTargetAddress?: string;
    selectedJoinEntryFee?: bigint;
    selectedJoinEntryToken?: string;
};

export function useAAUserOpGas({
    mode,
    selectedJoinAction,
    sender,
    ownerAddress,
    web3Provider,
    nonce,
    initCode,
    callData,
    gasEstimateMode = 'auto',
    joinTargetAddress = '',
    selectedJoinEntryFee = BigInt(0),
    selectedJoinEntryToken = '',
}: UseAAUserOpGasParams) {
    const paymasterAddress = process.env.NEXT_PUBLIC_PAYMASTER_ADDRESS;
    const useStaticEstimator = isStaticGasEstimator();
    const manualMode = gasEstimateMode === 'manual';

    const [bundlerGas, setBundlerGas] = useState<UserOpGasEstimate | null>(null);
    const [isEstimating, setIsEstimating] = useState(false);
    const [estimateError, setEstimateError] = useState<string | null>(null);

    const canEstimate = Boolean(
        sender &&
        isAddress(sender) &&
        ownerAddress &&
        isAddress(ownerAddress) &&
        web3Provider &&
        callData &&
        callData !== '0x'
    );

    const resolveCallDataForAction = useCallback(
        (action: AAJoinAction): string => {
            if (mode === 'join') {
                return (
                    buildJoinActionCallData({
                        action,
                        joinTargetAddress,
                        selectedJoinEntryFee,
                        selectedJoinEntryToken,
                    }) || ''
                );
            }
            return callData;
        },
        [callData, joinTargetAddress, mode, selectedJoinEntryFee, selectedJoinEntryToken]
    );

    const runEstimate = useCallback(
        async (action: AAJoinAction, actionCallData: string): Promise<UserOpGasEstimate> => {
            if (!web3Provider || !ownerAddress || !isAddress(ownerAddress)) {
                throw new Error('Connect Web3Auth before estimating UserOp gas.');
            }
            if (!actionCallData || actionCallData === '0x') {
                throw new Error('UserOp callData is missing for this action.');
            }

            const hashAnchorGas = createEstimateRequestGas(mode, paymasterAddress, action, initCode);
            const estimatorParams = {
                mode,
                selectedJoinAction: action,
                paymasterAddress,
                sender,
                nonce,
                initCode,
                callData: actionCallData,
            };

            if (useStaticEstimator) {
                return getAAGasEstimator().estimate(estimatorParams);
            }

            const signature = await signUserOpHashForEstimate(web3Provider, ownerAddress as `0x${string}`, {
                sender,
                nonce,
                initCode,
                callData: actionCallData,
                gas: hashAnchorGas,
            });

            return getAAGasEstimator().estimate({
                ...estimatorParams,
                signature,
                hashAnchorGas,
            });
        },
        [initCode, mode, nonce, ownerAddress, paymasterAddress, sender, useStaticEstimator, web3Provider]
    );

    const clearManualEstimates = useCallback(() => {
        setBundlerGas(null);
        setEstimateError(null);
        setIsEstimating(false);
    }, []);

    useEffect(() => {
        if (!manualMode) {
            return;
        }
        clearManualEstimates();
    }, [
        callData,
        clearManualEstimates,
        manualMode,
        nonce,
        selectedJoinAction,
        joinTargetAddress,
        selectedJoinEntryFee,
        selectedJoinEntryToken,
    ]);

    useEffect(() => {
        if (manualMode || !canEstimate) {
            if (!manualMode && !canEstimate) {
                setBundlerGas(null);
                setEstimateError(null);
                setIsEstimating(false);
            }
            return;
        }

        const controller = new AbortController();
        const timer = setTimeout(() => {
            void (async () => {
                setIsEstimating(true);
                setEstimateError(null);
                setBundlerGas(null);
                try {
                    const result = await runEstimate(selectedJoinAction, callData);
                    if (!controller.signal.aborted) {
                        setBundlerGas(result);
                    }
                } catch (error) {
                    if (!controller.signal.aborted) {
                        const message =
                            error instanceof Error ? error.message : 'Failed to estimate UserOp gas.';
                        setEstimateError(message);
                        setBundlerGas(null);
                    }
                } finally {
                    if (!controller.signal.aborted) {
                        setIsEstimating(false);
                    }
                }
            })();
        }, 350);

        return () => {
            controller.abort();
            clearTimeout(timer);
        };
    }, [callData, canEstimate, manualMode, runEstimate, selectedJoinAction]);

    const estimateForAction = useCallback(
        async (action: AAJoinAction) => {
            const actionCallData = resolveCallDataForAction(action);
            const canEstimateAction = Boolean(
                sender &&
                isAddress(sender) &&
                ownerAddress &&
                isAddress(ownerAddress) &&
                web3Provider &&
                actionCallData &&
                actionCallData !== '0x'
            );

            if (!canEstimateAction) {
                throw new Error('Connect Web3Auth and load the AA account before estimating gas.');
            }
            setIsEstimating(true);
            setEstimateError(null);
            setBundlerGas(null);

            try {
                const result = await runEstimate(action, actionCallData);
                setBundlerGas(result);
                return result;
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to estimate UserOp gas.';
                setEstimateError(message);
                setBundlerGas(null);
                throw new Error(message);
            } finally {
                setIsEstimating(false);
            }
        },
        [ownerAddress, resolveCallDataForAction, runEstimate, sender, web3Provider]
    );

    const isGasReadyForAction = useCallback(
        (action: AAJoinAction) => {
            if (manualMode) {
                return (
                    action === selectedJoinAction &&
                    canEstimate &&
                    bundlerGas !== null &&
                    !estimateError &&
                    !isEstimating
                );
            }
            return canEstimate && bundlerGas !== null && !estimateError && !isEstimating;
        },
        [manualMode, selectedJoinAction, canEstimate, bundlerGas, estimateError, isEstimating]
    );

    const getGasForAction = useCallback(
        (action: AAJoinAction): UserOpGasEstimate => {
            if (manualMode) {
                if (action !== selectedJoinAction) {
                    return EMPTY_USER_OP_GAS;
                }
                return bundlerGas ?? EMPTY_USER_OP_GAS;
            }
            return bundlerGas ?? EMPTY_USER_OP_GAS;
        },
        [manualMode, selectedJoinAction, bundlerGas]
    );

    const getEstimateErrorForAction = useCallback(
        (action: AAJoinAction): string | null => {
            if (manualMode) {
                return action === selectedJoinAction ? estimateError : null;
            }
            return estimateError;
        },
        [manualMode, selectedJoinAction, estimateError]
    );

    const isEstimatingAction = useCallback(
        (action: AAJoinAction) => {
            if (manualMode) {
                return action === selectedJoinAction && isEstimating;
            }
            return isEstimating;
        },
        [manualMode, selectedJoinAction, isEstimating]
    );

    const gasEstimateReady = manualMode
        ? isGasReadyForAction(selectedJoinAction)
        : canEstimate && bundlerGas !== null && !estimateError && !isEstimating;

    const activeGas = manualMode ? getGasForAction(selectedJoinAction) : bundlerGas ?? EMPTY_USER_OP_GAS;

    return {
        gas: activeGas,
        gasEstimateReady,
        isEstimating,
        estimateError,
        gasEstimateMode,
        estimateForAction,
        isGasReadyForAction,
        getGasForAction,
        getEstimateErrorForAction,
        isEstimatingAction,
        clearManualEstimates,
        useStaticEstimator,
    };
}
