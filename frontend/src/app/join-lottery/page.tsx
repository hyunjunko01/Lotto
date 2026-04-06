'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAccount, useBlockNumber, useReadContract, useReadContracts } from 'wagmi';
import { Address, formatEther } from 'viem';
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

function stateToLabel(stateValue?: bigint | number) {
    if (stateValue === undefined) return '-';
    const state = typeof stateValue === 'bigint' ? Number(stateValue) : stateValue;
    if (state === 0) return 'OPEN';
    if (state === 1) return 'FULL';
    if (state === 2) return 'CALCULATING';
    if (state === 3) return 'CLOSED';
    return `UNKNOWN (${state})`;
}

function toBigIntValue(value: unknown): bigint | undefined {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return BigInt(value);
    return undefined;
}

export default function JoinLotteryPage() {
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
            return new Map<Address, { playerCount?: bigint; maxPlayers?: bigint; entryFee?: bigint; lottoState?: bigint }>();
        }

        const resultMap = new Map<Address, { playerCount?: bigint; maxPlayers?: bigint; entryFee?: bigint; lottoState?: bigint }>();

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
                entryFee:
                    entryFeeResult?.status === 'success' ? toBigIntValue(entryFeeResult.result) : undefined,
                lottoState:
                    lottoStateResult?.status === 'success' ? toBigIntValue(lottoStateResult.result) : undefined,
            });
        });

        return resultMap;
    }, [lottoReadResults, parsedLottoAddresses]);

    return (
        <main
            style={{
                minHeight: '100dvh',
                padding: '28px 16px 44px',
                background:
                    'radial-gradient(1200px 500px at 10% -10%, rgba(22, 86, 102, 0.4), transparent), linear-gradient(180deg, #07161c 0%, #0b101a 100%)',
                fontFamily: "'Avenir Next', 'IBM Plex Sans', 'Segoe UI', sans-serif",
                color: '#e8f2f4',
            }}
        >
            <div style={{ maxWidth: 920, margin: '0 auto' }}>

                <section
                    style={{
                        marginTop: 16,
                        padding: 20,
                        border: '1px solid #2d3f45',
                        borderRadius: 14,
                        background: 'rgba(7, 19, 24, 0.72)',
                    }}
                >
                    <h1 style={{ margin: 0 }}>Join Lottery</h1>
                    <p style={{ marginTop: 10, color: '#c6dfe2' }}>
                        Select one of the available lottery instances to view its info and callable functions.
                    </p>
                    {chainId !== undefined && chainId !== ANVIL_CHAIN_ID ? (
                        <p style={{ marginTop: 10, color: '#ffc2b6' }}>Current network is not Anvil (31337).</p>
                    ) : null}
                </section>

                <section
                    style={{
                        marginTop: 16,
                        padding: 20,
                        border: '1px solid #2d3f45',
                        borderRadius: 14,
                        background: 'rgba(7, 19, 24, 0.72)',
                    }}
                >
                    <h2 style={{ marginTop: 0 }}>Available Instances</h2>

                    {isLoadingLottoAddresses ? <p style={{ color: '#c6dfe2' }}>Loading lottery instances...</p> : null}
                    {isLottoAddressesError ? (
                        <p style={{ color: '#ffc2b6' }}>Failed to load lottery instances from factory.</p>
                    ) : null}

                    {!isLoadingLottoAddresses && parsedLottoAddresses.length === 0 ? (
                        <p style={{ color: '#c6dfe2' }}>No instances found yet.</p>
                    ) : null}

                    {parsedLottoAddresses.length > 0 && isLoadingLottoStats ? (
                        <p style={{ color: '#c6dfe2' }}>Loading instance stats...</p>
                    ) : null}

                    {parsedLottoAddresses.length > 0 ? (
                        <div style={{ display: 'grid', gap: 10 }}>
                            {parsedLottoAddresses.map((lotto) => {
                                const summary = lottoSummaries.get(lotto);
                                const playerCount = summary?.playerCount;
                                const maxPlayers = summary?.maxPlayers;
                                const entryFee = summary?.entryFee;
                                const lottoState = summary?.lottoState;

                                const hasCounts = playerCount !== undefined && maxPlayers !== undefined;
                                const remaining = hasCounts ? maxPlayers - playerCount : undefined;
                                const isNearFull =
                                    hasCounts && remaining !== undefined
                                        ? remaining > BigInt(0) && remaining <= BigInt(2)
                                        : false;

                                return (
                                    <Link
                                        key={lotto}
                                        href={`/lotto/${lotto}`}
                                        style={{
                                            display: 'block',
                                            border: isNearFull ? '1px solid #f3b86f' : '1px solid #31525b',
                                            borderRadius: 10,
                                            padding: '12px 14px',
                                            color: '#8fe8ff',
                                            textDecoration: 'none',
                                            wordBreak: 'break-all',
                                            background: 'rgba(8, 22, 30, 0.7)',
                                        }}
                                    >
                                        <p style={{ margin: 0, textDecoration: 'underline' }}>{lotto}</p>
                                        <p style={{ margin: '8px 0 0', color: '#d4eaee' }}>
                                            Status: {stateToLabel(lottoState)}
                                        </p>
                                        <p style={{ margin: '4px 0 0', color: '#d4eaee' }}>
                                            Entry Fee: {entryFee !== undefined ? formatEther(entryFee) : '-'} ETH
                                        </p>
                                        <p style={{ margin: '4px 0 0', color: '#d4eaee' }}>
                                            Players: {playerCount !== undefined ? Number(playerCount) : '-'} /{' '}
                                            {maxPlayers !== undefined ? Number(maxPlayers) : '-'}
                                        </p>
                                        <p style={{ margin: '4px 0 0', color: '#d4eaee' }}>
                                            Remaining Spots: {remaining !== undefined ? Number(remaining) : '-'}
                                        </p>
                                        {isNearFull ? (
                                            <p style={{ margin: '8px 0 0', color: '#ffd59a' }}>Closing soon: only a few spots left.</p>
                                        ) : null}
                                    </Link>
                                );
                            })}
                        </div>
                    ) : null}
                </section>
            </div>
        </main>
    );
}
