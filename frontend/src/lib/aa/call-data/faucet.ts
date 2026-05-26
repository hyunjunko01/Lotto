import { encodeFunctionData, isAddress } from 'viem';
import { ENTRY_TOKEN_FAUCET_ABI, ETH_ACCOUNT_EXECUTE_ABI } from '@/lib/aa/abis';

export function buildFaucetCallData(entryTokenAddress: string): string {
    if (!entryTokenAddress || !isAddress(entryTokenAddress)) {
        return '';
    }

    const inner = encodeFunctionData({
        abi: ENTRY_TOKEN_FAUCET_ABI,
        functionName: 'claimTestTokens',
        args: [],
    });

    return encodeFunctionData({
        abi: ETH_ACCOUNT_EXECUTE_ABI,
        functionName: 'execute',
        args: [entryTokenAddress as `0x${string}`, BigInt(0), inner],
    });
}
