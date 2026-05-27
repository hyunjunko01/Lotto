'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildJoinActionCallData } from '@/lib/aa/call-data';
import { EMPTY_USER_OP } from '@/lib/aa/constants';
import type { AAJoinAction, UserOpFields } from '@/lib/aa/types';
import type { UserOpGasEstimate } from '@/lib/aa/userop/gas/types';
type UseAAUserOpDraftParams = {
    accountAddress: string;
    accountNonce: bigint;
    initCode: `0x${string}`;
    callData: string;
    gas: UserOpGasEstimate;
};

export function useAAUserOpDraft({ accountAddress, accountNonce, initCode, callData, gas }: UseAAUserOpDraftParams) {
    const [userOp, setUserOp] = useState<UserOpFields>(EMPTY_USER_OP);

    const computedNonce = useMemo(() => accountNonce.toString(), [accountNonce]);

    useEffect(() => {
        setUserOp((prev) => {
            const computedSender = accountAddress || '';
            const computed = {
                sender: computedSender || prev.sender,
                nonce: computedNonce,
                initCode,
                callData: callData || '0x',
                accountGasLimits: gas.accountGasLimits,
                preVerificationGas: gas.preVerificationGas,
                gasFees: gas.gasFees,
                paymasterAndData: gas.paymasterAndData,
            };

            const hasSig = Boolean(prev.signature && prev.signature !== '0x');
            const senderAligned =
                !computedSender || !prev.sender || prev.sender.toLowerCase() === computedSender.toLowerCase();
            const hashInputsEqual =
                senderAligned &&
                prev.nonce === computed.nonce &&
                prev.initCode === computed.initCode &&
                prev.callData === computed.callData &&
                prev.accountGasLimits === computed.accountGasLimits &&
                prev.preVerificationGas === computed.preVerificationGas &&
                prev.gasFees === computed.gasFees &&
                prev.paymasterAndData === computed.paymasterAndData;

            if (hasSig && !hashInputsEqual) {
                return { ...prev, ...computed, signature: '0x' };
            }

            return { ...prev, ...computed };
        });
    }, [accountAddress, callData, computedNonce, gas, initCode]);

    const handleUserOpFieldChange = useCallback((field: keyof UserOpFields, value: string) => {
        setUserOp((prev) => ({
            ...prev,
            [field]: value,
        }));
    }, []);

    const getPreviewUserOpForJoinAction = useCallback(
        (action: AAJoinAction, joinParams: {
            joinTargetAddress: string;
            selectedJoinEntryFee: bigint;
            selectedJoinEntryToken: string;
        }): UserOpFields => ({
            ...userOp,
            callData:
                buildJoinActionCallData({
                    action,
                    ...joinParams,
                }) || '0x',
            signature: '0x',
        }),
        [userOp]
    );

    const resetUserOpDraft = useCallback(() => {
        setUserOp(EMPTY_USER_OP);
    }, []);

    return {
        userOp,
        setUserOp,
        handleUserOpFieldChange,
        getPreviewUserOpForJoinAction,
        resetUserOpDraft,
    };
}
