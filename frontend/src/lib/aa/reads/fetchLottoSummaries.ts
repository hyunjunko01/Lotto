import { decodeFunctionResult, encodeFunctionData } from 'viem';
import { LOTTO_FACTORY_VIEW_ABI, LOTTO_INSTANCE_VIEW_ABI } from '@/lib/aa/abis';
import { toBigIntValue } from '@/hooks/shared/lib/bigint';
import type { AALottoSummary } from '@/lib/aa/types';

async function ethCall(rpcUrl: string, to: string, data: `0x${string}`): Promise<`0x${string}`> {
    const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_call',
            params: [{ to, data }, 'latest'],
        }),
    });
    const json = (await response.json()) as { result?: `0x${string}`; error?: { message?: string } };
    if (!response.ok || !json.result) {
        throw new Error(json.error?.message ?? 'eth_call failed');
    }
    return json.result;
}

export async function fetchLottoSummaries(rpcUrl: string, lottoFactoryAddress: string): Promise<AALottoSummary[]> {
    const allLottosData = encodeFunctionData({
        abi: LOTTO_FACTORY_VIEW_ABI,
        functionName: 'getAllLottos',
    });
    const allLottosRaw = await ethCall(rpcUrl, lottoFactoryAddress, allLottosData);
    const addresses = decodeFunctionResult({
        abi: LOTTO_FACTORY_VIEW_ABI,
        functionName: 'getAllLottos',
        data: allLottosRaw,
    }) as string[];

    return Promise.all(
        addresses.map(async (address) => {
            const [
                playerCountRaw,
                maxPlayersRaw,
                entryFeeRaw,
                entryTokenRaw,
                lottoStateRaw,
                winnerRaw,
                prizeWithdrawnRaw,
                randomnessRequestedAtRaw,
                calculatingTimeoutRaw,
            ] = await Promise.all([
                ethCall(
                    rpcUrl,
                    address,
                    encodeFunctionData({ abi: LOTTO_INSTANCE_VIEW_ABI, functionName: 'getPlayerCount' })
                ),
                ethCall(rpcUrl, address, encodeFunctionData({ abi: LOTTO_INSTANCE_VIEW_ABI, functionName: 'maxPlayers' })),
                ethCall(rpcUrl, address, encodeFunctionData({ abi: LOTTO_INSTANCE_VIEW_ABI, functionName: 'entryFee' })),
                ethCall(
                    rpcUrl,
                    address,
                    encodeFunctionData({ abi: LOTTO_INSTANCE_VIEW_ABI, functionName: 'entryToken' })
                ),
                ethCall(
                    rpcUrl,
                    address,
                    encodeFunctionData({ abi: LOTTO_INSTANCE_VIEW_ABI, functionName: 'lottoState' })
                ),
                ethCall(rpcUrl, address, encodeFunctionData({ abi: LOTTO_INSTANCE_VIEW_ABI, functionName: 'winner' })),
                ethCall(
                    rpcUrl,
                    address,
                    encodeFunctionData({ abi: LOTTO_INSTANCE_VIEW_ABI, functionName: 'isPrizeWithdrawn' })
                ),
                ethCall(
                    rpcUrl,
                    address,
                    encodeFunctionData({ abi: LOTTO_INSTANCE_VIEW_ABI, functionName: 'randomnessRequestedAt' })
                ),
                ethCall(
                    rpcUrl,
                    address,
                    encodeFunctionData({ abi: LOTTO_INSTANCE_VIEW_ABI, functionName: 'CALCULATING_TIMEOUT' })
                ),
            ]);

            return {
                address,
                playerCount: decodeFunctionResult({
                    abi: LOTTO_INSTANCE_VIEW_ABI,
                    functionName: 'getPlayerCount',
                    data: playerCountRaw,
                }) as bigint,
                maxPlayers: decodeFunctionResult({
                    abi: LOTTO_INSTANCE_VIEW_ABI,
                    functionName: 'maxPlayers',
                    data: maxPlayersRaw,
                }) as bigint,
                entryFee: decodeFunctionResult({
                    abi: LOTTO_INSTANCE_VIEW_ABI,
                    functionName: 'entryFee',
                    data: entryFeeRaw,
                }) as bigint,
                entryToken: decodeFunctionResult({
                    abi: LOTTO_INSTANCE_VIEW_ABI,
                    functionName: 'entryToken',
                    data: entryTokenRaw,
                }) as string,
                lottoState: toBigIntValue(
                    decodeFunctionResult({
                        abi: LOTTO_INSTANCE_VIEW_ABI,
                        functionName: 'lottoState',
                        data: lottoStateRaw,
                    })
                ),
                winner: decodeFunctionResult({
                    abi: LOTTO_INSTANCE_VIEW_ABI,
                    functionName: 'winner',
                    data: winnerRaw,
                }) as string,
                isPrizeWithdrawn: decodeFunctionResult({
                    abi: LOTTO_INSTANCE_VIEW_ABI,
                    functionName: 'isPrizeWithdrawn',
                    data: prizeWithdrawnRaw,
                }) as boolean,
                randomnessRequestedAt: decodeFunctionResult({
                    abi: LOTTO_INSTANCE_VIEW_ABI,
                    functionName: 'randomnessRequestedAt',
                    data: randomnessRequestedAtRaw,
                }) as bigint,
                calculatingTimeout: decodeFunctionResult({
                    abi: LOTTO_INSTANCE_VIEW_ABI,
                    functionName: 'CALCULATING_TIMEOUT',
                    data: calculatingTimeoutRaw,
                }) as bigint,
            } as AALottoSummary;
        })
    );
}
