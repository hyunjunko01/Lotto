import { decodeFunctionResult, encodeFunctionData, isAddress } from 'viem';
import { ERC20_BALANCE_OF_ABI } from '@/lib/aa/abis';
import { targetRpcUrl } from '@/lib/targetNetwork';

export async function fetchLetBalanceForAccount(
    accountAddress: string,
    tokenAddress: string
): Promise<bigint | null> {
    if (!accountAddress || !isAddress(accountAddress)) {
        return null;
    }
    if (!tokenAddress || !isAddress(tokenAddress)) {
        return null;
    }

    const rpcUrl = targetRpcUrl;
    if (!rpcUrl) {
        return null;
    }

    const callData = encodeFunctionData({
        abi: ERC20_BALANCE_OF_ABI,
        functionName: 'balanceOf',
        args: [accountAddress as `0x${string}`],
    });
    const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_call',
            params: [{ to: tokenAddress, data: callData }, 'latest'],
        }),
    });
    const json = (await response.json()) as { result?: `0x${string}`; error?: { message?: string } };
    if (!response.ok || !json.result) {
        throw new Error(json.error?.message ?? 'Failed to fetch LET balance');
    }

    return decodeFunctionResult({
        abi: ERC20_BALANCE_OF_ABI,
        functionName: 'balanceOf',
        data: json.result,
    }) as bigint;
}
