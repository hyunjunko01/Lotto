import { decodeFunctionResult, encodeFunctionData } from 'viem';
import { LOTTO_FACTORY_VIEW_ABI, LOTTO_INSTANCE_VIEW_ABI } from '@/lib/aa/abis';
import { toBigIntValue } from '@/hooks/shared/lib/bigint';
import type { AALottoSummary } from '@/lib/aa/types';

const INSTANCE_FETCH_CONCURRENCY = 4;

async function ethCall(rpcUrl: string, to: string, data: `0x${string}`): Promise<`0x${string}`> {
    let response: Response;
    try {
        response = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'eth_call',
                params: [{ to, data }, 'latest'],
            }),
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'RPC request failed';
        if (message === 'Failed to fetch') {
            throw new Error(
                'RPC network error. The node may be down, blocked by CORS, or rate-limiting too many requests.'
            );
        }
        throw new Error(message);
    }

    const json = (await response.json()) as { result?: `0x${string}`; error?: { message?: string } };
    if (!response.ok || !json.result) {
        throw new Error(json.error?.message ?? 'eth_call failed');
    }
    return json.result;
}

async function mapWithConcurrency<T, R>(
    items: T[],
    concurrency: number,
    mapper: (item: T) => Promise<R>
): Promise<R[]> {
    if (items.length === 0) return [];

    const results = new Array<R>(items.length);
    let nextIndex = 0;

    async function runWorker() {
        while (true) {
            const index = nextIndex;
            nextIndex += 1;
            if (index >= items.length) return;
            results[index] = await mapper(items[index]);
        }
    }

    const workerCount = Math.min(concurrency, items.length);
    await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
    return results;
}

async function fetchOneLottoSummary(rpcUrl: string, address: string): Promise<AALottoSummary> {
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
    };
}

async function fetchOneLottoListSummary(rpcUrl: string, address: string): Promise<AALottoSummary> {
    const [playerCountRaw, maxPlayersRaw, entryFeeRaw, lottoStateRaw, prizeWithdrawnRaw] = await Promise.all([
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
            encodeFunctionData({ abi: LOTTO_INSTANCE_VIEW_ABI, functionName: 'lottoState' })
        ),
        ethCall(
            rpcUrl,
            address,
            encodeFunctionData({ abi: LOTTO_INSTANCE_VIEW_ABI, functionName: 'isPrizeWithdrawn' })
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
        lottoState: toBigIntValue(
            decodeFunctionResult({
                abi: LOTTO_INSTANCE_VIEW_ABI,
                functionName: 'lottoState',
                data: lottoStateRaw,
            })
        ),
        isPrizeWithdrawn: decodeFunctionResult({
            abi: LOTTO_INSTANCE_VIEW_ABI,
            functionName: 'isPrizeWithdrawn',
            data: prizeWithdrawnRaw,
        }) as boolean,
    };
}

async function fetchLottoAddresses(rpcUrl: string, lottoFactoryAddress: string) {
    const allLottosData = encodeFunctionData({
        abi: LOTTO_FACTORY_VIEW_ABI,
        functionName: 'getAllLottos',
    });
    const allLottosRaw = await ethCall(rpcUrl, lottoFactoryAddress, allLottosData);
    return decodeFunctionResult({
        abi: LOTTO_FACTORY_VIEW_ABI,
        functionName: 'getAllLottos',
        data: allLottosRaw,
    }) as string[];
}

/** List pages: fewer fields, limited parallel RPC to avoid rate limits. */
export async function fetchLottoListSummaries(rpcUrl: string, lottoFactoryAddress: string): Promise<AALottoSummary[]> {
    const addresses = await fetchLottoAddresses(rpcUrl, lottoFactoryAddress);
    return mapWithConcurrency(addresses, INSTANCE_FETCH_CONCURRENCY, (address) =>
        fetchOneLottoListSummary(rpcUrl, address)
    );
}

export async function fetchLottoSummaries(rpcUrl: string, lottoFactoryAddress: string): Promise<AALottoSummary[]> {
    const addresses = await fetchLottoAddresses(rpcUrl, lottoFactoryAddress);
    return mapWithConcurrency(addresses, INSTANCE_FETCH_CONCURRENCY, (address) =>
        fetchOneLottoSummary(rpcUrl, address)
    );
}

export async function fetchLottoSummaryByAddress(rpcUrl: string, lottoAddress: string): Promise<AALottoSummary> {
    return fetchOneLottoSummary(rpcUrl, lottoAddress);
}
