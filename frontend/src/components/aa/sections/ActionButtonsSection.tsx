'use client';

interface ActionButtonsSectionProps {
    onExecute: () => void;
    isLoading: boolean;
    executeDisabled?: boolean;
    label?: string;
}

export function ActionButtonsSection({
    onExecute,
    isLoading,
    executeDisabled = false,
    label = 'Execute UserOp',
}: ActionButtonsSectionProps) {
    const isDisabled = isLoading || executeDisabled;
    return (
        <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
                onClick={onExecute}
                disabled={isDisabled}
                style={{
                    width: '100%',
                    minWidth: 120,
                    padding: '12px',
                    borderRadius: 12,
                    border: '1px solid #4a9d5f',
                    background: '#1a3a2a',
                    color: '#b8e6c4',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    opacity: isDisabled ? 0.6 : 1,
                    fontWeight: 600,
                    fontSize: '1rem',
                }}
            >
                {isLoading ? 'Processing UserOp...' : label}
            </button>
        </div>
    );
}
