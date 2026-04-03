'use client';

import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export function AppHeader() {
    const linkStyle = {
        color: '#cfe9ee',
        textDecoration: 'none',
        fontWeight: 700,
        letterSpacing: 0.2,
    } as const;

    return (
        <header
            style={{
                position: 'sticky',
                top: 0,
                zIndex: 20,
                backdropFilter: 'blur(6px)',
                background: 'rgba(6, 19, 25, 0.88)',
                borderBottom: '1px solid #2c4a52',
            }}
        >
            <div
                style={{
                    maxWidth: 920,
                    margin: '0 auto',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    flexWrap: 'wrap',
                }}
            >
                <nav style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Link href="/" style={linkStyle}>
                        Home
                    </Link>
                    <Link href="/create-lottery" style={linkStyle}>
                        Create
                    </Link>
                    <Link href="/join-lottery" style={linkStyle}>
                        Join
                    </Link>
                </nav>
                <ConnectButton />
            </div>
        </header>
    );
}