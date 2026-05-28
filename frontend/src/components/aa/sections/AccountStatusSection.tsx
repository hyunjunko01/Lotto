'use client';

import { formatEther } from 'viem';

interface AccountStatusSectionProps {
    status: string;
    email: string;
    accountAddress: string;
    accountDeployed: boolean;
    letBalance?: bigint | null;
    signResultHash?: string;
    bundlerResultHash?: string;
    compact?: boolean;
    showUserOpHashes?: boolean;
}

export function AccountStatusSection({
    status,
    email,
    accountAddress,
    accountDeployed,
    letBalance,
    signResultHash,
    bundlerResultHash,
    compact = false,
    showUserOpHashes = true,
}: AccountStatusSectionProps) {
    const isReadyStatus = /\bready\b/i.test(status) && !/\bnot ready\b/i.test(status);
    const statusColor = isReadyStatus ? '#8dffb1' : '#ff8f9f';
    const statusGlow = isReadyStatus
        ? '0 0 6px rgba(141, 255, 177, 0.55), 0 0 12px rgba(141, 255, 177, 0.28)'
        : '0 0 6px rgba(255, 143, 159, 0.58), 0 0 12px rgba(255, 143, 159, 0.3)';

    return (
        <div style={{ marginTop: 12, display: 'grid', gap: 6, color: '#d4eaee', fontSize: '0.9rem' }}>
            <p
                style={{
                    margin: 0,
                    wordBreak: 'break-all',
                    fontSize: '1.02rem',
                    lineHeight: 1.45,
                    color: statusColor,
                    textShadow: statusGlow,
                }}
            >
                <strong>status:</strong> {status}
            </p>
            {!compact ? (
                <>
                    <p style={{ margin: 0, wordBreak: 'break-all' }}>
                        <strong>email:</strong> {email || '-'}
                    </p>
                    <p style={{ margin: 0, wordBreak: 'break-all' }}>
                        <strong>account:</strong> {accountAddress ? `${accountAddress.slice(0, 10)}...` : '-'}
                        {accountDeployed && <span style={{ color: '#a8e6a1', marginLeft: 8 }}>(deployed)</span>}
                    </p>
                    <p style={{ margin: 0, wordBreak: 'break-all' }}>
                        <strong>LET balance:</strong> {letBalance !== null && letBalance !== undefined ? formatEther(letBalance) : '-'}
                    </p>
                </>
            ) : null}
            {showUserOpHashes ? (
                <>
                    <p style={{ margin: 0, wordBreak: 'break-all', fontFamily: 'ui-monospace, Menlo, monospace' }}>
                        <strong>sign userOpHash:</strong> {signResultHash || '-'}
                    </p>
                    <p style={{ margin: 0, wordBreak: 'break-all', fontFamily: 'ui-monospace, Menlo, monospace' }}>
                        <strong>send userOpHash:</strong> {bundlerResultHash || '-'}
                    </p>
                </>
            ) : null}
        </div>
    );
}
