'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    useAccount,
    useSwitchChain,
    useWaitForTransactionReceipt,
    useWriteContract,
} from 'wagmi';
import { Address, BaseError, parseEther } from 'viem';
import lottoFactoryAbi from '@/contracts/LottoFactory.json';

const ANVIL_LOTTO_FACTORY_ADDRESS: Address = '0x7a2088a1bFc9d81c55368AE168C2C02570cB814F';
const ANVIL_CHAIN_ID = 31337;
const LOTTO_FACTORY_ADDRESS =
    (process.env.NEXT_PUBLIC_LOTTO_FACTORY_ADDRESS as Address | undefined) ?? ANVIL_LOTTO_FACTORY_ADDRESS;

export default function CreateLotteryPage() {
    const { isConnected, chainId } = useAccount();
    const { switchChain } = useSwitchChain();
    const isWrongNetwork = isConnected && chainId !== ANVIL_CHAIN_ID;

    const [entryFeeEth, setEntryFeeEth] = useState('0.01');
    const [maxPlayers, setMaxPlayers] = useState('5');
    const [actionError, setActionError] = useState('');

    const {
        writeContractAsync,
        data: createLottoHash,
        isPending: isCreateLottoPending,
        reset,
    } = useWriteContract();

    const { isLoading: isCreateLottoConfirming, isSuccess: isCreateLottoConfirmed } =
        useWaitForTransactionReceipt({
            hash: createLottoHash,
        });

    const canCreate = isConnected && !isCreateLottoPending && !isCreateLottoConfirming;

    const getErrorMessage = (error: unknown, fallback: string) => {
        if (error instanceof BaseError) {
            return error.shortMessage || fallback;
        }
        if (error instanceof Error) {
            return error.message || fallback;
        }
        return fallback;
    };

    const handleCreateLotto = async () => {
        try {
            setActionError('');

            if (chainId !== ANVIL_CHAIN_ID) {
                setActionError('Please switch your wallet network to Anvil (chainId 31337).');
                return;
            }

            const parsedEntryFee = parseEther(entryFeeEth);
            const parsedMaxPlayers = BigInt(maxPlayers);

            if (parsedEntryFee <= BigInt(0)) {
                setActionError('Entry fee must be greater than 0.');
                return;
            }

            if (parsedMaxPlayers <= BigInt(1)) {
                setActionError('Max players must be at least 2.');
                return;
            }

            await writeContractAsync({
                address: LOTTO_FACTORY_ADDRESS,
                abi: lottoFactoryAbi,
                functionName: 'createLotto',
                args: [parsedEntryFee, parsedMaxPlayers],
            });
        } catch (error) {
            setActionError(getErrorMessage(error, 'Failed to create lottery instance.'));
        }
    };

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
                    <h1 style={{ margin: 0 }}>Create Lottery</h1>
                    <p style={{ marginTop: 10, color: '#c6dfe2' }}>Enter lottery settings, then call factory.createLotto.</p>

                    {isWrongNetwork ? (
                        <div style={{ marginTop: 14 }}>
                            <p style={{ color: '#ffc2b6' }}>Wrong network detected. Please switch to Anvil (31337).</p>
                            <button
                                onClick={() => switchChain({ chainId: ANVIL_CHAIN_ID })}
                                style={{
                                    padding: '10px 14px',
                                    borderRadius: 10,
                                    border: '1px solid #76b4be',
                                    background: 'linear-gradient(135deg, #0f7f8f, #155a8a)',
                                    color: '#ecf8ff',
                                    cursor: 'pointer',
                                }}
                            >
                                Switch to Anvil
                            </button>
                        </div>
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
                    <label style={{ display: 'block', marginBottom: 12, color: '#d6ebef' }}>
                        Entry Fee (ETH)
                        <input
                            value={entryFeeEth}
                            onChange={(e) => setEntryFeeEth(e.target.value)}
                            placeholder="0.01"
                            style={{
                                width: '100%',
                                marginTop: 8,
                                padding: '11px 12px',
                                borderRadius: 10,
                                border: '1px solid #3a4e53',
                                background: '#0c1f26',
                                color: '#e7f2f2',
                            }}
                        />
                    </label>

                    <label style={{ display: 'block', marginBottom: 16, color: '#d6ebef' }}>
                        Max Players
                        <input
                            value={maxPlayers}
                            onChange={(e) => setMaxPlayers(e.target.value)}
                            placeholder="5"
                            type="number"
                            min={2}
                            style={{
                                width: '100%',
                                marginTop: 8,
                                padding: '11px 12px',
                                borderRadius: 10,
                                border: '1px solid #3a4e53',
                                background: '#0c1f26',
                                color: '#e7f2f2',
                            }}
                        />
                    </label>

                    <button
                        onClick={handleCreateLotto}
                        disabled={!canCreate}
                        style={{
                            padding: '11px 16px',
                            borderRadius: 10,
                            border: '1px solid #76b4be',
                            background: 'linear-gradient(135deg, #0f7f8f, #155a8a)',
                            color: '#ecf8ff',
                            fontWeight: 700,
                            cursor: canCreate ? 'pointer' : 'not-allowed',
                            opacity: canCreate ? 1 : 0.5,
                        }}
                    >
                        {isCreateLottoPending || isCreateLottoConfirming ? 'Creating...' : 'Create Lottery'}
                    </button>

                    {createLottoHash ? (
                        <p
                            style={{
                                marginTop: 12,
                                color: '#d4eaee',
                                fontFamily: 'ui-monospace, Menlo, monospace',
                                wordBreak: 'break-all',
                            }}
                        >
                            Create tx: {createLottoHash}
                        </p>
                    ) : null}
                    {isCreateLottoConfirmed ? (
                        <p style={{ marginTop: 12, color: '#9ff2be' }}>Lottery instance created successfully.</p>
                    ) : null}
                    {actionError ? (
                        <p
                            style={{
                                marginTop: 12,
                                color: '#ffd3cb',
                                background: 'rgba(127, 39, 39, 0.34)',
                                border: '1px solid #924747',
                                borderRadius: 10,
                                padding: '10px 12px',
                            }}
                        >
                            {actionError}
                        </p>
                    ) : null}

                    {isCreateLottoConfirmed ? (
                        <button
                            onClick={() => reset()}
                            style={{
                                marginTop: 10,
                                padding: '10px 14px',
                                borderRadius: 10,
                                border: '1px solid #5d7980',
                                background: '#13242a',
                                color: '#d9eef1',
                                cursor: 'pointer',
                            }}
                        >
                            Clear transaction state
                        </button>
                    ) : null}
                </section>

                <p
                    style={{
                        marginTop: 20,
                        color: '#a4bcc0',
                        fontFamily: 'ui-monospace, Menlo, monospace',
                        fontSize: 12,
                        wordBreak: 'break-all',
                    }}
                >
                    Factory address in use: {LOTTO_FACTORY_ADDRESS} (chainId {ANVIL_CHAIN_ID})
                </p>
            </div>
        </main>
    );
}
