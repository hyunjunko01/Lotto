import { encodeFunctionData, isAddress } from 'viem';
import {
    ERC20_APPROVE_ABI,
    ETH_ACCOUNT_EXECUTE_ABI,
    LOTTO_CLAIM_REFUND_ABI,
    LOTTO_JOIN_ABI,
    LOTTO_REQUEST_WINNER_ABI,
    LOTTO_TRIGGER_REFUND_MODE_ABI,
    LOTTO_WITHDRAW_PRIZE_ABI,
} from '@/lib/aa/abis';
import type { AAJoinAction } from '@/lib/aa/types';

export function buildJoinActionCallData(params: {
    action: AAJoinAction;
    joinTargetAddress: string;
    selectedJoinEntryFee: bigint;
    selectedJoinEntryToken: string;
}): string {
    const { action, joinTargetAddress, selectedJoinEntryFee, selectedJoinEntryToken } = params;

    if (!isAddress(joinTargetAddress)) {
        return '';
    }

    let inner: `0x${string}`;
    const value = BigInt(0);

    if (action === 'approveEntryFee') {
        if (!selectedJoinEntryToken || !isAddress(selectedJoinEntryToken)) {
            return '';
        }
        inner = encodeFunctionData({
            abi: ERC20_APPROVE_ABI,
            functionName: 'approve',
            args: [joinTargetAddress as `0x${string}`, selectedJoinEntryFee],
        });
        return encodeFunctionData({
            abi: ETH_ACCOUNT_EXECUTE_ABI,
            functionName: 'execute',
            args: [selectedJoinEntryToken as `0x${string}`, value, inner],
        });
    }

    if (action === 'joinLotto') {
        inner = encodeFunctionData({
            abi: LOTTO_JOIN_ABI,
            functionName: 'joinLotto',
            args: [],
        });
    } else if (action === 'requestWinner') {
        inner = encodeFunctionData({
            abi: LOTTO_REQUEST_WINNER_ABI,
            functionName: 'requestWinner',
            args: [],
        });
    } else if (action === 'triggerRefundMode') {
        inner = encodeFunctionData({
            abi: LOTTO_TRIGGER_REFUND_MODE_ABI,
            functionName: 'triggerRefundMode',
            args: [],
        });
    } else if (action === 'claimRefund') {
        inner = encodeFunctionData({
            abi: LOTTO_CLAIM_REFUND_ABI,
            functionName: 'claimRefund',
            args: [],
        });
    } else {
        inner = encodeFunctionData({
            abi: LOTTO_WITHDRAW_PRIZE_ABI,
            functionName: 'withdrawPrize',
            args: [],
        });
    }

    return encodeFunctionData({
        abi: ETH_ACCOUNT_EXECUTE_ABI,
        functionName: 'execute',
        args: [joinTargetAddress as `0x${string}`, value, inner],
    });
}
