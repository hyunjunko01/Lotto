'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { IProvider } from '@web3auth/base';
import { isAddress } from 'viem';
import { buildJoinActionCallData } from '@/lib/aa/call-data';
import { AA_JOIN_ACTIONS } from '@/lib/aa/constants';
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

function emptyActionGasMap(): Partial<Record<AAJoinAction, UserOpGasEstimate>> {
    return {};
}

function emptyActionErrorMap(): Partial<Record<AAJoinAction, string>> {
    return {};
}

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

    const estimateRequestGas = useMemo(
        () => createEstimateRequestGas(mode, paymasterAddress, selectedJoinAction),
        [mode, paymasterAddress, selectedJoinAction]
    );

    const [bundlerGas, setBundlerGas] = useState<UserOpGasEstimate | null>(null);
    const [isEstimating, setIsEstimating] = useState(false);
    const [estimateError, setEstimateError] = useState<string | null>(null);

    const [gasByAction, setGasByAction] = useState<Partial<Record<AAJoinAction, UserOpGasEstimate>>>(
        emptyActionGasMap
    );
    const [errorByAction, setErrorByAction] = useState<Partial<Record<AAJoinAction, string>>>(emptyActionErrorMap);
    const [estimatingAction, setEstimatingAction] = useState<AAJoinAction | null>(null);

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

            const hashAnchorGas = createEstimateRequestGas(mode, paymasterAddress, action);
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
        setGasByAction(emptyActionGasMap());
        setErrorByAction(emptyActionErrorMap());
        setEstimatingAction(null);
    }, []);

    useEffect(() => {
        if (!manualMode) {
            return;
        }
        clearManualEstimates();
    }, [clearManualEstimates, manualMode, nonce, joinTargetAddress, selectedJoinEntryFee, selectedJoinEntryToken]);

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

            setEstimatingAction(action);
            setErrorByAction((prev) => {
                const next = { ...prev };
                delete next[action];
                return next;
            });

            try {
                const result = await runEstimate(action, actionCallData);
                setGasByAction((prev) => ({ ...prev, [action]: result }));
                return result;
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to estimate UserOp gas.';
                setErrorByAction((prev) => ({ ...prev, [action]: message }));
                setGasByAction((prev) => {
                    const next = { ...prev };
                    delete next[action];
                    return next;
                });
                throw new Error(message);
            } finally {
                setEstimatingAction(null);
            }
        },
        [ownerAddress, resolveCallDataForAction, runEstimate, sender, web3Provider]
    );

    const isGasReadyForAction = useCallback(
        (action: AAJoinAction) => {
            if (manualMode) {
                return Boolean(gasByAction[action]) && !errorByAction[action] && estimatingAction !== action;
            }
            return canEstimate && bundlerGas !== null && !estimateError && !isEstimating;
        },
        [manualMode, gasByAction, errorByAction, estimatingAction, canEstimate, bundlerGas, estimateError, isEstimating]
    );

    const getGasForAction = useCallback(
        (action: AAJoinAction): UserOpGasEstimate => {
            if (manualMode) {
                return gasByAction[action] ?? EMPTY_USER_OP_GAS;
            }
            return bundlerGas ?? EMPTY_USER_OP_GAS;
        },
        [manualMode, gasByAction, bundlerGas]
    );

    const getEstimateErrorForAction = useCallback(
        (action: AAJoinAction): string | null => {
            if (manualMode) {
                return errorByAction[action] ?? null;
            }
            return estimateError;
        },
        [manualMode, errorByAction, estimateError]
    );

    const isEstimatingAction = useCallback(
        (action: AAJoinAction) => {
            if (manualMode) {
                return estimatingAction === action;
            }
            return isEstimating;
        },
        [manualMode, estimatingAction, isEstimating]
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
        gasByAction,
        estimateForAction,
        isGasReadyForAction,
        getGasForAction,
        getEstimateErrorForAction,
        isEstimatingAction,
        clearManualEstimates,
        useStaticEstimator,
        /** All join actions (manual mode UI). */
        joinActions: AA_JOIN_ACTIONS,
    };
}
