'use client';

import { useEffect, useMemo } from 'react';
import { useAccount, useBlockNumber, useReadContract, useReadContracts } from 'wagmi';
import { Address } from 'viem';
import lottoFactoryAbi from '@/contracts/LottoFactory.json';

const ANVIL_LOTTO_FACTORY_ADDRESS: Address = '0x7a2088a1bFc9d81c55368AE168C2C02570cB814F';
const ANVIL_CHAIN_ID = 31337;
const LOTTO_FACTORY_ADDRESS =
    (process.env.NEXT_PUBLIC_LOTTO_FACTORY_ADDRESS as Address | undefined) ?? ANVIL_LOTTO_FACTORY_ADDRESS;

const lottoInstanceReadAbi = [
    {
        type: 'function',
        name: 'getPlayerCount',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        type: 'function',
        name: 'maxPlayers',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        type: 'function',
        name: 'entryFee',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        type: 'function',
        name: 'lottoState',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint8' }],
    },
] as const;

export type JoinLottoInstanceSummary = {
    playerCount?: bigint;
    maxPlayers?: bigint;
    entryFee?: bigint;
    lottoState?: bigint;
};

function toBigIntValue(value: unknown): bigint | undefined {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return BigInt(value);
    return undefined;
}

/** Human-readable label for `Lotto` contract state enum (0–3). */
export function lottoStateToLabel(stateValue?: bigint | number) {
    if (stateValue === undefined) return '-';
    const state = typeof stateValue === 'bigint' ? Number(stateValue) : stateValue;
    if (state === 0) return 'OPEN';
    if (state === 1) return 'FULL';
    if (state === 2) return 'CALCULATING';
    if (state === 3) return 'CLOSED';
    return `UNKNOWN (${state})`;
}

export function useJoinLotteryInstances() {
    const { chainId } = useAccount();

    const {
        data: lottoAddresses,
        isLoading: isLoadingLottoAddresses,
        isError: isLottoAddressesError,
    } = useReadContract({
        address: LOTTO_FACTORY_ADDRESS,
        abi: lottoFactoryAbi,
        functionName: 'getAllLottos',
        query: {
            enabled: true,
            refetchInterval: 5000,
        },
    });

    const parsedLottoAddresses = useMemo(() => {
        if (!lottoAddresses) return [] as Address[];
        return lottoAddresses as Address[];
    }, [lottoAddresses]);

    const lottoReadContracts = useMemo(
        () =>
            parsedLottoAddresses.flatMap((lottoAddress) => [
                {
                    address: lottoAddress,
                    abi: lottoInstanceReadAbi,
                    functionName: 'getPlayerCount' as const,
                },
                {
                    address: lottoAddress,
                    abi: lottoInstanceReadAbi,
                    functionName: 'maxPlayers' as const,
                },
                {
                    address: lottoAddress,
                    abi: lottoInstanceReadAbi,
                    functionName: 'entryFee' as const,
                },
                {
                    address: lottoAddress,
                    abi: lottoInstanceReadAbi,
                    functionName: 'lottoState' as const,
                },
            ]),
        [parsedLottoAddresses]
    );

    const {
        data: lottoReadResults,
        isLoading: isLoadingLottoStats,
        refetch: refetchLottoStats,
    } = useReadContracts({
        contracts: lottoReadContracts,
        query: {
            enabled: parsedLottoAddresses.length > 0,
            refetchInterval: 3000,
        },
    });

    const { data: blockNumber } = useBlockNumber({
        watch: true,
        query: {
            enabled: parsedLottoAddresses.length > 0,
        },
    });

    useEffect(() => {
        if (!blockNumber) return;
        void refetchLottoStats();
    }, [blockNumber, refetchLottoStats]);

    const lottoSummaries = useMemo(() => {
        if (!lottoReadResults || parsedLottoAddresses.length === 0) {
            return new Map<Address, JoinLottoInstanceSummary>();
        }

        const resultMap = new Map<Address, JoinLottoInstanceSummary>();

        parsedLottoAddresses.forEach((lottoAddress, index) => {
            const base = index * 4;
            const playerCountResult = lottoReadResults[base];
            const maxPlayersResult = lottoReadResults[base + 1];
            const entryFeeResult = lottoReadResults[base + 2];
            const lottoStateResult = lottoReadResults[base + 3];

            resultMap.set(lottoAddress, {
                playerCount:
                    playerCountResult?.status === 'success' ? toBigIntValue(playerCountResult.result) : undefined,
                maxPlayers:
                    maxPlayersResult?.status === 'success' ? toBigIntValue(maxPlayersResult.result) : undefined,
                entryFee: entryFeeResult?.status === 'success' ? toBigIntValue(entryFeeResult.result) : undefined,
                lottoState: lottoStateResult?.status === 'success' ? toBigIntValue(lottoStateResult.result) : undefined,
            });
        });

        return resultMap;
    }, [lottoReadResults, parsedLottoAddresses]);

    const isWrongNetwork = chainId !== undefined && chainId !== ANVIL_CHAIN_ID;

    return {
        isWrongNetwork,
        parsedLottoAddresses,
        isLoadingLottoAddresses,
        isLottoAddressesError,
        isLoadingLottoStats,
        lottoSummaries,
    };
}
