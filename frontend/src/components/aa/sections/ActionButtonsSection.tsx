'use client';

interface ActionButtonsSectionProps {
    onEstimate?: () => void;
    onSign: () => void;
    onSend: () => void;
    isLoading: boolean;
    /** When true, Estimate is disabled. */
    estimateDisabled?: boolean;
    /** When true, Sign is disabled (e.g. AA account not loaded from server yet). */
    signDisabled?: boolean;
    /** When true, Send is disabled (e.g. gas estimate missing or not signed). */
    sendDisabled?: boolean;
}

export function ActionButtonsSection({
    onEstimate,
    onSign,
    onSend,
    isLoading,
    estimateDisabled = false,
    signDisabled = false,
    sendDisabled = false,
}: ActionButtonsSectionProps) {
    const estimateOff = isLoading || estimateDisabled;
    const signOff = isLoading || signDisabled;
    const sendOff = isLoading || sendDisabled;
    return (
        <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {onEstimate ? (
                <button
                    onClick={onEstimate}
                    disabled={estimateOff}
                    style={{
                        flex: 1,
                        minWidth: 120,
                        padding: '12px',
                        borderRadius: 10,
                        border: '1px solid #5d7980',
                        background: '#13242a',
                        color: '#d9eef1',
                        cursor: estimateOff ? 'not-allowed' : 'pointer',
                        opacity: estimateOff ? 0.6 : 1,
                        fontWeight: 500,
                        fontSize: '1rem',
                    }}
                >
                    ⛽ Estimate Gas
                </button>
            ) : null}
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
                disabled={sendOff}
                style={{
                    flex: 1,
                    minWidth: 120,
                    padding: '12px',
                    borderRadius: 10,
                    border: '1px solid #5d7f80',
                    background: '#13242a',
                    color: '#d9eef1',
                    cursor: sendOff ? 'not-allowed' : 'pointer',
                    opacity: sendOff ? 0.6 : 1,
                    fontWeight: 500,
                    fontSize: '1rem',
                }}
            >
                📤 Send to Bundler
            </button>
        </div>
    );
}
