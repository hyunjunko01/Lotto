'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export function AppHeader() {
    const pathname = usePathname();

    const isAaRoute = pathname.startsWith('/aa');
    const isMetamaskRoute = pathname.startsWith('/metamask');

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
                {isAaRoute ? (
                    <nav style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <Link href="/" style={linkStyle}>
                            Home
                        </Link>
                        <Link href="/aa" style={linkStyle}>
                            Web3Auth AA
                        </Link>
                        <Link href="/aa/create-lottery" style={linkStyle}>
                            Create
                        </Link>
                        <Link href="/aa/join-lottery" style={linkStyle}>
                            Join
                        </Link>
                    </nav>
                ) : isMetamaskRoute ? (
                    <>
                        <nav style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <Link href="/" style={linkStyle}>
                                Home
                            </Link>
                            <Link href="/metamask" style={linkStyle}>
                                MetaMask Home
                            </Link>
                            <Link href="/metamask/create-lottery" style={linkStyle}>
                                Create
                            </Link>
                            <Link href="/metamask/join-lottery" style={linkStyle}>
                                Join
                            </Link>
                        </nav>
                        <ConnectButton />
                    </>
                ) : (
                    <nav style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <Link href="/" style={linkStyle}>
                            Home
                        </Link>
                        <Link href="/aa" style={linkStyle}>
                            Web3Auth AA
                        </Link>
                        <Link href="/metamask" style={linkStyle}>
                            MetaMask
                        </Link>
                    </nav>
                )}
            </div>
        </header>
    );
}