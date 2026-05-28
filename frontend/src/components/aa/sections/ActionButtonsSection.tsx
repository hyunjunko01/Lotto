'use client';

interface ActionButtonsSectionProps {
    onExecute: () => void;
    isLoading: boolean;
    executeDisabled?: boolean;
    label?: string;
    tone?: 'default' | 'neon-green';
    marginTop?: number;
    compact?: boolean;
}

export function ActionButtonsSection({
    onExecute,
    isLoading,
    executeDisabled = false,
    label = 'Execute UserOp',
    tone = 'default',
    marginTop = 16,
    compact = false,
}: ActionButtonsSectionProps) {
    const isDisabled = isLoading || executeDisabled;
    const isNeonGreen = tone === 'neon-green';
    return (
        <div style={{ marginTop, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
                onClick={onExecute}
                disabled={isDisabled}
                style={{
                    width: '100%',
                    minWidth: 120,
                    padding: compact ? '9px 8px' : '12px',
                    borderRadius: 12,
                    border: isNeonGreen ? '1px solid #65ff9a' : '1px solid #4a9d5f',
                    background: '#000000',
                    color: isNeonGreen ? '#b6ffc9' : '#b8e6c4',
                    boxShadow: isNeonGreen
                        ? '0 0 11px rgba(101, 255, 154, 0.48), inset 0 0 11px rgba(101, 255, 154, 0.2)'
                        : 'none',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    opacity: isDisabled ? 0.6 : 1,
                    fontWeight: 600,
                    fontSize: compact ? '0.92rem' : '1rem',
                }}
            >
                {label}
            </button>
        </div>
    );
}
