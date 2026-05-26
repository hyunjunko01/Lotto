import type { AALotteryMode, AAJoinAction } from '@/lib/aa/types';
import { buildCreateCallData } from '@/lib/aa/call-data/create';
import { buildFaucetCallData } from '@/lib/aa/call-data/faucet';
import { buildJoinActionCallData } from '@/lib/aa/call-data/join';

export function computeCallDataForMode(params: {
    mode: AALotteryMode;
    entryFeeEth: string;
    maxPlayers: string;
    entryTokenAddress?: string;
    lottoFactoryAddress: string;
    selectedJoinAction: AAJoinAction;
    joinTargetAddress: string;
    selectedJoinEntryFee: bigint;
    selectedJoinEntryToken: string;
}): string {
    const {
        mode,
        entryFeeEth,
        maxPlayers,
        entryTokenAddress,
        lottoFactoryAddress,
        selectedJoinAction,
        joinTargetAddress,
        selectedJoinEntryFee,
        selectedJoinEntryToken,
    } = params;

    if (mode === 'create') {
        return buildCreateCallData({
            entryFeeEth,
            maxPlayers,
            entryTokenAddress: entryTokenAddress ?? '',
            lottoFactoryAddress,
        });
    }

    if (mode === 'faucet') {
        return buildFaucetCallData(entryTokenAddress ?? '');
    }

    return buildJoinActionCallData({
        action: selectedJoinAction,
        joinTargetAddress,
        selectedJoinEntryFee,
        selectedJoinEntryToken,
    });
}

export { buildCreateCallData, buildFaucetCallData, buildJoinActionCallData };
