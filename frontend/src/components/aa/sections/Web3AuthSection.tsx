'use client';

interface Web3AuthSectionProps {
    onLogin: () => void;
    isReady: boolean;
    isLoading: boolean;
    onRefresh: () => void;
    onLogout: () => void;
}

export function Web3AuthSection({
    onLogin,
    isReady,
    isLoading,
    onRefresh,
    onLogout,
}: Web3AuthSectionProps) {
    const clientId = process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID;

    return (
        <>
            {!isReady ? (
                <p style={{ color: '#ffd3cb' }}>Missing `NEXT_PUBLIC_WEB3AUTH_CLIENT_ID` environment variable.</p>
            ) : (
                <div style={{ minHeight: 44 }}>
                    <button
                        onClick={onLogin}
                        disabled={isLoading}
                        style={{
                            padding: '10px 14px',
                            borderRadius: 10,
                            border: '1px solid #5d7980',
                            background: '#13242a',
                            color: '#d9eef1',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            opacity: isLoading ? 0.6 : 1,
                        }}
                    >
                        Log in with Web3Auth
                    </button>
                </div>
            )}

            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                    onClick={onRefresh}
                    disabled={isLoading}
                    style={{
                        padding: '9px 12px',
                        borderRadius: 10,
                        border: '1px solid #5d7980',
                        background: '#13242a',
                        color: '#d9eef1',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        opacity: isLoading ? 0.6 : 1,
                    }}
                >
                    Refresh Account State
                </button>
                <button
                    onClick={onLogout}
                    disabled={isLoading}
                    style={{
                        padding: '9px 12px',
                        borderRadius: 10,
                        border: '1px solid #7f4b4b',
                        background: '#2a1313',
                        color: '#ffd9d9',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        opacity: isLoading ? 0.6 : 1,
                    }}
                >
                    Reset Session
                </button>
            </div>
        </>
    );
}
