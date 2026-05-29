'use client';

import { formatEther } from 'viem';
import { getAAStatusStyle, getAAStatusTone } from '@/lib/aa/statusTone';

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
    const statusStyle = getAAStatusStyle(getAAStatusTone(status));

    return (
        <div style={{ marginTop: 12, display: 'grid', gap: 6, color: '#d4eaee', fontSize: '0.9rem' }}>
            <p
                style={{
                    margin: 0,
                    wordBreak: 'break-all',
                    fontSize: '1.02rem',
                    lineHeight: 1.45,
                    color: statusStyle.color,
                    textShadow: statusStyle.textShadow,
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
