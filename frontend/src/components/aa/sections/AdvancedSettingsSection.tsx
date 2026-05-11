'use client';

import type { UserOpFields } from '@/components/aa/types';

interface AdvancedSettingsSectionProps {
    userOp: UserOpFields;
    onFieldChange: (field: keyof UserOpFields, value: string) => void;
}

const inputStyle = {
    padding: '9px 10px',
    borderRadius: 8,
    border: '1px solid #496871',
    background: '#102028',
    color: '#e7f3f5',
    fontSize: '0.8rem',
};

const readOnlyInputStyle = {
    padding: '9px 10px',
    borderRadius: 8,
    border: '1px solid #496871',
    background: '#09141a',
    color: '#cfeef0',
};

const textareaStyle = {
    padding: '9px 10px',
    borderRadius: 8,
    border: '1px solid #496871',
    background: '#09141a',
    color: '#cfeef0',
    fontFamily: 'monospace',
    fontSize: '0.8rem',
};

export function AdvancedSettingsSection({ userOp, onFieldChange }: AdvancedSettingsSectionProps) {
    return (
        <div
            style={{
                marginTop: 16,
                padding: 14,
                borderRadius: 12,
                border: '1px solid #545d63',
                background: 'rgba(20, 40, 50, 0.8)',
                display: 'grid',
                gap: 10,
            }}
        >
            <h3 style={{ margin: 0, color: '#ffd700' }}>⚙️ Advanced Settings</h3>

            <label style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontSize: '0.9rem' }}>nonce (auto)</span>
                <input value={userOp.nonce} readOnly style={readOnlyInputStyle} />
            </label>

            <label style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontSize: '0.9rem' }}>accountGasLimits (auto)</span>
                <input
                    value={userOp.accountGasLimits}
                    onChange={(e) => onFieldChange('accountGasLimits', e.target.value.trim())}
                    style={{ ...inputStyle, fontFamily: 'monospace' }}
                />
            </label>

            <label style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontSize: '0.9rem' }}>preVerificationGas (auto)</span>
                <input
                    value={userOp.preVerificationGas}
                    onChange={(e) => onFieldChange('preVerificationGas', e.target.value.trim())}
                    style={inputStyle}
                />
            </label>

            <label style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontSize: '0.9rem' }}>gasFees (auto)</span>
                <input
                    value={userOp.gasFees}
                    onChange={(e) => onFieldChange('gasFees', e.target.value.trim())}
                    style={{ ...inputStyle, fontFamily: 'monospace' }}
                />
            </label>

            <label style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontSize: '0.9rem' }}>paymasterAndData (auto)</span>
                <input
                    value={userOp.paymasterAndData}
                    onChange={(e) => onFieldChange('paymasterAndData', e.target.value.trim())}
                    style={{ ...inputStyle, fontFamily: 'monospace' }}
                />
            </label>

            <label style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontSize: '0.9rem' }}>signature (backend)</span>
                <textarea value={userOp.signature} readOnly rows={2} style={textareaStyle} />
            </label>
        </div>
    );
}
