'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useAccount, useReadContract } from 'wagmi';
import { Address } from 'viem';
import lottoFactoryAbi from '@/contracts/LottoFactory.json';

const ANVIL_LOTTO_FACTORY_ADDRESS: Address = '0x7a2088a1bFc9d81c55368AE168C2C02570cB814F';
const ANVIL_CHAIN_ID = 31337;
const LOTTO_FACTORY_ADDRESS =
    (process.env.NEXT_PUBLIC_LOTTO_FACTORY_ADDRESS as Address | undefined) ?? ANVIL_LOTTO_FACTORY_ADDRESS;

export default function JoinLotteryPage() {
    const { isConnected, chainId } = useAccount();

    const {
        data: lottoAddresses,
        isLoading: isLoadingLottoAddresses,
        isError: isLottoAddressesError,
    } = useReadContract({
        address: LOTTO_FACTORY_ADDRESS,
        abi: lottoFactoryAbi,
        functionName: 'getAllLottos',
        query: {
            enabled: isConnected,
            refetchInterval: 5000,
        },
    });

    const parsedLottoAddresses = useMemo(() => {
        if (!lottoAddresses) return [] as Address[];
        return lottoAddresses as Address[];
    }, [lottoAddresses]);

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
                    {isConnected && chainId !== ANVIL_CHAIN_ID ? (
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

                    {!isConnected ? <p style={{ color: '#c6dfe2' }}>Connect your wallet to load instances.</p> : null}
                    {isConnected && isLoadingLottoAddresses ? <p style={{ color: '#c6dfe2' }}>Loading lottery instances...</p> : null}
                    {isConnected && isLottoAddressesError ? (
                        <p style={{ color: '#ffc2b6' }}>Failed to load lottery instances from factory.</p>
                    ) : null}

                    {isConnected && !isLoadingLottoAddresses && parsedLottoAddresses.length === 0 ? (
                        <p style={{ color: '#c6dfe2' }}>No instances found yet.</p>
                    ) : null}

                    {parsedLottoAddresses.length > 0 ? (
                        <div style={{ display: 'grid', gap: 10 }}>
                            {parsedLottoAddresses.map((lotto) => (
                                <Link
                                    key={lotto}
                                    href={`/lotto/${lotto}`}
                                    style={{
                                        display: 'block',
                                        border: '1px solid #31525b',
                                        borderRadius: 10,
                                        padding: '12px 14px',
                                        color: '#8fe8ff',
                                        textDecoration: 'underline',
                                        wordBreak: 'break-all',
                                        background: 'rgba(8, 22, 30, 0.7)',
                                    }}
                                >
                                    {lotto}
                                </Link>
                            ))}
                        </div>
                    ) : null}
                </section>
            </div>
        </main>
    );
}
