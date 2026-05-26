import { encodeFunctionData, isAddress } from 'viem';
import { ETH_ACCOUNT_EXECUTE_ABI, LOTTO_CREATE_ABI } from '@/lib/aa/abis';
import { parseBigIntOrZero, parseEtherOrZero } from '@/lib/aa/userop/packing';

export function buildCreateCallData(params: {
    entryFeeEth: string;
    maxPlayers: string;
    entryTokenAddress: string;
    lottoFactoryAddress: string;
}): string {
    const { entryFeeEth, maxPlayers, entryTokenAddress, lottoFactoryAddress } = params;

    if (!entryTokenAddress || !isAddress(entryTokenAddress)) {
        return '';
    }

    const inner = encodeFunctionData({
        abi: LOTTO_CREATE_ABI,
        functionName: 'createLotto',
        args: [parseEtherOrZero(entryFeeEth), parseBigIntOrZero(maxPlayers), entryTokenAddress as `0x${string}`],
    });

    return encodeFunctionData({
        abi: ETH_ACCOUNT_EXECUTE_ABI,
        functionName: 'execute',
        args: [lottoFactoryAddress as `0x${string}`, BigInt(0), inner],
    });
}
