'use client';

import Link from 'next/link';
import { GoogleAaPanel } from '@/components/GoogleAaPanel';

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
                        padding: 20,
                        border: '1px solid #3e5a60',
                        borderRadius: 14,
                        background: 'linear-gradient(160deg, rgba(10, 35, 44, 0.92), rgba(12, 20, 30, 0.9))',
                    }}
                >
                    <p
                        style={{
                            display: 'inline-block',
                            margin: 0,
                            padding: '4px 10px',
                            borderRadius: 999,
                            background: '#153740',
                            color: '#9fd6df',
                            fontSize: 12,
                            fontWeight: 700,
                            letterSpacing: 0.4,
                            textTransform: 'uppercase',
                        }}
                    >
                        Lottery Dashboard
                    </p>
                    <h1 style={{ margin: '12px 0 0', fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', lineHeight: 1.18 }}>
                        Tyler&apos;s Lotto DApp
                    </h1>
                    <p style={{ marginTop: 12, color: '#b8cdcf', lineHeight: 1.55 }}>Choose one action to continue.</p>
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
                        href="/create-lottery"
                        style={{
                            display: 'block',
                            textAlign: 'center',
                            padding: '12px 16px',
                            borderRadius: 10,
                            border: '1px solid #76b4be',
                            background: 'linear-gradient(135deg, #0f7f8f, #155a8a)',
                            color: '#ecf8ff',
                            fontWeight: 700,
                            letterSpacing: 0.2,
                            textDecoration: 'none',
                        }}
                    >
                        create lottery
                    </Link>
                    <Link
                        href="/join-lottery"
                        style={{
                            display: 'block',
                            textAlign: 'center',
                            padding: '12px 16px',
                            borderRadius: 10,
                            border: '1px solid #76b4be',
                            background: 'linear-gradient(135deg, #0f7f8f, #155a8a)',
                            color: '#ecf8ff',
                            fontWeight: 700,
                            letterSpacing: 0.2,
                            textDecoration: 'none',
                        }}
                    >
                        join lottery
                    </Link>
                </section>

                <GoogleAaPanel />
            </div>
        </main>
    );
}
