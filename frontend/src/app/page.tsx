'use client';

import Link from 'next/link';

export default function HomePage() {
    return (
        <main
            style={{
                minHeight: '100dvh',
                padding: '28px 16px 44px',
                background:
                    'radial-gradient(1200px 500px at 10% -10%, rgba(22, 86, 102, 0.4), transparent), linear-gradient(180deg, #07161c 0%, #0b101a 100%)',
                fontFamily: "'Avenir Next', 'IBM Plex Sans', 'Segoe UI', sans-serif",
                color: '#e8f2f4',
            }}
        >
            <div style={{ maxWidth: 920, margin: '0 auto' }}>
                <section
                    style={{
                        marginTop: 0,
                        padding: 24,
                        border: '1px solid #3e5a60',
                        borderRadius: 18,
                        background: 'linear-gradient(160deg, rgba(10, 35, 44, 0.92), rgba(12, 20, 30, 0.9))',
                    }}
                >
                    <div
                        style={{
                            width: 80,
                            height: 80,
                            borderRadius: 18,
                            display: 'grid',
                            placeItems: 'center',
                            background: 'linear-gradient(135deg, #1ca7bb 0%, #0b4f73 100%)',
                            boxShadow: '0 8px 24px rgba(15, 110, 136, 0.35)',
                            color: '#ecf8ff',
                            fontSize: 40,
                            fontWeight: 800,
                            letterSpacing: 1,
                        }}
                    >
                        L
                    </div>
                    <h1 style={{ margin: '12px 0 0', fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', lineHeight: 1.18 }}>
                        Lotto DApp
                    </h1>
                    <p style={{ marginTop: 12, color: '#b8cdcf', lineHeight: 1.55 }}>
                        Choose your entry path first. The Web3Auth AA and MetaMask experiences are separated.
                    </p>
                </section>

                <section
                    style={{
                        marginTop: 24,
                        padding: 20,
                        border: '1px solid #2d3f45',
                        borderRadius: 14,
                        background: 'rgba(7, 19, 24, 0.72)',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: 12,
                    }}
                >
                    <Link
                        href="/aa"
                        style={{
                            display: 'block',
                            textAlign: 'center',
                            padding: '12px 16px',
                            borderRadius: 10,
                            border: '1px solid #93d8e3',
                            background: 'linear-gradient(135deg, #1291a2, #145e8f)',
                            color: '#ecf8ff',
                            fontWeight: 700,
                            letterSpacing: 0.2,
                            textDecoration: 'none',
                        }}
                    >
                        Use Web3Auth AA Account
                    </Link>
                    <Link
                        href="/metamask"
                        style={{
                            display: 'block',
                            textAlign: 'center',
                            padding: '12px 16px',
                            borderRadius: 10,
                            border: '1px solid #ffd3a3',
                            background: 'linear-gradient(135deg, #d1842d, #965326)',
                            color: '#ecf8ff',
                            fontWeight: 700,
                            letterSpacing: 0.2,
                            textDecoration: 'none',
                        }}
                    >
                        Use MetaMask Wallet
                    </Link>
                </section>
            </div>
        </main>
    );
}
