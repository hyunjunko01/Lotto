'use client';

import type { UserOpFields } from '@/lib/aa/types';

interface UserOpDisplaySectionProps {
    userOp: UserOpFields;
}

const textareaStyle = {
    padding: '9px 10px',
    borderRadius: 8,
    border: '1px solid #496871',
    background: '#09141a',
    color: '#cfeef0',
    fontFamily: 'monospace',
    fontSize: '0.8rem',
};

const inputStyle = {
    padding: '9px 10px',
    borderRadius: 8,
    border: '1px solid #496871',
    background: '#09141a',
    color: '#cfeef0',
    fontFamily: 'monospace',
    fontSize: '0.85rem',
};

export function UserOpDisplaySection({ userOp }: UserOpDisplaySectionProps) {
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
            <h3 style={{ margin: 0 }}>📋 UserOperation (Auto-Generated)</h3>

            <label style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontSize: '0.9rem', color: '#a8e6a1' }}>sender</span>
                <input value={userOp.sender} readOnly placeholder="0x..." style={inputStyle} />
            </label>

            <label style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontSize: '0.9rem', color: '#a8e6a1' }}>initCode (account creation)</span>
                <textarea value={userOp.initCode} readOnly rows={2} style={textareaStyle} />
            </label>

            <label style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontSize: '0.9rem', color: '#a8e6a1' }}>callData (lotto call)</span>
                <textarea value={userOp.callData} readOnly rows={3} style={textareaStyle} />
            </label>
        </div>
    );
}
