'use client';

import { useState } from 'react';
import type { UserOpFields } from '@/lib/aa/types';

interface UserOpDisplaySectionProps {
    userOp: UserOpFields;
}

export function UserOpDisplaySection({ userOp }: UserOpDisplaySectionProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div style={{ marginTop: 16 }}>
            <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 10,
                    border: '1px solid #5d7980',
                    background: '#13242a',
                    color: '#d9eef1',
                    cursor: 'pointer',
                    textAlign: 'left',
                }}
            >
                {isExpanded ? '▼ Hide Auto UserOp Values' : '▶ View Auto UserOp Values'}
            </button>

            {isExpanded ? (
                <div
                    style={{
                        marginTop: 10,
                        border: '1px solid #2d3f45',
                        borderRadius: 10,
                        padding: 10,
                        background: 'rgba(7, 19, 24, 0.72)',
                        display: 'grid',
                        gap: 6,
                        fontFamily: 'ui-monospace, Menlo, monospace',
                        fontSize: '0.82rem',
                        color: '#d4eaee',
                    }}
                >
                    <p style={{ margin: 0, wordBreak: 'break-all' }}>
                        <strong>sender:</strong> {userOp.sender || '-'}
                    </p>
                    <p style={{ margin: 0, wordBreak: 'break-all' }}>
                        <strong>nonce:</strong> {userOp.nonce}
                    </p>
                    <p style={{ margin: 0, wordBreak: 'break-all' }}>
                        <strong>initCode:</strong> {userOp.initCode}
                    </p>
                    <p style={{ margin: 0, wordBreak: 'break-all' }}>
                        <strong>callData:</strong> {userOp.callData}
                    </p>
                    <p style={{ margin: 0, wordBreak: 'break-all' }}>
                        <strong>accountGasLimits:</strong> {userOp.accountGasLimits}
                    </p>
                    <p style={{ margin: 0, wordBreak: 'break-all' }}>
                        <strong>preVerificationGas:</strong> {userOp.preVerificationGas}
                    </p>
                    <p style={{ margin: 0, wordBreak: 'break-all' }}>
                        <strong>gasFees:</strong> {userOp.gasFees}
                    </p>
                    <p style={{ margin: 0, wordBreak: 'break-all' }}>
                        <strong>paymasterAndData:</strong> {userOp.paymasterAndData}
                    </p>
                </div>
            ) : null}
        </div>
    );
}
