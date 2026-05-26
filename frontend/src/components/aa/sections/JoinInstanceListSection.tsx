'use client';

import { formatEther } from 'viem';
import type { AALottoSummary } from '@/lib/aa/types';

interface JoinInstanceListSectionProps {
    lottoInstances: AALottoSummary[];
    isLoading: boolean;
    error: string;
    selectedAddress: string;
    onRefresh: () => void;
    onSelect: (address: string, entryFeeWei?: bigint, entryTokenAddress?: string) => void;
}

function stateToLabel(stateValue?: bigint) {
    if (stateValue === undefined) return '-';
    const state = Number(stateValue);
    if (state === 0) return 'OPEN';
    if (state === 1) return 'FULL';
    if (state === 2) return 'CALCULATING';
    if (state === 3) return 'CLOSED';
    return `UNKNOWN (${state})`;
}

export function JoinInstanceListSection({
    lottoInstances,
    isLoading,
    error,
    selectedAddress,
    onRefresh,
    onSelect,
}: JoinInstanceListSectionProps) {
    return (
        <div
            style={{
                marginTop: 16,
                padding: 14,
                borderRadius: 12,
                border: '1px solid #32515a',
                background: 'rgba(10, 35, 44, 0.6)',
                display: 'grid',
                gap: 10,
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0 }}>📚 Available Lotto Instances</h3>
                <button
                    onClick={onRefresh}
                    style={{
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: '1px solid #5d7980',
                        background: '#13242a',
                        color: '#d9eef1',
                        cursor: 'pointer',
                    }}
                >
                    Refresh
                </button>
            </div>

            {isLoading ? <p style={{ margin: 0, color: '#c6dfe2' }}>Loading instances...</p> : null}
            {error ? <p style={{ margin: 0, color: '#ffc2b6' }}>Error: {error}</p> : null}
            {!isLoading && !error && lottoInstances.length === 0 ? (
                <p style={{ margin: 0, color: '#c6dfe2' }}>No lottery instances found.</p>
            ) : null}

            {lottoInstances.length > 0 ? (
                <div style={{ display: 'grid', gap: 8 }}>
                    {lottoInstances.map((lotto) => {
                        const selected = selectedAddress.toLowerCase() === lotto.address.toLowerCase();
                        const players =
                            lotto.playerCount !== undefined && lotto.maxPlayers !== undefined
                                ? `${Number(lotto.playerCount)} / ${Number(lotto.maxPlayers)}`
                                : '-';

                        return (
                            <button
                                key={lotto.address}
                                onClick={() => onSelect(lotto.address, lotto.entryFee, lotto.entryToken)}
                                style={{
                                    textAlign: 'left',
                                    padding: '10px 12px',
                                    borderRadius: 10,
                                    border: selected ? '1px solid #89d5e2' : '1px solid #31525b',
                                    background: selected ? 'rgba(21, 61, 73, 0.7)' : 'rgba(8, 22, 30, 0.7)',
                                    color: '#d4eaee',
                                    cursor: 'pointer',
                                }}
                            >
                                <p style={{ margin: 0, color: '#8fe8ff', fontFamily: 'monospace', fontSize: '0.82rem' }}>
                                    {lotto.address}
                                </p>
                                <p style={{ margin: '6px 0 0' }}>Status: {stateToLabel(lotto.lottoState)}</p>
                                <p style={{ margin: '4px 0 0' }}>
                                    Entry Fee: {lotto.entryFee !== undefined ? formatEther(lotto.entryFee) : '-'} LET
                                </p>
                                <p style={{ margin: '4px 0 0' }}>Players: {players}</p>
                            </button>
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
}
