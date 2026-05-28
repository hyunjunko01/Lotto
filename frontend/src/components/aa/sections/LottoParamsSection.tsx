'use client';

import type { AALotteryMode } from '@/lib/aa/types';

interface LottoParamsSectionProps {
    mode: AALotteryMode;
    hideTitle?: boolean;
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
    hideTitle = false,
    entryFeeEth,
    setEntryFeeEth,
    maxPlayers,
    setMaxPlayers,
    joinTargetAddress,
    setJoinTargetAddress,
    joinValueEth,
    setJoinValueEth,
}: LottoParamsSectionProps) {
    const isCreateMode = mode === 'create';
    const createContainerStyle = isCreateMode
        ? {
            border: '1px solid rgba(255, 79, 167, 0.7)',
            background: 'rgba(20, 0, 11, 0.75)',
            boxShadow: '0 0 12px rgba(255, 79, 167, 0.22), inset 0 0 10px rgba(255, 79, 167, 0.08)',
        }
        : {};
    const createLabelTextStyle = isCreateMode
        ? {
            fontWeight: 300,
            color: '#ff9bd2',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.06em',
            textShadow: '0 0 6px rgba(255, 79, 167, 0.45)',
        }
        : { fontWeight: 500 };
    const createInputStyle = isCreateMode
        ? {
            border: '1px solid #ff4fa7',
            background: '#000000',
            color: '#ff9bd2',
            textTransform: 'uppercase' as const,
            fontWeight: 300,
            padding: '7px 7px',
            letterSpacing: '0.05em',
            boxShadow: '0 0 8px rgba(255, 79, 167, 0.32), inset 0 0 8px rgba(255, 79, 167, 0.14)',
        }
        : {};

    return (
        <div
            style={{
                marginTop: isCreateMode ? 8 : 16,
                padding: isCreateMode ? 12 : 14,
                borderRadius: 12,
                border: '1px solid #32515a',
                background: 'rgba(10, 35, 44, 0.6)',
                display: 'grid',
                gap: isCreateMode ? 8 : 10,
                ...createContainerStyle,
            }}
        >
            {!hideTitle ? (
                <h3
                    style={{
                        margin: 0,
                        textTransform: isCreateMode ? 'uppercase' : 'none',
                        color: isCreateMode ? '#ff9bd2' : undefined,
                        fontWeight: isCreateMode ? 300 : 500,
                    }}
                >
                    🎰 {mode === 'create' ? 'Create Lottery' : 'Join Lottery'}
                </h3>
            ) : null}

            {mode === 'create' ? (
                <>
                    <label style={labelStyle}>
                        <span style={createLabelTextStyle}>Entry Fee (LET)</span>
                        <input
                            value={entryFeeEth}
                            onChange={(e) => setEntryFeeEth(e.target.value.trim())}
                            placeholder="10"
                            style={{ ...inputStyle, ...createInputStyle }}
                        />
                    </label>
                    <label style={labelStyle}>
                        <span style={createLabelTextStyle}>Max Players</span>
                        <input
                            value={maxPlayers}
                            onChange={(e) => setMaxPlayers(e.target.value.trim())}
                            placeholder="5"
                            style={{ ...inputStyle, ...createInputStyle }}
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
