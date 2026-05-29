import type { Address, Hash, Log, PublicClient } from 'viem';
import { parseEventLogs } from 'viem';
import { erc20Abi, lottoInstanceAbi } from '@/hooks/metamask/lib/abis';
import type { MetamaskDetailAction } from '@/hooks/metamask/lotto-detail/types';
import { LottoState } from '@/hooks/shared/lib/lottoState';

export type ExecuteDetailActionContext = {
    lottoAddress?: Address;
    entryTokenAddress?: Address;
    entryFee?: bigint;
    currentTokenBalance?: bigint;
    statusNumber?: number;
    refundableAmount?: bigint;
    isConnectedWinner: boolean;
    canJoin: boolean;
    canRequest: boolean;
    canWithdraw: boolean;
    canTriggerRefundMode: boolean;
    hasSufficientAllowance: boolean;
    ensureReady: () => boolean;
    publicClient?: PublicClient;
    writeContract: (args: {
        address: Address;
        abi: typeof lottoInstanceAbi | typeof erc20Abi;
        functionName: string;
        args?: readonly unknown[];
    }) => Promise<Hash>;
};

export async function executeDetailAction(
    action: MetamaskDetailAction,
    ctx: ExecuteDetailActionContext
): Promise<Hash> {
    const { lottoAddress, entryTokenAddress, entryFee, publicClient, writeContract } = ctx;

    if (!ctx.ensureReady() || !lottoAddress) {
        throw new Error('Invalid lotto instance or network.');
    }

    if (action === 'approve') {
        if (!ctx.canJoin) {
            throw new Error('approve is only available while state is OPEN.');
        }
        if (!entryTokenAddress || entryFee === undefined) {
            throw new Error('Entry token is not available.');
        }
        if (typeof ctx.currentTokenBalance === 'bigint' && ctx.currentTokenBalance < entryFee) {
            throw new Error('Not enough LET balance. Use the token faucet first.');
        }

        return writeContract({
            address: entryTokenAddress,
            abi: erc20Abi,
            functionName: 'approve',
            args: [lottoAddress, entryFee],
        });
    }

    if (action === 'join') {
        if (!ctx.canJoin) {
            throw new Error('joinLotto is only available while state is OPEN.');
        }
        if (!entryTokenAddress) {
            throw new Error('Entry token address is not available.');
        }
        if (entryFee !== undefined && typeof ctx.currentTokenBalance === 'bigint' && ctx.currentTokenBalance < entryFee) {
            throw new Error('Not enough LET balance. Use the token faucet first.');
        }
        if (!ctx.hasSufficientAllowance) {
            throw new Error('Approve entry token first.');
        }

        return writeContract({
            address: lottoAddress,
            abi: lottoInstanceAbi,
            functionName: 'joinLotto',
        });
    }

    if (action === 'requestWinner') {
        if (!ctx.canRequest) {
            throw new Error('requestWinner is only available while state is FULL.');
        }

        return writeContract({
            address: lottoAddress,
            abi: lottoInstanceAbi,
            functionName: 'requestWinner',
        });
    }

    if (action === 'triggerRefundMode') {
        if (!ctx.canTriggerRefundMode) {
            throw new Error('triggerRefundMode is only available after the CALCULATING timeout has elapsed.');
        }

        return writeContract({
            address: lottoAddress,
            abi: lottoInstanceAbi,
            functionName: 'triggerRefundMode',
        });
    }

    if (action === 'withdrawPrize') {
        if (!ctx.isConnectedWinner) {
            throw new Error('Only the winner can withdraw the prize.');
        }
        if (!ctx.canWithdraw) {
            throw new Error('withdrawPrize is only available when state is CLOSED and prize is not withdrawn.');
        }

        return writeContract({
            address: lottoAddress,
            abi: lottoInstanceAbi,
            functionName: 'withdrawPrize',
        });
    }

    if (ctx.statusNumber !== LottoState.REFUNDING) {
        throw new Error('claimRefund is only available while state is REFUNDING.');
    }
    if (!(typeof ctx.refundableAmount === 'bigint') || ctx.refundableAmount <= BigInt(0)) {
        throw new Error('No refundable balance for this wallet.');
    }

    return writeContract({
        address: lottoAddress,
        abi: lottoInstanceAbi,
        functionName: 'claimRefund',
    });
}

export async function waitForDetailActionReceipt(publicClient: PublicClient, hash: Hash) {
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status === 'reverted') {
        throw new Error('Transaction reverted on-chain.');
    }
    return receipt;
}

export function parseRequestIdFromReceipt(lottoAddress: Address, logs: Log[]) {
    const parsedLogs = parseEventLogs({
        abi: lottoInstanceAbi,
        logs,
        eventName: 'RandomnessRequested',
    });

    const matchedLog = parsedLogs.find((log) => log.args.lottoAddress?.toLowerCase() === lottoAddress.toLowerCase());
    const value = matchedLog?.args.requestId;
    if (typeof value === 'bigint') {
        return value.toString();
    }
    if (typeof value === 'number') {
        return String(value);
    }
    return undefined;
}
