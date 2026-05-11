'use client';

interface ActionButtonsSectionProps {
    onSign: () => void;
    onSend: () => void;
    isLoading: boolean;
    /** When true, Sign is disabled (e.g. AA account not loaded from server yet). */
    signDisabled?: boolean;
}

export function ActionButtonsSection({ onSign, onSend, isLoading, signDisabled = false }: ActionButtonsSectionProps) {
    const signOff = isLoading || signDisabled;
    return (
        <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
                onClick={onSign}
                disabled={signOff}
                style={{
                    flex: 1,
                    minWidth: 120,
                    padding: '12px',
                    borderRadius: 10,
                    border: '1px solid #4a9d5f',
                    background: '#1a3a2a',
                    color: '#b8e6c4',
                    cursor: signOff ? 'not-allowed' : 'pointer',
                    opacity: signOff ? 0.6 : 1,
                    fontWeight: 500,
                    fontSize: '1rem',
                }}
            >
                ✓ Sign UserOp
            </button>
            <button
                onClick={onSend}
                disabled={isLoading}
                style={{
                    flex: 1,
                    minWidth: 120,
                    padding: '12px',
                    borderRadius: 10,
                    border: '1px solid #5d7f80',
                    background: '#13242a',
                    color: '#d9eef1',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    opacity: isLoading ? 0.6 : 1,
                    fontWeight: 500,
                    fontSize: '1rem',
                }}
            >
                📤 Send to Bundler
            </button>
        </div>
    );
}
