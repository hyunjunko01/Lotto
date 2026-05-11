'use client';

import type { AALotteryMode } from '@/hooks/useAALottery';

interface LottoParamsSectionProps {
    mode: AALotteryMode;
    entryFeeEth: string;
    setEntryFeeEth: (value: string) => void;
    maxPlayers: string;
    setMaxPlayers: (value: string) => void;
    joinTargetAddress: string;
    setJoinTargetAddress: (value: string) => void;
    joinValueEth: string;
    setJoinValueEth: (value: string) => void;
}

const inputStyle = {
    padding: '9px 10px',
    borderRadius: 8,
    border: '1px solid #496871',
    background: '#102028',
    color: '#e7f3f5',
};

const labelStyle = { display: 'grid', gap: 4 };

export function LottoParamsSection({
    mode,
    entryFeeEth,
    setEntryFeeEth,
    maxPlayers,
    setMaxPlayers,
    joinTargetAddress,
    setJoinTargetAddress,
    joinValueEth,
    setJoinValueEth,
}: LottoParamsSectionProps) {
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
            <h3 style={{ margin: 0 }}>🎰 {mode === 'create' ? 'Create Lottery' : 'Join Lottery'}</h3>

            {mode === 'create' ? (
                <>
                    <label style={labelStyle}>
                        <span style={{ fontWeight: 500 }}>Entry Fee (LET)</span>
                        <input
                            value={entryFeeEth}
                            onChange={(e) => setEntryFeeEth(e.target.value.trim())}
                            placeholder="0.01"
                            style={inputStyle}
                        />
                    </label>
                    <label style={labelStyle}>
                        <span style={{ fontWeight: 500 }}>Max Players</span>
                        <input
                            value={maxPlayers}
                            onChange={(e) => setMaxPlayers(e.target.value.trim())}
                            placeholder="5"
                            style={inputStyle}
                        />
                    </label>
                </>
            ) : (
                <>
                    <label style={labelStyle}>
                        <span style={{ fontWeight: 500 }}>Lotto Address</span>
                        <input
                            value={joinTargetAddress}
                            onChange={(e) => setJoinTargetAddress(e.target.value.trim())}
                            placeholder="0x..."
                            style={{
                                ...inputStyle,
                                fontFamily: 'monospace',
                                fontSize: '0.85rem',
                            }}
                        />
                    </label>
                    <p style={{ margin: 0, color: '#c6dfe2' }}>
                        Join uses LET allowance like MetaMask: run <strong>approveEntryFee</strong> (sign → send) first,
                        then <strong>joinLotto</strong> after allowance ≥ entry fee.
                    </p>
                </>
            )}
        </div>
    );
}
